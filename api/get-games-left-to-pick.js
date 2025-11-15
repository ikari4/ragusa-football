// /api/get-games-left-to-pick.js
import { createClient } from "@libsql/client";


export async function POST(req) {
    try {
        const { playerId, currentWeek } = await req.json();
        const dbClient = createClient({
            url: process.env.TURSO_DATABASE_URL,
            authToken: process.env.TURSO_AUTH_TOKEN,
        });
        const result = await dbClient.execute({
        sql: `
            SELECT 
            g.dk_game_id,
            g.home_team,
            g.away_team,
            g.game_date,
            g.spread
            FROM games g
            LEFT JOIN picks p
            ON g.dk_game_id = p.dk_game_id
            AND p.player_id = ?
            WHERE g.nfl_week = ?
            AND datetime(g.game_date) > datetime('now')
            AND p.pick IS NULL
            ORDER BY datetime(g.game_date) ASC;
        `,
        args: [playerId, currentWeek.week]
        });

        const availableGames = result.rows.map(row => ({
        dk_game_id: row.dk_game_id,
        home_team: row.home_team,
        away_team: row.away_team,
        game_date: row.game_date,
        spread: row.spread
        }));

        return new Response(JSON.stringify(availableGames), {
        status: 200,
        headers: { "Content-Type": "application/json" }
        });

    } catch (error) {
        console.error(error);
        return new Response(JSON.stringify({ error: "Server error" }), { status: 500 });
    }
}
