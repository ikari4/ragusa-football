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
        
        // get all games for the current week
        const result = await dbClient.execute({
        sql: `
            SELECT dk_game_id, home_team, away_team, game_date, spread, nfl_week
            FROM games
            WHERE nfl_week = ?;
        `,
        args: [currentWeek.week],
        });

        const weekGames = result.rows.map(row => ({
            dk_game_id: row.dk_game_id,
            home_team: row.home_team,
            away_team: row.away_team,
            game_date: row.game_date,
            spread: row.spread,
            nfl_week: row.nfl_week
        }));

        // find earliest start time this week
        const firstStart = new Date(
            Math.min(...weekGames.map(g => new Date(g.game_date).getTime()))
        );

        // if the first game has started, udpate all scores from the api
        const timeNow = new Date();
        const hasGameStarted = timeNow > firstStart;
        
        let scoresData;
        let requestsRemaining;

        if(hasGameStarted) {
            const scoreResponse = await updateScores(weekGames);
            const scoreResult = await scoreResponse.json();
            scoresData = scoreResult.scores_data;
            console.log("scoresData: ", scoresData);
            requestsRemaining = scoreResult.requests_remaining;
            console.log("requests remaining: ", requestsRemaining);
        }

        // next up: modify scoresData from update-scores to add home team, away team
        // and picks for all players
        // save winning team only if game is over

        return new Response(JSON.stringify(scoresData), {
        status: 200,
        headers: { "Content-Type": "application/json" }
        });

    } catch (error) {
        console.error(error);
        return new Response(JSON.stringify({ error: "Server error" }), { status: 500 });
    }
}
