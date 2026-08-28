import "dotenv/config";
import { activateLearningItem, clearLearningBoard } from "../agent/hardware-client.js";
import { isClassroomCategory, isClassroomItem } from "../agent/curriculum.js";

const item = process.argv[2] || "pineapple";
const category = process.argv[3] || "fruits";

if (item === "clear") {
    await clearLearningBoard();
    console.log("Classroom cleared.");
    process.exit(0);
}

if (!isClassroomCategory(category) || !isClassroomItem(category, item)) {
    console.error(`Unsupported item: ${category}/${item}`);
    console.error("Usage: npm run hardware:test -- pineapple [fruits]");
    console.error("       npm run hardware:test -- pineapple [fruits]");
    console.error("       npm run hardware:test -- clear");
    process.exit(1);
}

await activateLearningItem(category, item);
console.log(`Activated ${category}/${item}.`);
