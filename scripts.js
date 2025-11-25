// scripts.js

// ***this function needs to be updated each year***
function findNflWeek() {
    const today = new Date();
    const nflWeeks = Array.from({ length: 18 }, (_, i) => {
        const week = i + 1;

        // Week 1 start = Tuesday Sept 2, 2025 @ 12:00 PM Eastern
        const start = new Date(2025, 8, 2 + i * 7, 12, 0, 0);

        // Week end = following Tuesday 11:59:59 AM Eastern
        const end = new Date(2025, 8, 2 + (i + 1) * 7, 11, 59, 59);

        return {
            week,
            start,
            end
        };
    });

    const currentWeek = nflWeeks.find(w => today >= w.start && today <= w.end);

    if (!currentWeek) {
        return { error: "Not within NFL season" };
    }
    return currentWeek;
}

function buildPicksToMakeHtml(gamesToPick) {
    const week = gamesToPick[0]?.nfl_week;
    let htmlToPick = `<div class="picks-div"><h3 class="week-title">Week ${week}</h3>`;
    const gamesByDay = gamesToPick.reduce((groups, game) => {
        const date = new Date(game.game_date);
        const dayKey = date.toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric"
        });
        if (!groups[dayKey]) groups[dayKey] = [];
        groups[dayKey].push(game);
        return groups;
    }, {});

    // group games by day of week
    for (const [day, dayGames] of Object.entries(gamesByDay)) {
        htmlToPick += `<h4 class="day-header">${day}</h4>`;

        dayGames.forEach((g, i) => {
            const gameId = g.dk_game_id;
            let spreadDisplay = "PK";
            if (g.spread !== null && g.spread !== undefined) {
            const spreadNum = Number(g.spread);
                if (!isNaN(spreadNum)) {
                    spreadDisplay = spreadNum > 0 ? `+${spreadNum}` : spreadNum.toString();
                }
            }

            const nameAttr = `game-${gameId}`;
            const awayImg = g.away_team.toLowerCase().replace(/\s+/g, "-");
            const homeImg = g.home_team.toLowerCase().replace(/\s+/g, "-");

            htmlToPick += `
            <div class="game">  
                <div class="team-row">
                    <label class="team-option">
                        <input type="radio" name="game-${nameAttr}" value="${g.away_team}" data-game-id="${gameId}">
                        <img class="team-logo-pick" src="/images/${awayImg}.png" class="team-logo">
                        ${g.away_team} ${spreadDisplay}
                    </label>
                </div>
                <div class="at">@</div>
                <div class="team-row">
                    <label class="team-option">
                        <input type="radio" name="game-${nameAttr}" value="${g.home_team}" data-game-id="${gameId}">
                        <img class="team-logo-pick" src="/images/${homeImg}.png" class="team-logo">
                        ${g.home_team}
                    </label>
                </div>
            </div>
            <hr>
            `;
        });
    }

    htmlToPick += `<button id="submitBtn">Submit</button></div>`;
    return htmlToPick;
}

function buildWinsAndPicksHtml(latestScores, latestWins, allPlayers) {
    const week = latestScores[0]?.nfl_week;
    let htmlWP = `<h3 class="week-title">Week ${week}</h3>`;
    htmlWP += `<div class="table-container"><table id="weekStandings">`;
    htmlWP += "<thead><tr>";
    allPlayers.forEach(name => {
        htmlWP += `<th>${name.username}</th>`;
    });
    htmlWP += "</tr></thead><tbody><tr>";
    allPlayers.forEach(name => {
        htmlWP += `<td>${latestWins[name.username] ?? 0}</td>`
    });
    htmlWP += "</tr></tbody></table></div>";
    htmlWP += "<br>";

    //  group games by date (YYYY-MM-DD)
    const gamesByDate = latestScores.reduce((acc, game) => {
        const dateOnly = new Date(game.game_date).toDateString();
        if (!acc[dateOnly]) acc[dateOnly] = [];
        acc[dateOnly].push(game);
        return acc;
    }, {});

    // build HTML tables for each date group
    for (const [date, games] of Object.entries(gamesByDate)) {
    
        // get all player usernames from the first game's picks array
        const playerHeaders = games[0].picks.map(p => `<th>${p.username}</th>`).join("");

        let tableHTML = `
            <table id="picks-table">
            <thead>
                <h3 id="week-banner">${date}</h3>
                <tr>
                    <th>Away</th>
                    <th>Score</th>
                    <th>Line</th>
                    <th>Score</th>
                    <th>Home</th>
                    ${playerHeaders}
                </tr>
            </thead>
            <tbody>
        `;

        // add rows for each game
        games.forEach(game => {
            const homeWinner = game.winning_team === game.home_team;
            const awayWinner = game.winning_team === game.away_team;
            const playerCells = game.picks
                .map(p => {
                    const isWinner = p.pick === game.winning_team;
                    return `<td class="${isWinner ? "winner" : ""}">${p.pick ?? ""}</td>`;
                })
                .join("");
            
            let spreadDisplay = "PK";
            if (game.spread !== null && game.spread !== undefined) {
                const spreadNum = Number(game.spread);
                if (!isNaN(spreadNum)) {
                    spreadDisplay = spreadNum > 0 ? `+${spreadNum}` : spreadNum.toString();
                }
            }
            
            const awayImg = game.away_team.toLowerCase().replace(/\s+/g, "-");
            const homeImg = game.home_team.toLowerCase().replace(/\s+/g, "-");

            tableHTML += `
            <tr>
                <td class="${awayWinner ? "winner" : ""}"><img class="team-logo" src="/images/${awayImg}.png"></td>
                <td>${game.away_score ?? 0}</td>
                <td>${spreadDisplay}</td>
                <td>${game.home_score ?? 0}</td>
                <td class="${homeWinner ? "winner" : ""}"><img class="team-logo" src="/images/${homeImg}.png"></td>
                ${playerCells}
            </tr>
            `;
        });

        tableHTML += `
            </tbody>
            </table>
        `;

        // append to htmlWP
        htmlWP += tableHTML;
    }
    return htmlWP;
}

