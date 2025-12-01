// /api/is-week-in-db.js
// take current NFL week and returns array of games matching that week
// array is used in main js to determine if games exist in database
// and to determine the start time of the first game
// decided to pass array and do manipulation in frontend js so as to 
// avoid UTC to Eastern Time conversion

import { createClient } from "@libsql/client";

export default async function handler(req, res) {
    if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
    }

    let { nflWeek } = req.body;
  
    const client = createClient ({
        url: process.env.TURSO_DATABASE_URL,
        authToken: process.env.TURSO_AUTH_TOKEN
    });

    try {
        const result = await client.execute({
        sql: `
            SELECT 
            dk_game_id,    
            nfl_week,
            game_date
            FROM games 
            WHERE nfl_week = ?
        `,
        args: [nflWeek]
        });

        const rows = result.rows;

        return res.status(200).json({ rows });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
}