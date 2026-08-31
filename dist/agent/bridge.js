import "dotenv/config";
import { randomUUID } from "node:crypto";
import { WebSocketServer } from "ws";
import { isEsp32Ack, isEsp32Error, isEsp32Heartbeat, isEsp32Hello, isHardwareCommand, } from "./hardware-protocol.js";
const port = Number(process.env.ESP32_WS_PORT || process.env.CLASSROOM_BRIDGE_PORT || 8787);
const configuredToken = process.env.ESP32_DEVICE_TOKEN || "";
const commandTimeoutMs = 3000;
const clients = new Map();
const pendingCommands = new Map();
let activeDevice = null;
function send(socket, message) {
    if (socket.readyState === socket.OPEN)
        socket.send(JSON.stringify(message));
}
function isAuthorized(token) {
    return !configuredToken || token === configuredToken;
}
function reject(socket, message) {
    send(socket, { type: "error", message });
    socket.close(1008, message);
}
function completeCommand(requestId, ok, message) {
    const pending = pendingCommands.get(requestId);
    if (!pending)
        return;
    clearTimeout(pending.timer);
    pendingCommands.delete(requestId);
    if (pending.resolve) {
        pending.resolve({ ok, message });
    }
    if (pending.requester) {
        send(pending.requester, { type: "command_result", ok, message });
    }
}
function sendCommandToEsp32(command, requester) {
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
export function sendCommandToActiveDevice(command) {
    const device = activeDevice;
    if (!device || device.readyState !== device.OPEN) {
        return Promise.resolve({ ok: false, message: "Classroom device is offline." });
    }
    return new Promise((resolve) => {
        const requestId = randomUUID();
        const timer = setTimeout(() => {
            pendingCommands.delete(requestId);
            resolve({ ok: false, message: "Classroom device did not acknowledge the command." });
        }, commandTimeoutMs);
        pendingCommands.set(requestId, { requester: null, resolve, timer });
        send(device, { ...command, requestId });
        console.log(`[ESP32] command=${command.type} requestId=${requestId} status=sent`);
    });
}
function removeClient(socket) {
    const info = clients.get(socket);
    if (socket === activeDevice) {
        activeDevice = null;
        console.log(`[ESP32] Device offline device=${info?.device || "unknown"}`);
    }
    clients.delete(socket);
}
export function startBridge(listenPort = port, httpServer) {
    const wssOptions = httpServer ? { server: httpServer } : { port: listenPort };
    const server = new WebSocketServer(wssOptions);
    server.on("connection", (socket) => {
        clients.set(socket, { role: "unknown" });
        send(socket, { type: "bridge_ready" });
        socket.on("message", (raw) => {
            let message;
            try {
                message = JSON.parse(raw.toString());
            }
            catch {
                reject(socket, "Messages must be JSON.");
                return;
            }
            const info = clients.get(socket);
            if (!info)
                return;
            if (isEsp32Hello(message)) {
                if (!isAuthorized(message.token)) {
                    reject(socket, "Device authentication failed.");
                    return;
                }
                if (activeDevice && activeDevice !== socket)
                    activeDevice.close(1000, "Replaced by a newer connection.");
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
                    if (message.requestId)
                        completeCommand(message.requestId, isEsp32Ack(message), isEsp32Error(message) ? message.message : undefined);
                    return;
                }
                // If already registered as esp32, ignore any other message types
                return;
            }
            if (message && typeof message === "object" && "type" in message && message.type === "register") {
                const registration = message;
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
                if (pending.requester === socket)
                    completeCommand(requestId, false, "Control client disconnected.");
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
    if (!configuredToken)
        console.warn("[ESP32] ESP32_DEVICE_TOKEN is not configured; bridge authentication is disabled for development.");
    if (httpServer) {
        console.log(`[CLASSROOM] WebSocket bridge attached to main HTTP server`);
    }
    else {
        console.log(`[CLASSROOM] WebSocket bridge listening on ws://0.0.0.0:${listenPort}`);
    }
    return server;
}
export function isDeviceConnected() {
    return activeDevice !== null && activeDevice.readyState === 1;
}
export function getActiveDeviceInfo() {
    if (!activeDevice || activeDevice.readyState !== 1)
        return null;
    const info = clients.get(activeDevice);
    return info ? { device: info.device, lastSeen: info.lastSeen } : null;
}
// Auto-start if executed directly
if (process.argv[1] && process.argv[1].replace(/\\/g, "/").endsWith("bridge.ts")) {
    startBridge();
}