function buildSeasonStandingsHtml(standingsData) {
    // group wins per week per player
    const playerWinsByWeek = {}; // { week: { playerName: wins } }
    const allPlayers = new Set();

    standingsData.forEach(row => {
        const week = row.nfl_week;
        const player = row.username;
        const pick = row.pick;
        const winner = row.winning_team;

        if (!player || !week) return;
        allPlayers.add(player);

        if (!playerWinsByWeek[week]) playerWinsByWeek[week] = {};

        if (winner && pick === winner) {
        playerWinsByWeek[week][player] = (playerWinsByWeek[week][player] || 0) + 1;
        } else if (!playerWinsByWeek[week][player]) {
        playerWinsByWeek[week][player] = 0;
        }
    });

    const playerNames = Array.from(allPlayers);

    // build HTML standings table
    let htmlStand = "<hr></hr>";
    htmlStand += `<h3 class="week-title">Season Standings</h3>`;
    htmlStand += `<div class="table-container"><table id="seasonStandings">`;
    htmlStand += "<thead><tr>";
    htmlStand += "<th></th>";
    playerNames.forEach(name => {
        htmlStand += `<th>${name}</th>`;
    });
    htmlStand += "</tr></thead><tbody>";

    // add each week's row
    const sortedWeeks = Object.keys(playerWinsByWeek).sort((a, b) => a - b);
    const totalWins = Object.fromEntries(playerNames.map(n => [n, 0]));

    sortedWeeks.forEach(week => {
        htmlStand += `<tr><td>${week}</td>`;
        playerNames.forEach(name => {
        const wins = playerWinsByWeek[week][name] || 0;
        totalWins[name] += wins;
        htmlStand += `<td>${wins}</td>`;
        });
        htmlStand += "</tr>";
    });

    // add totals row
    htmlStand += "<tr><td></td>";
    playerNames.forEach(name => {
        htmlStand += `<td>${totalWins[name]}</td>`;
    });
    htmlStand += "</tr>";

    htmlStand += "</tbody></table></div>";
    htmlStand += "<hr></hr>";

    // create team standings array
    const teamWins = {};      // { team_name: totalWins }
    const allTeams = new Set();

    standingsData.forEach(row => {
        const team = row.team_name;
        const pick = row.pick;
        const winner = row.winning_team;

        if (!team) return;
        allTeams.add(team);

        if (!teamWins[team]) teamWins[team] = 0;

        if (winner && pick === winner) {
            teamWins[team] += 1;
        }
    });

    const teamNames = Array.from(allTeams);

    // build team standings table
    let htmlTeams = "<h3 class='week-title'>Team Standings</h3>";
    htmlTeams += `<div class="table-container"><table id="teamStandings">`;
    htmlTeams += "<thead><tr>";

    teamNames.forEach(team => {
        htmlTeams += `<th>${team}</th>`;
    });

    htmlTeams += "</tr></thead><tbody><tr>";

    teamNames.forEach(team => {
        htmlTeams += `<td>${teamWins[team] || 0}</td>`;
    });

    htmlTeams += "</tr></tbody></table></div>";
    htmlTeams += "<hr>";

    // append new table
    htmlStand += htmlTeams;

    return htmlStand;
}

function setupSubmitButton(playerId) {
    document.getElementById("submitBtn").addEventListener("click", async () => {
    submitBtn.disabled = true;
    submitBtn.textContent = "Wait..."
    const radioButtons = document.querySelectorAll("input[type='radio']:checked");
    if (radioButtons.length === 0) {
        alert("Please make at least one pick!");
        submitBtn.disabled = false;
        submitBtn.textContent = "Submit";
        return;
    }
    const picks = Array.from(radioButtons).map(rb => ({
        dk_game_id: rb.dataset.gameId,
        pick: rb.value,
        player_id: playerId,
    }));
    const response = await fetch("/api/save-picks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ picks }),
    });
    const result = await response.json();
    alert(result.message || "Picks saved!");
    submitBtn.disabled = false;
    submitBtn.textContent = "Submit";
    location.reload();
    });
}

