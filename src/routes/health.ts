import { Router, type Request, type Response } from "express";
import { isDeviceConnected, getActiveDeviceInfo } from "../agent/bridge.js";

const router = Router();

router.get("/", (_req: Request, res: Response) => {
    res.json({
        status: "ok",
        service: "kite-backend",
        timestamp: new Date().toISOString(),
        bridge: {
            online: isDeviceConnected(),
            device: getActiveDeviceInfo(),
        },
    });
});

export default router;

