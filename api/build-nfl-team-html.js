// build-nfl-team-html.js
// return array with all completed games

import { createClient } from "@libsql/client";
export default async function handler (req, res) {
    try {
        const db = createClient({
        url: process.env.TURSO_DATABASE_URL,
        authToken: process.env.TURSO_AUTH_TOKEN,
        }); 

        const result = await db.execute({
            sql: `SELECT * FROM games ORDER BY winning_team;`,
        });
        
        const rows = result.rows;
        res.status(200).json(rows);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }

}