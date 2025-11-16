// /api/save-picks.js

import { createClient } from "@libsql/client";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { picks } = req.body;

  if (!Array.isArray(picks) || picks.length === 0) {
    return res.status(400).json({ error: "No picks provided" });
  }

  const db = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  try {
    for (const { dk_game_id, pick, player_id } of picks) {
      await db.execute({
        sql: `
          INSERT INTO picks (player_id, dk_game_id, pick)
          VALUES (?, ?, ?)
          ON CONFLICT(player_id, dk_game_id) DO UPDATE SET pick = excluded.pick
        `,
        args: [player_id, dk_game_id, pick],
      });
    }

    res.status(200).json({ message: "Picks saved successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
}