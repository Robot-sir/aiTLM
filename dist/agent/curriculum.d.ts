export declare const CURRICULUM: {
    readonly fruits: {
        readonly pineapple: {
            readonly english: "pineapple";
            readonly hindi: "अनानास";
            readonly displayName: "pineapple";
            readonly fact: "अनानास बाहर से खुरदुरा और अंदर से मीठा-रसीला फल होता है.";
        };
        readonly banana: {
            readonly english: "Banana";
            readonly hindi: "केला";
            readonly displayName: "Banana";
            readonly fact: "केला पीला होता है, नरम होता है और इसे छीलकर आसानी से खाया जाता है.";
        };
        readonly orange: {
            readonly english: "Orange";
            readonly hindi: "संतरा";
            readonly displayName: "Orange";
            readonly fact: "संतरा नारंगी रंग का होता है, इसमें बहुत सा रस होता है और यह खट्टा-मीठा लगता है.";
        };
        readonly mango: {
            readonly english: "Mango";
            readonly hindi: "आम";
            readonly displayName: "Mango";
            readonly fact: "आम पीला-नारंगी होता है और यह गर्मियों का सबसे मीठा फल है.";
        };
    };
    readonly vegetables: {
        readonly onion: {
            readonly english: "Onion";
            readonly hindi: "प्याज़";
            readonly displayName: "Onion";
            readonly fact: "प्याज़ की कई layers होती हैं और यह खाने का स्वाद बढ़ाता है.";
        };
        readonly tomato: {
            readonly english: "Tomato";
            readonly hindi: "टमाटर";
            readonly displayName: "Tomato";
            readonly fact: "टमाटर अक्सर लाल होता है और इसमें Vitamin C होता है.";
        };
        readonly potato: {
            readonly english: "Potato";
            readonly hindi: "आलू";
            readonly displayName: "Potato";
            readonly fact: "आलू ज़मीन के अंदर उगता है और इससे कई तरह के खाने बनते हैं.";
        };
        readonly cucumber: {
            readonly english: "Cucumber";
            readonly hindi: "खीरा";
            readonly displayName: "Cucumber";
            readonly fact: "खीरा हरा और कुरकुरा होता है, इसमें पानी बहुत होता है.";
        };
    };
    readonly shapes: {
        readonly circle: {
            readonly english: "Circle";
            readonly hindi: "गोल";
            readonly displayName: "Circle";
            readonly fact: "Circle का कोई कोना नहीं होता, यह गेंद जैसा गोल होता है.";
        };
        readonly square: {
            readonly english: "Square";
            readonly hindi: "चौकोर";
            readonly displayName: "Square";
            readonly fact: "Square की चारों sides बराबर होती हैं.";
        };
        readonly rectangle: {
            readonly english: "Rectangle";
            readonly hindi: "आयत";
            readonly displayName: "Rectangle";
            readonly fact: "Rectangle के चार corners होते हैं, दो sides लंबी और दो छोटी.";
        };
        readonly triangle: {
            readonly english: "Triangle";
            readonly hindi: "त्रिकोण";
            readonly displayName: "Triangle";
            readonly fact: "Triangle के सिर्फ तीन sides और तीन corners होते हैं.";
        };
    };
    readonly numbers: {
        readonly "1": {
            readonly english: "One";
            readonly hindi: "एक";
            readonly displayName: "1";
            readonly fact: "एक चीज़ को गिनते हैं — one.";
        };
        readonly "2": {
            readonly english: "Two";
            readonly hindi: "दो";
            readonly displayName: "2";
            readonly fact: "दो चीज़ों को गिनते हैं — one, two.";
        };
        readonly "3": {
            readonly english: "Three";
            readonly hindi: "तीन";
            readonly displayName: "3";
            readonly fact: "तीन चीज़ों को गिनते हैं — one, two, three.";
        };
        readonly "4": {
            readonly english: "Four";
            readonly hindi: "चार";
            readonly displayName: "4";
            readonly fact: "चार चीज़ों को गिनते हैं — one, two, three, four.";
        };
        readonly "5": {
            readonly english: "Five";
            readonly hindi: "पाँच";
            readonly displayName: "5";
            readonly fact: "पाँच चीज़ों को गिनते हैं — पूरे एक हाथ की उंगलियाँ.";
        };
        readonly "6": {
            readonly english: "Six";
            readonly hindi: "छह";
            readonly displayName: "6";
            readonly fact: "छह चीज़ों को गिनते हैं — five के बाद six.";
        };
        readonly "7": {
            readonly english: "Seven";
            readonly hindi: "सात";
            readonly displayName: "7";
            readonly fact: "सात चीज़ों को गिनते हैं — six के बाद seven.";
        };
        readonly "8": {
            readonly english: "Eight";
            readonly hindi: "आठ";
            readonly displayName: "8";
            readonly fact: "आठ चीज़ों को गिनते हैं — seven के बाद eight.";
        };
        readonly "9": {
            readonly english: "Nine";
            readonly hindi: "नौ";
            readonly displayName: "9";
            readonly fact: "नौ चीज़ों को गिनते हैं — eight के बाद nine.";
        };
        readonly "10": {
            readonly english: "Ten";
            readonly hindi: "दस";
            readonly displayName: "10";
            readonly fact: "दस चीज़ों को गिनते हैं — दोनों हाथों की सारी उंगलियाँ.";
        };
    };
};
export type ClassroomCategory = keyof typeof CURRICULUM;
export type ClassroomItem = {
    [Category in ClassroomCategory]: keyof typeof CURRICULUM[Category];
}[ClassroomCategory];
export declare function isClassroomCategory(value: unknown): value is ClassroomCategory;
export declare function isClassroomItem(category: string, item: unknown): item is ClassroomItem;
export declare function isValidLearningItem(category: unknown, item: unknown): category is ClassroomCategory;
/** Look up the grounded spoken fact for an item, so the teacher never invents facts. */
export declare function getItemFact(category: ClassroomCategory, item: string): string | null;
