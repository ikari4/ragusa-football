// scripts.js

// ***this function needs to be updated each year***
function findNflWeek() {
    const today = new Date();
    const nflWeeks = Array.from({ length: 18 }, (_, i) => {
        const week = i + 1;

        // Week 1 start = Tuesday Sept 2, 2025 @ 3:00 PM Eastern
        const start = new Date(2025, 8, 2 + i * 7, 15, 0, 0);

        // Week end = following Tuesday 2:59:59 PM Eastern
        const end = new Date(2025, 8, 2 + (i + 1) * 7, 14, 59, 59);

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
    let htmlToPick = `<h3>Week ${week}</h3>`;
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

            htmlToPick += `
            <div class="game">  
                <div class="team-row">
                <label class="team-option">
                    <input type="radio" name="game-${nameAttr}" value="${g.away_team}" data-game-id="${gameId}">
                    ${g.away_team} ${spreadDisplay}
                </label>
                </div>
                <div class="at">@</div>
                <div class="team-row">
                <label class="team-option">
                    <input type="radio" name="game-${nameAttr}" value="${g.home_team}" data-game-id="${gameId}">
                    ${g.home_team}
                </label>
                </div>
            </div>
            <hr>
            `;
        });
        // loadingEl.style.display = "none";


    }

    htmlToPick += `<button id="submitBtn">Submit</button>`;
    return htmlToPick;
}

function buildWinsAndPicksHtml(latestScores, latestWins, allPlayers) {
    const week = latestScores[0]?.nfl_week;
    let htmlWP = `<h3>Week ${week}</h3>`;
    htmlWP += `<div><table>`;
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
        const edate = new Date(game.game_date).toDateString();
        const dateOnly = edate.split("T")[0];
        if (!acc[dateOnly]) acc[dateOnly] = [];
        acc[dateOnly].push(game);
        return acc;
    }, {});

    // build HTML tables for each date group
    for (const [date, games] of Object.entries(gamesByDate)) {
    
        // get all player usernames from the first game's picks array
        const playerHeaders = games[0].picks.map(p => `<th>${p.username}</th>`).join("");

        let tableHTML = `
            <table>
            <thead>
                <tr>
                    <th colspan="${5 + games[0].picks.length}">${date}</th>
                </tr>
                <tr>
                    <th>Away Team</th>
                    <th>Away Score</th>
                    <th>Spread</th>
                    <th>Home Score</th>
                    <th>Home Team</th>
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

            tableHTML += `
            <tr>
                <td class="${awayWinner ? "winner" : ""}">${game.away_team}</td>
                <td>${game.away_score ?? 0}</td>
                <td>${game.spread}</td>
                <td>${game.home_score ?? 0}</td>
                <td class="${homeWinner ? "winner" : ""}">${game.home_team}</td>
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

    // show login screen if player not logged in
    if(!username) {
        loginModal.style.display = "block";
        return;
    }
    loginModal.style.display = "none";

    // determine nflWeek
    const currentWeek = findNflWeek();
    const nflWeek = currentWeek.week;

    // does database contain games for nflWeek?
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
    }
    
    // has player made all picks in nflWeek?
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
        const picksTableRes = await fetch ("/api/build-picks-table-html", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({ currentWeek })
    })
    const picksTableData = await picksTableRes.json();
    const latestScores = picksTableData.scoresData;
    const latestWins = picksTableData.winsData;
    const allPlayers = picksTableData.allPlayers;
    const winsPicksTable = buildWinsAndPicksHtml(latestScores, latestWins, allPlayers);
    const winsPicksHtmlWrap = document.createElement('div');
    winsPicksHtmlWrap.innerHTML = winsPicksTable;
    displayDiv.appendChild(winsPicksHtmlWrap);
    
    // or show picks to make for player if there are some to pick...
    } else if (gamesToPick.length > 0) {
        const returnPTMH = buildPicksToMakeHtml(gamesToPick);
        const PTMHtmlWrap = document.createElement('div');
        PTMHtmlWrap.innerHTML = returnPTMH;
        displayDiv.appendChild(PTMHtmlWrap);
        setupSubmitButton(playerId);
    // or alert that teammate hasn't picked yet
    } else {
        alert("Your teammate has yet to submit picks");
    } 


    // ***add season standings table


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

