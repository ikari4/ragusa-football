// scripts.js

window.addEventListener("load", async() => {
    const username = localStorage.getItem("username");
    const loginModal = document.getElementById("loginModal");

    // Show login screen if player not logged in
    if(!username) {
        loginModal.style.display = "block";
        return;
    }

    loginModal.style.display = "none";

});

// On 'login' button click
document.getElementById("loginBtn").addEventListener("click", async () => {
    const inputEmail = document.getElementById("inputEmail").value;
    const inputPassword = document.getElementById("inputPassword").value;

    const res = await fetch("/api/login-logic", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ inputEmail, inputPassword })
    });

    const data = await res.json();
    if (!res.ok) {
        document.getElementById("loginError").textContent = data.error;
        return;
    }

    localStorage.setItem("username", data.player.username);
    localStorage.setItem("playerId", data.player.player_id);
    localStorage.setItem("teammate", data.player.teammate);
    document.getElementById("loginModal").style.display = "none";
    location.reload();
});