import WebSocket from "ws";
import { isHardwareCommand, type HardwareCommand } from "./hardware-protocol.js";
import { isClassroomItem, type ClassroomCategory } from "./curriculum.js";

const DEFAULT_BRIDGE_URL = "ws://127.0.0.1:8787";
const COMMAND_TIMEOUT_MS = 3000;

type BridgeResult = { type: "command_result"; ok: boolean; message?: string };

export async function sendToEsp32(command: HardwareCommand): Promise<void> {
    if (!isHardwareCommand(command)) throw new Error("Invalid classroom hardware command.");

    const bridgeUrl = process.env.CLASSROOM_BRIDGE_URL || DEFAULT_BRIDGE_URL;
    const token = process.env.ESP32_DEVICE_TOKEN || "";

    await new Promise<void>((resolve, reject) => {
        const socket = new WebSocket(bridgeUrl);
        let settled = false;
        const timeout = setTimeout(() => finish(new Error("Classroom device did not respond in time.")), COMMAND_TIMEOUT_MS);
        const finish = (error?: Error) => {
            if (settled) return;
            settled = true;
            clearTimeout(timeout);
            socket.close();
            if (error) {
                reject(error);
            } else {
                resolve();
            }
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
            else finish(new Error(message.message || "Classroom device unavailable."));
        });
        socket.once("error", () => finish(new Error("Classroom bridge unavailable.")));
        socket.once("close", () => finish(new Error("Classroom bridge disconnected.")));
    });
}

export async function activateLearningItem(category: ClassroomCategory, item: string): Promise<void> {
    if (!isClassroomItem(category, item)) throw new Error(`Unsupported classroom item: ${category}/${item}`);
    await sendToEsp32({ type: "active_item", category, item });
}

export async function clearLearningBoard(): Promise<void> {
    await sendToEsp32({ type: "clear" });
}
