import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const backendRoot = path.resolve(__dirname, "..");

const frontendDist = path.resolve(
    backendRoot,
    "../frontend/dist"
);

const backendPublic = path.resolve(
    backendRoot,
    "public"
);

console.log("[BUILD] Frontend dist:");
console.log(frontendDist);

console.log("[BUILD] Backend public:");
console.log(backendPublic);


// ============================================================
// CHECK FRONTEND BUILD
// ============================================================

if (!fs.existsSync(frontendDist)) {

    console.error(
        "[BUILD] Frontend dist directory does not exist."
    );

    console.error(
        "[BUILD] Run the frontend build first."
    );

    process.exit(1);
}


// ============================================================
// REMOVE OLD PUBLIC
// ============================================================

if (fs.existsSync(backendPublic)) {

    fs.rmSync(
        backendPublic,
        {
            recursive: true,
            force: true,
        }
    );
}


// ============================================================
// COPY FRONTEND
// ============================================================

fs.cpSync(
    frontendDist,
    backendPublic,
    {
        recursive: true,
    }
);

console.log(
    "[BUILD] Frontend copied successfully."
);