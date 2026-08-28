export const CURRICULUM = {
    fruits: {
        pineapple: {
            english: "pineapple",
            hindi: "अनानास",
            displayName: "pineapple",
            fact: "अनानास बाहर से खुरदुरा और अंदर से मीठा-रसीला फल होता है."
        },
        banana: {
            english: "Banana",
            hindi: "केला",
            displayName: "Banana",
            fact: "केला पीला होता है, नरम होता है और इसे छीलकर आसानी से खाया जाता है.",
        },
        orange: {
            english: "Orange",
            hindi: "संतरा",
            displayName: "Orange",
            fact: "संतरा नारंगी रंग का होता है, इसमें बहुत सा रस होता है और यह खट्टा-मीठा लगता है.",
        },
        mango: {
            english: "Mango",
            hindi: "आम",
            displayName: "Mango",
            fact: "आम पीला-नारंगी होता है और यह गर्मियों का सबसे मीठा फल है.",
        },
    },

    vegetables: {
        onion: {
            english: "Onion",
            hindi: "प्याज़",
            displayName: "Onion",
            fact: "प्याज़ की कई layers होती हैं और यह खाने का स्वाद बढ़ाता है.",
        },
        tomato: {
            english: "Tomato",
            hindi: "टमाटर",
            displayName: "Tomato",
            fact: "टमाटर अक्सर लाल होता है और इसमें Vitamin C होता है.",
        },
        potato: {
            english: "Potato",
            hindi: "आलू",
            displayName: "Potato",
            fact: "आलू ज़मीन के अंदर उगता है और इससे कई तरह के खाने बनते हैं.",
        },
        cucumber: {
            english: "Cucumber",
            hindi: "खीरा",
            displayName: "Cucumber",
            fact: "खीरा हरा और कुरकुरा होता है, इसमें पानी बहुत होता है.",
        },
    },

    shapes: {
        circle: {
            english: "Circle",
            hindi: "गोल",
            displayName: "Circle",
            fact: "Circle का कोई कोना नहीं होता, यह गेंद जैसा गोल होता है.",
        },
        square: {
            english: "Square",
            hindi: "चौकोर",
            displayName: "Square",
            fact: "Square की चारों sides बराबर होती हैं.",
        },
        rectangle: {
            english: "Rectangle",
            hindi: "आयत",
            displayName: "Rectangle",
            fact: "Rectangle के चार corners होते हैं, दो sides लंबी और दो छोटी.",
        },
        triangle: {
            english: "Triangle",
            hindi: "त्रिकोण",
            displayName: "Triangle",
            fact: "Triangle के सिर्फ तीन sides और तीन corners होते हैं.",
        },
    },

    numbers: {
        "1": { english: "One", hindi: "एक", displayName: "1", fact: "एक चीज़ को गिनते हैं — one." },
        "2": { english: "Two", hindi: "दो", displayName: "2", fact: "दो चीज़ों को गिनते हैं — one, two." },
        "3": { english: "Three", hindi: "तीन", displayName: "3", fact: "तीन चीज़ों को गिनते हैं — one, two, three." },
        "4": { english: "Four", hindi: "चार", displayName: "4", fact: "चार चीज़ों को गिनते हैं — one, two, three, four." },
        "5": { english: "Five", hindi: "पाँच", displayName: "5", fact: "पाँच चीज़ों को गिनते हैं — पूरे एक हाथ की उंगलियाँ." },
        "6": { english: "Six", hindi: "छह", displayName: "6", fact: "छह चीज़ों को गिनते हैं — five के बाद six." },
        "7": { english: "Seven", hindi: "सात", displayName: "7", fact: "सात चीज़ों को गिनते हैं — six के बाद seven." },
        "8": { english: "Eight", hindi: "आठ", displayName: "8", fact: "आठ चीज़ों को गिनते हैं — seven के बाद eight." },
        "9": { english: "Nine", hindi: "नौ", displayName: "9", fact: "नौ चीज़ों को गिनते हैं — eight के बाद nine." },
        "10": { english: "Ten", hindi: "दस", displayName: "10", fact: "दस चीज़ों को गिनते हैं — दोनों हाथों की सारी उंगलियाँ." },
    },
} as const;

export type ClassroomCategory = keyof typeof CURRICULUM;

export type ClassroomItem = {
    [Category in ClassroomCategory]: keyof typeof CURRICULUM[Category];
}[ClassroomCategory];

export function isClassroomCategory(value: unknown): value is ClassroomCategory {
    return typeof value === "string" && value in CURRICULUM;
}

export function isClassroomItem(category: string, item: unknown): item is ClassroomItem {
    return (
        isClassroomCategory(category) &&
        typeof item === "string" &&
        item in (CURRICULUM as Record<string, Record<string, unknown>>)[category]
    );
}

export function isValidLearningItem(category: unknown, item: unknown): category is ClassroomCategory {
    return isClassroomCategory(category) && isClassroomItem(category as string, item);
}

/** Look up the grounded spoken fact for an item, so the teacher never invents facts. */
export function getItemFact(category: ClassroomCategory, item: string): string | null {
    if (!isClassroomItem(category, item)) return null;
    const entry = (CURRICULUM as Record<string, Record<string, { fact: string }>>)[category][item];
    return entry?.fact ?? null;
}