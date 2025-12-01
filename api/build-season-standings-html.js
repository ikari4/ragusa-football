// build-season-standings-html.js
// return array with all winners and player picks with game and nfl week ids

import { createClient } from "@libsql/client";
export default async function handler (req, res) {
    try {
        const db = createClient({
        url: process.env.TURSO_DATABASE_URL,
        authToken: process.env.TURSO_AUTH_TOKEN,
        }); 

        const result = await db.execute({
        sql: `
            SELECT 
            g.dk_game_id,
            g.nfl_week,
            g.winning_team,
            pl.username,
            pl.player_id,
            pl.team_name,
            p.pick
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