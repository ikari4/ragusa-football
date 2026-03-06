// build-stats-html.js
// return array with all completed games and picks by user

import { createClient } from "@libsql/client";
export default async function handler (req, res) {
    try {
        const db = createClient({
        url: process.env.TURSO_DATABASE_URL,
        authToken: process.env.TURSO_AUTH_TOKEN,
        }); 

        const result = await db.execute({
            // sql: `SELECT * FROM games ORDER BY winning_team;`,
            sql: `
                SELECT 
                g.dk_game_id,
                g.winning_team,
                g.home_team,
                g.away_team,
                p.pick,
                p.player_id,
                pl.username
                FROM games g
                LEFT JOIN picks p ON g.dk_game_id = p.dk_game_id
                LEFT JOIN players pl ON p.player_id = pl.player_id
                ORDER BY g.dk_game_id ASC, pl.player_id ASC;
            `,
        });
        
        const rows = result.rows;
        res.status(200).json(rows);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }

}