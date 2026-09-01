import WebSocket from "ws";
import { isHardwareCommand } from "./hardware-protocol.js";
import { isClassroomItem } from "./curriculum.js";
import { sendCommandToActiveDevice } from "./bridge.js";
const port = process.env.PORT || process.env.CLASSROOM_BRIDGE_PORT || 8787;
const DEFAULT_BRIDGE_URL = `ws://127.0.0.1:${port}`;
const COMMAND_TIMEOUT_MS = 3000;
export async function sendToEsp32(command) {
    if (!isHardwareCommand(command))
        throw new Error("Invalid classroom hardware command.");
    try {
        // Direct in-process execution via active WebSocket bridge connection
        const inProcessResult = await sendCommandToActiveDevice(command);
        if (inProcessResult.ok) {
            return;
        }
        if (inProcessResult.message && inProcessResult.message !== "Classroom device is offline.") {
            console.warn(`[KITE HARDWARE] ${inProcessResult.message}`);
            return;
        }
        const bridgeUrl = process.env.CLASSROOM_BRIDGE_URL || DEFAULT_BRIDGE_URL;
        const token = process.env.ESP32_DEVICE_TOKEN || "";
        await new Promise((resolve) => {
            const socket = new WebSocket(bridgeUrl);
            let settled = false;
            const timeout = setTimeout(() => finish("Classroom device did not respond in time."), COMMAND_TIMEOUT_MS);
            const finish = (warnReason) => {
                if (settled)
                    return;
                settled = true;
                clearTimeout(timeout);
                try {
                    socket.close();
                }
                catch { }
                if (warnReason) {
                    console.warn(`[KITE HARDWARE] ${warnReason}`);
                }
                resolve(); // Resolve gracefully so tool execution never crashes!
            };
            socket.once("open", () => {
                socket.send(JSON.stringify({ type: "register", role: "agent", token }));
                socket.send(JSON.stringify(command));
            });
            socket.on("message", (raw) => {
                let message;
                try {
                    message = JSON.parse(raw.toString());
                }
                catch {
                    return;
                }
                if (message.type !== "command_result")
                    return;
                if (message.ok)
                    finish();
                else
                    finish(message.message || "Classroom device response not ok");
            });
            socket.once("error", () => finish("Classroom bridge offline or unavailable."));
            socket.once("close", () => finish("Classroom bridge disconnected."));
        });
    }
    catch (err) {
        console.warn(`[KITE HARDWARE] Hardware command error caught:`, err?.message || err);
    }
}
export async function activateLearningItem(category, item) {
    if (!isClassroomItem(category, item))
        throw new Error(`Unsupported classroom item: ${category}/${item}`);
    await sendToEsp32({ type: "active_item", category, item });
}
export async function clearLearningBoard() {
    await sendToEsp32({ type: "clear" });
}
