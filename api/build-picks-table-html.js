// /api/build-picks-table.js
// update scores if first game of week has already started
// the create html for picks table and return

import { createClient } from "@libsql/client";
import { updateScores } from "./update-scores.js";

export async function POST(req) {
    try {
        const { currentWeek } = await req.json();
        const dbClient = createClient({
            url: process.env.TURSO_DATABASE_URL,
            authToken: process.env.TURSO_AUTH_TOKEN,
        });
        
        // find the earlier game start time this nfl_week
        const result = await dbClient.execute({
        sql: `
            SELECT MIN(datetime(game_date)) AS first_start_time
            FROM games
            WHERE nfl_week = ?;
        `,
        args: [currentWeek.week],
        });

        const firstStart = new Date(result.rows[0].first_start_time);

        // if the first game has started, udpate all scores from the api
        const timeNow = new Date();
        const hasGameStarted = timeNow > firstStart;
        
        let scoresData;
        let requestsRemaining;

        if(hasGameStarted) {
            const scoreResult = await updateScores();
            scoresData = scoreResult.scoresData;
            requestsRemaining = scoreResult.requestsRemaining;
            console.log("scoresData: ", scoresData);
            console.log("requestsRemaining: ", requestsRemaining);
        }

        return new Response(JSON.stringify(scoresData), {
        status: 200,
        headers: { "Content-Type": "application/json" }
        });

    } catch (error) {
        console.error(error);
        return new Response(JSON.stringify({ error: "Server error" }), { status: 500 });
    }
}
