// /api/get-and-store-this-week-games.js
// gets data from the-odds-api, filters for nfl_week and draftkings
// then saves to game db table and returns data to front end

// Get game data from the-odds-api
import { createClient } from "@libsql/client";

export default async function handler(req, res) {

    const { currentWeek } = req.body;
    const urlBase = 'https://api.the-odds-api.com/v4/sports/americanfootball_nfl/odds/';
    const apiKey = process.env.API_KEY;
    const regions = 'us';
    const markets = 'spreads';
    const bookmakers = 'draftkings';
    const oddsFormat = 'american';
    const url = urlBase +
    "?apiKey=" + apiKey + 
    "&regions=" + regions + 
    "&bookmakers=" + bookmakers + 
    "&markets=" + markets + 
    "&oddsFormat=" + oddsFormat;

    try {
    const response = await fetch(url);

        if (!response.ok) {
            return res.status(response.status).json({ error: "API request failed" });
        }
        // Extract data from the-odds-api data array
        const data = await response.json();
        const requestsRemaining = response.headers.get("x-requests-remaining");
        const games = data.map(game => {
            const draftKings = game.bookmakers.find(b => b.key === "draftkings");
            const spreads = draftKings?.markets.find(m => m.key === "spreads");
            const awayOutcome = spreads?.outcomes.find(o => o.name === game.away_team);

            return {
            dk_game_id: game.id,
            game_date: game.commence_time,
            home_team: game.home_team,
            away_team: game.away_team,
            spread: awayOutcome?.point ?? null
            }
        });

        const weekGames = games.filter(g => {
        const date = new Date(g.game_date);
        return date >= new Date(currentWeek.start) && date <= new Date(currentWeek.end);
        });

    const dbClient = createClient({
        url: process.env.TURSO_DATABASE_URL,
        authToken: process.env.TURSO_AUTH_TOKEN,
    });

        // Send to Turso Database
        for (const g of weekGames) {
        await dbClient.execute({
            sql: `
            INSERT INTO games
                (dk_game_id, game_date, nfl_week, home_team, away_team, spread)
            VALUES
                (?, ?, ?, ?, ?, ?)
            ON CONFLICT(dk_game_id) DO UPDATE SET
                game_date = excluded.game_date,
                nfl_week = excluded.nfl_week,
                home_team = excluded.home_team,
                away_team = excluded.away_team,
                spread = excluded.spread
            `,
            args: [
                g.dk_game_id,
                g.game_date,
                currentWeek.week,
                g.home_team,
                g.away_team,
                g.spread
            ],
        });
        }

        // Return JSON to frontend
        res.status(200).send("Odds update completed");

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server Error" });
    }
}