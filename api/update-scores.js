// api/update-scores.js

import { createClient } from "@libsql/client";

// *** for development
// import fs from "fs/promises";
// import path from "path";
// *** for development

export async function updateScores(weekGames) {
    const dbClient = createClient({
        url: process.env.TURSO_DATABASE_URL,
        authToken: process.env.TURSO_AUTH_TOKEN,
    });

    // *** for development
    // let scoresData;
    // let requestsRemaining;
    // const useMock = true; 
    // if (useMock) {
    //     const filePath = path.resolve("./data/mockScores.json");
    //     const data = await fs.readFile(filePath, "utf-8");
    //     scoresData = JSON.parse(data);
    //     requestsRemaining = 999; 
    // }
    // *** for development

    // get game data from the-odds-api
    const urlBase = 'https://api.the-odds-api.com/v4/sports/americanfootball_nfl/scores/';
    const apiKey = process.env.API_KEY;
    const daysFrom = 3;
    const url = urlBase +
        "?apiKey=" + apiKey + 
        "&daysFrom=" + daysFrom;

    try {
        const response = await fetch(url);

        if (!response.ok) {
            return res.status(response.status).json({ error: "API request failed" });
        }
        // // extract data from the-odds-api data array
        const scoresData = await response.json();
        const requestsRemaining = response.headers.get("x-requests-remaining");
 
        // update games table for each matching game
        for (const g of scoresData) {
            const homeScore = Number(g.scores?.find(t => t.name === g.home_team)?.score ?? null);
            const awayScore = Number(g.scores?.find(t => t.name === g.away_team)?.score ?? null);
            const match = weekGames.find(p => p.dk_game_id === g.id);
            if (!match) continue;
            const spread = match?.spread ?? null;

            if(!isNaN(homeScore)) match.home_score = homeScore;
            if(!isNaN(awayScore)) match.away_score = awayScore;

            let winningTeam = null;
            if (g.completed === true && !isNaN(homeScore) && !isNaN(awayScore)) {

                const awayScoreAdjusted = awayScore + spread; 
                winningTeam =
                    awayScoreAdjusted > homeScore
                    ? g.away_team
                    : homeScore > awayScoreAdjusted
                    ? g.home_team
                    : "TIE";
                    match.winning_team = winningTeam;

                await dbClient.execute({
                    sql: `
                    UPDATE games
                    SET home_score = ?, away_score = ?, winning_team = ?
                    WHERE dk_game_id = ?
                    `,
                    args: [homeScore, awayScore, winningTeam, g.id],
                });

                match.home_score = homeScore;
                match.away_score = awayScore;
                match.winning_team = winningTeam;
            }    
        }

        return new Response(JSON.stringify({ 
            scores_data: weekGames,
            requests_remaining: requestsRemaining
        }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });
    } catch (err) {
        console.error("Error refreshing scores:", err);
        throw err;
    }
}
