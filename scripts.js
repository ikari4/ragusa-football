// scripts.js

// ***function needs to be updated each year***
function findNflWeek() {
    const today = new Date();

    // Build UTC dates from US Eastern (handles DST correctly)
    function getEasternDateUTC(year, month, day, hourEastern) {
      const local = new Date(Date.UTC(year, month, day, hourEastern));
      const easternStr = local.toLocaleString("en-US", { timeZone: "America/New_York" });
      const easternDate = new Date(easternStr);
      const offsetMillis = easternDate.getTime() - local.getTime();
      return new Date(local.getTime() - offsetMillis);
    }

    // Build week ranges
    const nflWeeks = Array.from({ length: 18 }, (_, i) => {
      const week = i + 1;

      // Week 1 begins Tuesday Sept 2 2025 @ 3 PM Eastern (month 8 = September)
      const start = getEasternDateUTC(2025, 8, 2 + i * 7, 15);

      // End = 3 PM Eastern of the following Tuesday minus 1 ms
      const end = new Date(getEasternDateUTC(2025, 8, 2 + (i + 1) * 7, 15) - 1);

      return { week, start, end };
    });

    // Find the current week using UTC (server time)
    const currentWeek = nflWeeks.find(w => today >= w.start && today <= w.end);
    if (!currentWeek) {
      return res.status(400).json({ error: "Not within NFL season" });
    }
    return currentWeek;
};

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

    const isWeek = await weekRes.json();
    if(!isWeek.success) {
        const getStoreRes = await fetch ("/api/get-and-store-this-week-games", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({ currentWeek })
        })
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

