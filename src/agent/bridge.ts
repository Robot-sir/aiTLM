import "dotenv/config";
import { randomUUID } from "node:crypto";
import { WebSocketServer, type WebSocket } from "ws";
import type { Server } from "node:http";
import {
    isEsp32Ack,
    isEsp32Error,
    isEsp32Heartbeat,
    isEsp32Hello,
    isHardwareCommand,
    type HardwareCommand,
} from "./hardware-protocol.js";

const port = Number(process.env.ESP32_WS_PORT || process.env.CLASSROOM_BRIDGE_PORT || 8787);
const configuredToken = process.env.ESP32_DEVICE_TOKEN || "";
const commandTimeoutMs = 3000;

type ClientRole = "esp32" | "control" | "unknown";
type ClientInfo = { role: ClientRole; device?: string; lastSeen?: number };
type PendingCommand = {
    requester: WebSocket | null;
    resolve?: (result: { ok: boolean; message?: string }) => void;
    timer: ReturnType<typeof setTimeout>;
};

const clients = new Map<WebSocket, ClientInfo>();
const pendingCommands = new Map<string, PendingCommand>();
let activeDevice: WebSocket | null = null;

function send(socket: WebSocket, message: unknown) {
    if (socket.readyState === 1 /* WebSocket.OPEN */) {
        socket.send(JSON.stringify(message));
    } else {
        console.warn(`[ESP32] Cannot send — socket readyState=${socket.readyState} (expected OPEN=1)`);
    }
}

function isAuthorized(token: unknown) {
    return !configuredToken || token === configuredToken;
}

function reject(socket: WebSocket, message: string) {
    send(socket, { type: "error", message });
    socket.close(1008, message);
}

function completeCommand(requestId: string, ok: boolean, message?: string) {
    const pending = pendingCommands.get(requestId);
    if (!pending) return;
    clearTimeout(pending.timer);
    pendingCommands.delete(requestId);
    if (pending.resolve) {
        pending.resolve({ ok, message });
    }
    if (pending.requester) {
        send(pending.requester, { type: "command_result", ok, message });
    }
}

function sendCommandToEsp32(command: HardwareCommand, requester: WebSocket) {
    if (!activeDevice || activeDevice.readyState !== activeDevice.OPEN) {
        send(requester, { type: "command_result", ok: false, message: "Classroom device is offline." });
        return;
    }

    const requestId = randomUUID();
    const timer = setTimeout(() => completeCommand(requestId, false, "Classroom device did not acknowledge the command."), commandTimeoutMs);
    pendingCommands.set(requestId, { requester, timer });
    send(activeDevice, { ...command, requestId });
    console.log(`[ESP32] command=${command.type} requestId=${requestId} status=sent`);
}

export function sendCommandToActiveDevice(command: HardwareCommand): Promise<{ ok: boolean; message?: string }> {
    const device = activeDevice;

    if (!device || device.readyState !== 1 /* OPEN */) {
        const reason = !device
            ? "activeDevice is null — ESP32 may not have authenticated (check ESP32_DEVICE_TOKEN in env)"
            : `activeDevice socket readyState=${device.readyState} (not OPEN=1)`;
        console.warn(`[KITE HARDWARE] Cannot send command: ${reason}`);
        console.warn(`[KITE HARDWARE] Current bridge state: ${getBridgeDebugInfo()}`);
        return Promise.resolve({ ok: false, message: "Classroom device is offline." });
    }

    return new Promise((resolve) => {
        const requestId = randomUUID();
        const timer = setTimeout(() => {
            pendingCommands.delete(requestId);
            console.warn(`[KITE HARDWARE] Command timed out after ${commandTimeoutMs}ms: type=${command.type} requestId=${requestId}`);
            resolve({ ok: false, message: "Classroom device did not acknowledge the command." });
        }, commandTimeoutMs);

        pendingCommands.set(requestId, { requester: null, resolve, timer });
        send(device, { ...command, requestId });
        console.log(`[ESP32] command=${command.type} requestId=${requestId} status=sent`);
    });
}

function removeClient(socket: WebSocket) {
    const info = clients.get(socket);
    if (socket === activeDevice) {
        activeDevice = null;
        console.log(`[ESP32] Device offline device=${info?.device || "unknown"}`);
    }
    clients.delete(socket);
}

function getBridgeDebugInfo(): string {
    const parts: string[] = [];
    parts.push(`clients=${clients.size}`);
    parts.push(`pendingCommands=${pendingCommands.size}`);

    if (activeDevice) {
        const info = clients.get(activeDevice);
        parts.push(`activeDevice=device=${info?.device || "unknown"} readyState=${activeDevice.readyState}`);
    } else {
        parts.push(`activeDevice=null`);
    }

    if (!configuredToken) {
        parts.push(`WARNING: ESP32_DEVICE_TOKEN not set — auth is bypassed`);
    } else {
        parts.push(`ESP32_DEVICE_TOKEN is set (length=${configuredToken.length})`);
    }

    return parts.join(", ");
}

