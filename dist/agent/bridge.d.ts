import "dotenv/config";
import { WebSocketServer } from "ws";
import type { Server } from "node:http";
import { type HardwareCommand } from "./hardware-protocol.js";
export declare function sendCommandToActiveDevice(command: HardwareCommand): Promise<{
    ok: boolean;
    message?: string;
}>;
export declare function startBridge(listenPort?: number, httpServer?: Server): WebSocketServer;
export declare function isDeviceConnected(): boolean;
export declare function getActiveDeviceInfo(): {
    device?: string;
    lastSeen?: number;
} | null;
