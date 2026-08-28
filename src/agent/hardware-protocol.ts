import { isClassroomCategory, isClassroomItem, type ClassroomCategory } from "./curriculum.js";

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

export function isHardwareCommand(value: unknown): value is HardwareCommand {
    if (!value || typeof value !== "object") return false;
    const command = value as Partial<HardwareCommand>;
    if (command.type === "clear") return true;
    return command.type === "active_item" &&
        typeof command.category === "string" &&
        isClassroomCategory(command.category) &&
        isClassroomItem(command.category, command.item);
}

export function isEsp32Hello(value: unknown): value is Esp32Hello {
    if (!value || typeof value !== "object") return false;
    const message = value as Partial<Esp32Hello>;
    return message.type === "hello" && typeof message.device === "string" && message.device.length > 0;
}

export function isEsp32Heartbeat(value: unknown): value is Esp32Heartbeat {
    if (!value || typeof value !== "object") return false;
    const message = value as Partial<Esp32Heartbeat>;
    return message.type === "heartbeat" && typeof message.device === "string";
}

export function isEsp32Ack(value: unknown): value is Esp32Ack {
    if (!value || typeof value !== "object") return false;
    const message = value as Partial<Esp32Ack>;
    return message.type === "ack";
}

export function isEsp32Error(value: unknown): value is Esp32Error {
    if (!value || typeof value !== "object") return false;
    const message = value as Partial<Esp32Error>;
    return message.type === "error" && typeof message.message === "string";
}

