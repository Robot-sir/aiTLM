import WebSocket from "ws";
import { isHardwareCommand, type HardwareCommand } from "./hardware-protocol.js";
import { isClassroomItem, type ClassroomCategory } from "./curriculum.js";
import { sendCommandToActiveDevice } from "./bridge.js";

const port = process.env.PORT || process.env.CLASSROOM_BRIDGE_PORT || 8787;
const DEFAULT_BRIDGE_URL = `ws://127.0.0.1:${port}`;
const COMMAND_TIMEOUT_MS = 3000;

type BridgeResult = { type: "command_result"; ok: boolean; message?: string };

export async function sendToEsp32(command: HardwareCommand): Promise<void> {
    if (!isHardwareCommand(command)) throw new Error("Invalid classroom hardware command.");

    /*
     * PRIMARY PATH: In-process bridge.
     *
     * The bridge WebSocket server is attached to the same HTTP
     * server. If the ESP32 is connected, `activeDevice` is set
     * and the command is forwarded directly.
     */
    const inProcessResult = await sendCommandToActiveDevice(command);

    if (inProcessResult.ok) {
        return;
    }

    /*
     * If the device acknowledged but with an error (e.g.
     * unsupported item), log it and return — no point retrying.
     */
    if (
        inProcessResult.message &&
        inProcessResult.message !== "Classroom device is offline."
    ) {
        console.warn(`[KITE HARDWARE] Command failed: ${inProcessResult.message}`);
        throw new Error(`Classroom hardware error: ${inProcessResult.message}`);
    }

    /*
     * FALLBACK: External bridge WebSocket.
     *
     * This only works when the bridge runs as a separate process
     * (e.g. `npm run bridge:dev`). On Render the bridge is attached
     * to the HTTP server, so this path is not expected to work.
     * We still attempt it for local development flexibility.
     */
    console.warn("[KITE HARDWARE] Device offline via in-process bridge, trying external fallback...");

    const bridgeUrl = process.env.CLASSROOM_BRIDGE_URL || DEFAULT_BRIDGE_URL;
    const token = process.env.ESP32_DEVICE_TOKEN || "";

    await new Promise<void>((resolve, reject) => {
        const socket = new WebSocket(bridgeUrl);
        let settled = false;
        const timeout = setTimeout(() => finish("Classroom device did not respond in time."), COMMAND_TIMEOUT_MS);
        const finish = (warnReason?: string) => {
            if (settled) return;
            settled = true;
            clearTimeout(timeout);
            try { socket.close(); } catch {}
            if (warnReason) {
                console.warn(`[KITE HARDWARE] ${warnReason}`);
            }
            resolve();
        };

        socket.once("open", () => {
            socket.send(JSON.stringify({ type: "register", role: "agent", token }));
            socket.send(JSON.stringify(command));
        });
        socket.on("message", (raw) => {
            let message: BridgeResult;
            try {
                message = JSON.parse(raw.toString()) as BridgeResult;
            } catch {
                return;
            }
            if (message.type !== "command_result") return;
            if (message.ok) finish();
            else finish(message.message || "Classroom device response not ok");
        });
        socket.once("error", () => finish("Classroom bridge offline or unavailable."));
        socket.once("close", () => finish("Classroom bridge disconnected."));
    });
}

export async function activateLearningItem(category: ClassroomCategory, item: string): Promise<void> {
    if (!isClassroomItem(category, item)) throw new Error(`Unsupported classroom item: ${category}/${item}`);
    await sendToEsp32({ type: "active_item", category, item });
}

export async function clearLearningBoard(): Promise<void> {
    await sendToEsp32({ type: "clear" });
}