// 
// main script begins here
// 
window.addEventListener("load", async() => {
    const username = localStorage.getItem("username");
    const playerId = localStorage.getItem("playerId");
    const teammate = localStorage.getItem("teammate");
    const loginModal = document.getElementById("loginModal");
    const spinner = document.getElementById("loadingMessage");
    const logoutBtn = document.getElementById("logoutBtn");

    // show login screen if player not logged in
    if(!username) {
        loginModal.style.display = "block";
        logoutBtn.style.display = "none";
        return;
    }
    loginModal.style.display = "none";

    // determine nflWeek
    const currentWeek = findNflWeek();
    const nflWeek = currentWeek.week;

    // does database contain games for nflWeek?
    spinner.style.display = "block";
    const weekRes = await fetch ("/api/is-week-in-db", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ nflWeek })
    })
    
    // if not, get the games
    const isWeek = await weekRes.json();
    if(!isWeek.success) {
        const getRes = await fetch ("/api/get-and-store-this-week-games", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({ currentWeek })
        })
        const getMsg = await getRes.json();
        alert(getMsg.message);
        console.log("requestsRemaining from games: ", getMsg.requestsRemaining);
        spinner.style.display = "none";
    }
    
    // has player made all picks in nflWeek?
    spinner.style.display = "block";
    const picksRes = await fetch ("/api/get-games-left-to-pick", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ playerId: playerId, currentWeek })
    })
    const gamesToPick = await picksRes.json();
   
    // has teammate made all picks in nflWeek?
    const teammatePicksRes = await fetch ("/api/get-games-left-to-pick", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ playerId: teammate, currentWeek })
    })
    const teammateGamesToPick = await teammatePicksRes.json();

    // get the div ready for screen display
    const displayDiv = document.getElementById("displayDiv");

    // show picks table if player & teammate have made picks...
    if(gamesToPick.length === 0 && teammateGamesToPick.length === 0) {
        wantToUpdateScores = confirm("Click OK to update all games scores or Cancel to skip");
        const picksTableRes = await fetch ("/api/build-picks-table-html", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({ 
                currentWeek,
                wantToUpdateScores
            })
    })
    const picksTableData = await picksTableRes.json();
    const latestScores = picksTableData.scoresData;
    const latestWins = picksTableData.winsData;
    const allPlayers = picksTableData.allPlayers;
    const requestsRemaining = picksTableData.requestsRemaining;
    console.log("requestsRemaining from scores: ", requestsRemaining);
    const winsPicksTable = buildWinsAndPicksHtml(latestScores, latestWins, allPlayers);
    const winsPicksHtmlWrap = document.createElement('div');
    winsPicksHtmlWrap.innerHTML = winsPicksTable;
    displayDiv.appendChild(winsPicksHtmlWrap);
    spinner.style.display = "none";
    
    // or show picks to make for player if there are some to pick...
    } else if (gamesToPick.length > 0) {
        const returnPTMH = buildPicksToMakeHtml(gamesToPick);
        const PTMHtmlWrap = document.createElement('div');
        PTMHtmlWrap.innerHTML = returnPTMH;
        displayDiv.appendChild(PTMHtmlWrap);
        spinner.style.display = "none";
        setupSubmitButton(playerId);
    // or alert that teammate hasn't picked yet
    } else {
        alert("Your teammate has yet to submit picks");
    } 

    // show add season standings table
    try {
        const standingsRes = await fetch("/api/build-season-standings-html");
        const standingsData = await standingsRes.json();

        if (!Array.isArray(standingsData)) {
            throw new Error("Invalid standings data");
        }
        const seasonStandingsTable = buildSeasonStandingsHtml(standingsData);
        const seasonStandingsHtmlWrap = document.createElement('div');
        seasonStandingsHtmlWrap.innerHTML = seasonStandingsTable;
        displayDiv.appendChild(seasonStandingsHtmlWrap);
        spinner.style.display = "none";
        } catch (err) {
            alert("Error loading standings: " + err.message);
        } 

});

// on 'login' button click
document.getElementById("loginBtn").addEventListener("click", async () => {
    const inputEmail = document.getElementById("inputEmail").value;
    const inputPassword = document.getElementById("inputPassword").value;

    const loginRes = await fetch("/api/login-logic", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ inputEmail, inputPassword })
    });

    const data = await loginRes.json();
    if (!loginRes.ok) {
        document.getElementById("loginError").textContent = data.error;
        return;
    }

    localStorage.setItem("username", data.player.username);
    localStorage.setItem("playerId", data.player.player_id);
    localStorage.setItem("teammate", data.player.teammate);
    document.getElementById("loginModal").style.display = "none";
    location.reload();
});

// on 'logout' button click
document.getElementById("logoutBtn").addEventListener("click", () => {
  localStorage.removeItem("username");
  localStorage.removeItem("playerId");
  localStorage.removeItem("teammate");
  location.reload();
  document.getElementById("loginModal").style.display = "block";
});

