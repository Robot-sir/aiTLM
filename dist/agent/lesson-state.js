import { CURRICULUM, isClassroomItem, } from "./curriculum.js";
export function createLessonState() {
    return {
        subject: null,
        currentItem: null,
        itemIndex: -1,
        active: false,
    };
}
export function setCurrentItem(state, category, item) {
    if (!isClassroomItem(category, item)) {
        throw new Error(`Unsupported classroom item: ${category}/${item}`);
    }
    const items = Object.keys(CURRICULUM[category]);
    const index = items.indexOf(item);
    if (index === -1) {
        throw new Error(`Classroom item not found in curriculum: ${category}/${item}`);
    }
    state.subject = category;
    state.currentItem = item;
    state.itemIndex = index;
    state.active = true;
}
export function clearLessonState(state) {
    state.subject = null;
    state.currentItem = null;
    state.itemIndex = -1;
    state.active = false;
}
