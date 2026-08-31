import { activateLearningItem } from "./hardware-client.js";
import { CURRICULUM, isClassroomCategory, isClassroomItem, getItemFact, } from "./curriculum.js";
export { CURRICULUM, isClassroomCategory, isClassroomItem, getItemFact, } from "./curriculum.js";
/**
 * Physical classroom learning items, derived from CURRICULUM.
 * Current locked curriculum: 4 fruits, 4 vegetables, 4 shapes, numbers 1-10 (22 items total).
 */
export const CLASSROOM_ITEMS = Object.fromEntries(Object.entries(CURRICULUM).map(([category, items]) => [
    category,
    Object.fromEntries(Object.keys(items).map((item) => [item, item])),
]));
export function isLearningItemCommand(value) {
    if (!value || typeof value !== "object")
        return false;
    const command = value;
    return (command.type === "active_item" &&
        isClassroomCategory(command.category) &&
        isClassroomItem(command.category, command.item));
}
export async function showLearningItem(category, item) {
    if (!isClassroomItem(category, item)) {
        throw new Error(`Unsupported classroom item: ${category}/${item}`);
    }
    await activateLearningItem(category, item);
    return {
        type: "active_item",
        category,
        item: item,
        fact: getItemFact(category, item),
    };
}
