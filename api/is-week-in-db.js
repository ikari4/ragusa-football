import { createClient } from "@libsql/client";

export default async function handler(req, res) {
    if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
    }

    const { nflWeek } = req.body;
  
    const client = createClient ({
        url: process.env.TURSO_DATABASE_URL,
        authToken: process.env.TURSO_AUTH_TOKEN,
    });

    try {
        const result = await client.execute({
            sql: "SELECT nfl_week FROM games WHERE nfl_week = ? LIMIT 1",
            args: [nflWeek]
        });

        const match = result.rows[0];
        if (!match) {
        return res.status(401).json({ error: "NFL Week not found" });
        }

        return res.status(200).json({ success: true });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
}