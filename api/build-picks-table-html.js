// /api/build-picks-table.js
// update scores if first game of week has already started
// the create html for picks table and return

function tallyWins(scoresData) {
    const wins = {}; // { username: numberOfWins }

    for (const game of scoresData) {
        const winningTeam = game.winning_team;
        if (!winningTeam || winningTeam === null) continue;
        for (const pickObj of game.picks) {
            const { username, pick } = pickObj;
            if (!wins[username]) {
                wins[username] = 0;
            }
            if (pick === winningTeam) {
                wins[username] += 1;
            }
        }
    }

    return wins;
}

import { createClient } from "@libsql/client";
import { updateScores } from "./update-scores.js";

export async function POST(req) {
    try {
        const { currentWeek } = await req.json();
        const dbClient = createClient({
            url: process.env.TURSO_DATABASE_URL,
            authToken: process.env.TURSO_AUTH_TOKEN,
        });
        
        // get names of all players
        const playersResult = await dbClient.execute({
            sql: `SELECT player_id, username FROM players;`
        });
        const allPlayers = playersResult.rows.map(row => ({
            player_id: row.player_id,
            username: row.username
        }));
                
        // get all games and player picks for the current week
        const gamesResult = await dbClient.execute({
        sql: `
            SELECT 
                g.dk_game_id,
                g.home_team,
                g.away_team,
                g.game_date,
                g.spread,
                g.nfl_week,
                p.player_id,
                p.pick,
                u.username
        FROM games g
        LEFT JOIN picks p
            ON g.dk_game_id = p.dk_game_id
        LEFT JOIN players u
            ON p.player_id = u.player_id
        WHERE g.nfl_week = ?;
        `,
        args: [currentWeek.week],
        });

        const gameMap = new Map();

        for (const row of gamesResult.rows) {

            // initialize game entry if needed
            if (!gameMap.has(row.dk_game_id)) {
                gameMap.set(row.dk_game_id, {
                    dk_game_id: row.dk_game_id,
                    home_team: row.home_team,
                    away_team: row.away_team,
                    game_date: row.game_date,
                    spread: row.spread,
                    nfl_week: row.nfl_week,
                    picks: [] 
                });
            }

            const game = gameMap.get(row.dk_game_id);

            // add actual pick if it exists
            if (row.player_id !== null) {
                game.picks.push({
                    player_id: row.player_id,
                    username: row.username,
                    pick: row.pick
                });
            }
        }

        // fill in missing picks so every game has every player
        for (const game of gameMap.values()) {
            const existingPlayerIds = new Set(game.picks.map(p => p.player_id));

            for (const player of allPlayers) {
                if (!existingPlayerIds.has(player.player_id)) {
                    game.picks.push({
                        player_id: player.player_id,
                        username: player.username,
                        pick: null        
                    });
                }
            }

            // keep picks sorted by player_id or username
            game.picks.sort((a, b) => a.player_id - b.player_id);
        }

        const weekGames = Array.from(gameMap.values());

        // find earliest start time this week
        const firstStart = new Date(
            Math.min(...weekGames.map(g => new Date(g.game_date).getTime()))
        );

        // if the first game has started, udpate all scores from the api
        const timeNow = new Date();
        const hasGameStarted = timeNow > firstStart;
        
        let scoresData = weekGames;
        let requestsRemaining;

        if(hasGameStarted) {
            const scoreResponse = await updateScores(weekGames);
            const scoreResult = await scoreResponse.json();
            scoresData = scoreResult.scores_data;
            requestsRemaining = scoreResult.requests_remaining;
        }

        // count player wins
        const winsData = tallyWins(scoresData);
        
        return new Response(JSON.stringify({
            scoresData: scoresData,
            winsData: winsData,
            allPlayers: allPlayers
        }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });

    } catch (error) {
        console.error(error);
        return new Response(JSON.stringify({ error: "Server error" }), { status: 500 });
    }
}
