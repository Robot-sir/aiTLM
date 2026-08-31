import { type ClassroomCategory, type ClassroomItem } from "./curriculum.js";
export { CURRICULUM, isClassroomCategory, isClassroomItem, getItemFact, } from "./curriculum.js";
export type { ClassroomCategory, ClassroomItem } from "./curriculum.js";
/**
 * Physical classroom learning items, derived from CURRICULUM.
 * Current locked curriculum: 4 fruits, 4 vegetables, 4 shapes, numbers 1-10 (22 items total).
 */
export declare const CLASSROOM_ITEMS: Record<ClassroomCategory, Record<string, string>>;
export type LearningItemCommand = {
    type: "active_item";
    category: ClassroomCategory;
    item: ClassroomItem;
    fact: string | null;
};
export declare function isLearningItemCommand(value: unknown): value is LearningItemCommand;
export declare function showLearningItem(category: ClassroomCategory, item: string): Promise<LearningItemCommand>;
