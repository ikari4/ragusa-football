// api/update-scores.js

// import { createClient } from "@libsql/client";

// *** for development
import fs from "fs/promises";
import path from "path";
// *** 

export async function updateScores() {
    // const dbClient = createClient({
    //     url: process.env.TURSO_DATABASE_URL,
    //     authToken: process.env.TURSO_AUTH_TOKEN,
    // });

    // *** for development
    const useMock = true; // flip to false when you want real API

    if (useMock) {
        const filePath = path.resolve("./data/mockScores.json");
        const data = await fs.readFile(filePath, "utf-8");
        const scoresData = JSON.parse(data);
        const requestsRemaining = 999; // mock value
        return { scoresData, requestsRemaining };
    }
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
        // extract data from the-odds-api data array
        const scoresData = await response.json();
        const requestsRemaining = response.headers.get("x-requests-remaining");
 
        return { scoresData, requestsRemaining };

        // update games table for each matching game
        
        
        // const updates = [];
        // for (const g of scoresData) {
        //     const homeScore = Number(g.scores?.find(t => t.name === g.home_team)?.score ?? null);
        //     const awayScore = Number(g.scores?.find(t => t.name === g.away_team)?.score ?? null);
        //     const match = games?.find(p => p.dk_game_id === g.id);
        //     const spread = match?.spread ?? null;
        // }
        // let winningTeam = null;
        // if (!isNaN(homeScore) && !isNaN(awayScore)) {

        //     const awayScoreAdjusted = awayScore + spread; 
        //     winningTeam =
        //     awayScoreAdjusted > homeScore
        //     ? g.away_team
        //     : homeScore > awayScoreAdjusted
        //     ? g.home_team
        //     : "TIE";
        //     g.winning_team = winningTeam;

        // await db.execute({
        //     sql: `
        //     UPDATE Games_2025_26
        //     SET home_score = ?, away_score = ?, winning_team = ?
        //     WHERE dk_game_id = ?
        //     `,
        //     args: [homeScore, awayScore, winningTeam, g.id],
        // });

        // updates.push({
        //     dk_game_id: g.id,
        //     home_score: homeScore,
        //     away_score: awayScore,
        //     winning_team: winningTeam
        // });
        // }
        
        // res.status(200).json({ 
        // updates,
        // requests_remaining: requestsRemaining
        // });
    } catch (err) {
        console.error("Error refreshing scores:", err);
        throw err;
    }
}