export function startBridge(listenPort = port, httpServer?: Server): WebSocketServer {
    const wssOptions = httpServer ? { server: httpServer } : { port: listenPort };
    const server = new WebSocketServer(wssOptions);

    server.on("connection", (socket) => {
        clients.set(socket, { role: "unknown" });
        send(socket, { type: "bridge_ready" });

        socket.on("message", (raw) => {
            let message: unknown;
            try {
                message = JSON.parse(raw.toString());
            } catch {
                reject(socket, "Messages must be JSON.");
                return;
            }

            const info = clients.get(socket);
            if (!info) return;

            if (isEsp32Hello(message)) {
                if (!isAuthorized(message.token)) {
                    reject(socket, "Device authentication failed.");
                    return;
                }
                if (activeDevice && activeDevice !== socket) activeDevice.close(1000, "Replaced by a newer connection.");
                info.role = "esp32";
                info.device = message.device;
                info.lastSeen = Date.now();
                activeDevice = socket;
                console.log(`[ESP32] device=${message.device} firmware=${message.firmware || "unknown"} status=connected`);
                send(socket, { type: "hello_ack", status: "connected" });
                return;
            }

            if (info.role === "esp32") {
                if (isEsp32Heartbeat(message)) {
                    info.lastSeen = Date.now();
                    console.log(`[ESP32] device=${message.device} status=online`);
                    return;
                }

                if (isEsp32Ack(message) || isEsp32Error(message)) {
                    console.log(`[ESP32 ACK] device=${info.device || "unknown"} item=${message.item || "none"} status=${isEsp32Ack(message) ? (message.status || "ok") : "error"}`);
                    if (message.requestId) completeCommand(message.requestId, isEsp32Ack(message), isEsp32Error(message) ? message.message : undefined);
                    return;
                }

                // If already registered as esp32, ignore any other message types
                return;
            }

            if (message && typeof message === "object" && "type" in message && message.type === "register") {
                const registration = message as { role?: unknown; token?: unknown };
                if (!isAuthorized(registration.token) || (registration.role !== "agent" && registration.role !== "control")) {
                    reject(socket, "Control authentication failed.");
                    return;
                }
                info.role = "control";
                return;
            }

            if (info.role !== "control") {
                reject(socket, "Register as an authenticated control client first.");
                return;
            }
            if (!isHardwareCommand(message)) {
                send(socket, { type: "command_result", ok: false, message: "Unsupported classroom command." });
                return;
            }
            sendCommandToEsp32(message, socket);
        });

        socket.on("close", () => {
            for (const [requestId, pending] of pendingCommands) {
                if (pending.requester === socket) completeCommand(requestId, false, "Control client disconnected.");
            }
            removeClient(socket);
        });
        socket.on("error", () => removeClient(socket));
    });

    setInterval(() => {
        const cutoff = Date.now() - 30000;
        if (activeDevice) {
            const info = clients.get(activeDevice);
            if (!info?.lastSeen || info.lastSeen < cutoff) {
                console.log(`[ESP32] Device heartbeat expired device=${info?.device || "unknown"}`);
                activeDevice.close(1000, "Heartbeat expired.");
                activeDevice = null;
            }
        }
    }, 10000);

    // ── Startup diagnostics ──────────────────────────────────────
    if (!configuredToken) {
        console.warn("[ESP32] ⚠️  ESP32_DEVICE_TOKEN is NOT SET — bridge authentication is BYPASSED.");
        console.warn("[ESP32]    Any device can connect. Set ESP32_DEVICE_TOKEN in your Render env for production.");
    } else {
        console.log(`[ESP32] ESP32_DEVICE_TOKEN is set (length=${configuredToken.length}).`);
        console.log(`[ESP32] ESP32 must send matching token to authenticate.`);
    }

    if (httpServer) {
        console.log(`[CLASSROOM] WebSocket bridge attached to main HTTP server (same port as Express).`);
    } else {
        console.log(`[CLASSROOM] WebSocket bridge listening on ws://0.0.0.0:${listenPort}`);
    }

    return server;
}

export function isDeviceConnected(): boolean {
    return activeDevice !== null && activeDevice.readyState === 1;
}

export function getActiveDeviceInfo(): { device?: string; lastSeen?: number } | null {
    if (!activeDevice || activeDevice.readyState !== 1) return null;
    const info = clients.get(activeDevice);
    return info ? { device: info.device, lastSeen: info.lastSeen } : null;
}

// Auto-start if executed directly
if (process.argv[1] && process.argv[1].replace(/\\/g, "/").endsWith("bridge.ts")) {
    startBridge();
}

