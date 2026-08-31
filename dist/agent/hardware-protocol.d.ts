import { type ClassroomCategory } from "./curriculum.js";
export type ActiveItemCommand = {
    type: "active_item";
    category: ClassroomCategory;
    item: string;
    requestId?: string;
};
export type ClearCommand = {
    type: "clear";
    requestId?: string;
};
export type HardwareCommand = ActiveItemCommand | ClearCommand;
export type Esp32Hello = {
    type: "hello";
    device: string;
    firmware?: string;
    token?: string;
};
export type Esp32Heartbeat = {
    type: "heartbeat";
    device: string;
    status: "online";
};
export type Esp32Ack = {
    type: "ack";
    requestId?: string;
    category?: string;
    item?: string;
    status?: string;
};
export type Esp32Error = {
    type: "error";
    requestId?: string;
    category?: string;
    item?: string;
    message: string;
};
export type Esp32Message = Esp32Hello | Esp32Heartbeat | Esp32Ack | Esp32Error;
export declare function isHardwareCommand(value: unknown): value is HardwareCommand;
export declare function isEsp32Hello(value: unknown): value is Esp32Hello;
export declare function isEsp32Heartbeat(value: unknown): value is Esp32Heartbeat;
export declare function isEsp32Ack(value: unknown): value is Esp32Ack;
export declare function isEsp32Error(value: unknown): value is Esp32Error;
