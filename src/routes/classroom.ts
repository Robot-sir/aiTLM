import { Router, type Request, type Response } from "express";
import { activateLearningItem, clearLearningBoard } from "../agent/hardware-client.js";
import { isDeviceConnected, getActiveDeviceInfo } from "../agent/bridge.js";
import {
    CURRICULUM,
    isClassroomCategory,
    isClassroomItem,
    type ClassroomCategory,
} from "../agent/curriculum.js";

const router = Router();

// GET /api/classroom/status
router.get("/status", (_req: Request, res: Response) => {
    res.json({
        online: isDeviceConnected(),
        device: getActiveDeviceInfo(),
    });
});

// GET /api/classroom/curriculum
router.get("/curriculum", (_req: Request, res: Response) => {
    res.json({
        curriculum: CURRICULUM,
        categories: Object.keys(CURRICULUM),
    });
});


// POST /api/classroom/test (also alias for activate)
router.post("/test", async (req: Request, res: Response) => {
    try {
        const body = req.body as { category?: unknown; item?: unknown };
        if (!isClassroomCategory(body.category) || !isClassroomItem(body.category, body.item)) {
            res.status(400).json({ error: "Unsupported classroom item." });
            return;
        }

        await activateLearningItem(body.category as ClassroomCategory, body.item as string);
        res.json({ ok: true, type: "active_item", category: body.category, item: body.item });
    } catch (error) {
        console.error("[CLASSROOM TEST]", error);
        res.status(503).json({ error: "Classroom device is unavailable." });
    }
});

// POST /api/classroom/activate (alias)
router.post("/activate", async (req: Request, res: Response) => {
    try {
        const body = req.body as { category?: unknown; item?: unknown };
        if (!isClassroomCategory(body.category) || !isClassroomItem(body.category, body.item)) {
            res.status(400).json({ error: "Unsupported classroom item." });
            return;
        }

        await activateLearningItem(body.category as ClassroomCategory, body.item as string);
        res.json({ ok: true, type: "active_item", category: body.category, item: body.item });
    } catch (error) {
        console.error("[CLASSROOM ACTIVATE]", error);
        res.status(503).json({ error: "Classroom device is unavailable." });
    }
});

// POST /api/classroom/clear
router.post("/clear", async (_req: Request, res: Response) => {
    try {
        await clearLearningBoard();
        res.json({ ok: true, type: "clear" });
    } catch (error) {
        console.error("[CLASSROOM CLEAR]", error);
        res.status(503).json({ error: "Classroom device is unavailable." });
    }
});

export default router;
