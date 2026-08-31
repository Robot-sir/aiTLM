import { isClassroomCategory, isClassroomItem } from "./curriculum.js";
export function isHardwareCommand(value) {
    if (!value || typeof value !== "object")
        return false;
    const command = value;
    if (command.type === "clear")
        return true;
    return command.type === "active_item" &&
        typeof command.category === "string" &&
        isClassroomCategory(command.category) &&
        isClassroomItem(command.category, command.item);
}
export function isEsp32Hello(value) {
    if (!value || typeof value !== "object")
        return false;
    const message = value;
    return message.type === "hello" && typeof message.device === "string" && message.device.length > 0;
}
export function isEsp32Heartbeat(value) {
    if (!value || typeof value !== "object")
        return false;
    const message = value;
    return message.type === "heartbeat" && typeof message.device === "string";
}
export function isEsp32Ack(value) {
    if (!value || typeof value !== "object")
        return false;
    const message = value;
    return message.type === "ack";
}
export function isEsp32Error(value) {
    if (!value || typeof value !== "object")
        return false;
    const message = value;
    return message.type === "error" && typeof message.message === "string";
}
