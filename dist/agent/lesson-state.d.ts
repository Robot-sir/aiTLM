import { type ClassroomCategory, type ClassroomItem } from "./curriculum.js";
export type LessonSubject = ClassroomCategory | "stories" | "rhymes" | null;
export type LessonState = {
    subject: LessonSubject;
    currentItem: ClassroomItem | null;
    itemIndex: number;
    active: boolean;
};
export declare function createLessonState(): LessonState;
export declare function setCurrentItem(state: LessonState, category: ClassroomCategory, item: ClassroomItem): void;
export declare function clearLessonState(state: LessonState): void;
