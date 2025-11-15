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

// main script begins here
window.addEventListener("load", async() => {
    const username = localStorage.getItem("username");
    const loginModal = document.getElementById("loginModal");

    // show login screen if player not logged in
    if(!username) {
        loginModal.style.display = "block";
        return;
    }
    loginModal.style.display = "none";

    // determine nfl_week
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
        const allWeekGames = await fetch ("/api/get-and-store-this-week-games", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({ currentWeek })
        })
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