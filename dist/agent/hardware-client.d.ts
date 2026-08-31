import { type HardwareCommand } from "./hardware-protocol.js";
import { type ClassroomCategory } from "./curriculum.js";
export declare function sendToEsp32(command: HardwareCommand): Promise<void>;
export declare function activateLearningItem(category: ClassroomCategory, item: string): Promise<void>;
export declare function clearLearningBoard(): Promise<void>;
