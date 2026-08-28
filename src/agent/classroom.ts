import { activateLearningItem } from "./hardware-client.js";

import {
    CURRICULUM,
    isClassroomCategory,
    isClassroomItem,
    getItemFact,
    type ClassroomCategory,
    type ClassroomItem,
} from "./curriculum.js";

export {
    CURRICULUM,
    isClassroomCategory,
    isClassroomItem,
    getItemFact,
} from "./curriculum.js";

export type { ClassroomCategory, ClassroomItem } from "./curriculum.js";

/**
 * Physical classroom learning items, derived from CURRICULUM.
 * Current locked curriculum: 4 fruits, 4 vegetables, 4 shapes, numbers 1-10 (22 items total).
 */
export const CLASSROOM_ITEMS = Object.fromEntries(
    Object.entries(CURRICULUM).map(([category, items]) => [
        category,
        Object.fromEntries(Object.keys(items).map((item) => [item, item])),
    ]),
) as Record<ClassroomCategory, Record<string, string>>;

export type LearningItemCommand = {
    type: "active_item";
    category: ClassroomCategory;
    item: ClassroomItem;
    fact: string | null;
};

export function isLearningItemCommand(value: unknown): value is LearningItemCommand {
    if (!value || typeof value !== "object") return false;
    const command = value as Partial<LearningItemCommand>;
    return (
        command.type === "active_item" &&
        isClassroomCategory(command.category) &&
        isClassroomItem(command.category, command.item)
    );
}

export async function showLearningItem(
    category: ClassroomCategory,
    item: string,
): Promise<LearningItemCommand> {
    if (!isClassroomItem(category, item)) {
        throw new Error(`Unsupported classroom item: ${category}/${item}`);
    }

    await activateLearningItem(category, item);

    return {
        type: "active_item",
        category,
        item: item as ClassroomItem,
        fact: getItemFact(category, item),
    };
}