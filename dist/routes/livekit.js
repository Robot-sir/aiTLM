import { Router } from "express";
import { AccessToken, AgentDispatchClient } from "livekit-server-sdk";
import { randomUUID } from "node:crypto";
const router = Router();
router.get("/token", async (_req, res) => {
    try {
        const apiKey = process.env.LIVEKIT_API_KEY;
        const apiSecret = process.env.LIVEKIT_API_SECRET;
        const url = process.env.LIVEKIT_URL || process.env.NEXT_PUBLIC_LIVEKIT_URL;
        if (!apiKey || !apiSecret || !url) {
            res.status(503).json({
                error: "Add LIVEKIT_API_KEY, LIVEKIT_API_SECRET, and LIVEKIT_URL (or NEXT_PUBLIC_LIVEKIT_URL) to .env.",
            });
            return;
        }
        const room = `kite-practice-${randomUUID()}`;
        const identity = `teacher-${randomUUID().slice(0, 8)}`;
        const token = new AccessToken(apiKey, apiSecret, { identity, ttl: "10m" });
        token.addGrant({ roomJoin: true, room, canPublish: true, canSubscribe: true });
        const serviceUrl = url.replace(/^wss:/, "https:").replace(/^ws:/, "http:");
        const dispatchClient = new AgentDispatchClient(serviceUrl, apiKey, apiSecret);
        try {
            await dispatchClient.createDispatch(room, "kite-agent");
        }
        catch (dispatchError) {
            console.warn("[LIVEKIT DISPATCH WARNING]", dispatchError);
            // We still return token so connection can proceed if agent is dynamically joining
        }
        res.json({
            token: await token.toJwt(),
            url,
            room,
        });
    }
    catch (error) {
        console.error("[LIVEKIT TOKEN ERROR]", error);
        res.status(500).json({ error: "Failed to generate LiveKit token." });
    }
});
export default router;
