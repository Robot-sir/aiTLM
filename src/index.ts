import "dotenv/config";

import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";

import healthRouter from "./routes/health.js";
import chatRouter from "./routes/chat.js";
import livekitRouter from "./routes/livekit.js";
import classroomRouter from "./routes/classroom.js";

import { startBridge } from "./agent/bridge.js";

const app = express();

const port = Number(process.env.PORT || 5000);

const bridgePort = Number(
    process.env.ESP32_WS_PORT ||
    process.env.CLASSROOM_BRIDGE_PORT ||
    8787
);


// ============================================================
// PATHS
// ============================================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/*
    After TypeScript compilation:

    backend/
    ├── dist/
    │   └── index.js
    │
    └── public/
        ├── index.html
        ├── assets/
        └── ...

    Therefore:

    dist/index.js
          ↓ ../public
    public/
*/

const frontendPath = path.join(__dirname, "../public");


// ============================================================
// MIDDLEWARE
// ============================================================

app.use(
    cors({
        origin: "*",
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
    })
);

app.use(express.json());


// ============================================================
// REQUEST LOGGING
// ============================================================

app.use((req, _res, next) => {
    console.log(`[API] ${req.method} ${req.path}`);
    next();
});


// ============================================================
// API ROUTES
// ============================================================

app.use("/api/health", healthRouter);

app.use("/api/chat", chatRouter);

app.use("/api/livekit", livekitRouter);

app.use("/api/classroom", classroomRouter);


// ============================================================
// STATIC FRONTEND
// ============================================================

/*
    Serve the compiled Vite React application.

    Example:

    GET /
        → public/index.html

    GET /assets/index-xxxxx.js
        → public/assets/index-xxxxx.js
*/

app.use(express.static(frontendPath));


// ============================================================
// REACT SPA FALLBACK
// ============================================================

/*
    React Router / SPA support.

    If the browser requests:

        /classroom
        /teacher
        /settings
        /dashboard

    Express returns index.html so React can handle the route.

    IMPORTANT:
    Never return index.html for an unknown /api route.
*/

app.get("*", (req, res, next) => {

    if (req.path.startsWith("/api")) {
        next();
        return;
    }

    res.sendFile(
        path.join(frontendPath, "index.html")
    );
});


// ============================================================
// 404 FOR UNKNOWN API ROUTES
// ============================================================

app.use("/api", (_req, res) => {
    res.status(404).json({
        error: "API endpoint not found.",
    });
});


// ============================================================
// START EXPRESS SERVER
// ============================================================

const server = app.listen(port, () => {

    console.log("=========================================");

    console.log(
        `🚀 Kite Express API running on port ${port}`
    );

    console.log(
        `🌐 Frontend: http://localhost:${port}`
    );

    console.log(
        `📡 Health: http://localhost:${port}/api/health`
    );

    console.log(
        `🤖 Chat: http://localhost:${port}/api/chat`
    );

    console.log(
        `🎙️ LiveKit: http://localhost:${port}/api/livekit/token`
    );

    console.log(
        `🏫 Classroom: http://localhost:${port}/api/classroom/curriculum`
    );

    console.log(
        `🔌 ESP32 Bridge: Attached to main server on port ${port}`
    );

    console.log("=========================================");
});


// ============================================================
// START ESP32 WEBSOCKET BRIDGE
// ============================================================

try {
    startBridge(bridgePort, server);
} catch (error) {

    console.warn(
        `[BRIDGE] Could not auto-start bridge on port ${bridgePort}:`,
        error
    );
}


export default app;