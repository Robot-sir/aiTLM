import {
    CURRICULUM,
    type ClassroomCategory,
    type ClassroomItem,
    isClassroomItem,
} from "./curriculum.js";

export type LessonSubject =
    | ClassroomCategory
    | "stories"
    | "rhymes"
    | null;

export type LessonState = {
    subject: LessonSubject;
    currentItem: ClassroomItem | null;
    itemIndex: number;
    active: boolean;
};

export function createLessonState(): LessonState {
    return {
        subject: null,
        currentItem: null,
        itemIndex: -1,
        active: false,
    };
}

export function setCurrentItem(
    state: LessonState,
    category: ClassroomCategory,
    item: ClassroomItem,
) {
    if (!isClassroomItem(category, item)) {
        throw new Error(
            `Unsupported classroom item: ${category}/${item}`,
        );
    }

    const items = Object.keys(
        CURRICULUM[category],
    ) as string[];

    const index = items.indexOf(item);

    if (index === -1) {
        throw new Error(
            `Classroom item not found in curriculum: ${category}/${item}`,
        );
    }

    state.subject = category;
    state.currentItem = item;
    state.itemIndex = index;
    state.active = true;
}

export function clearLessonState(
    state: LessonState,
) {
    state.subject = null;
    state.currentItem = null;
    state.itemIndex = -1;
    state.active = false;
}