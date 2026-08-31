import "dotenv/config";
import { WebSocketServer } from "ws";
export declare function startBridge(listenPort?: number): WebSocketServer;
export declare function isDeviceConnected(): boolean;
export declare function getActiveDeviceInfo(): {
    device?: string;
    lastSeen?: number;
} | null;
