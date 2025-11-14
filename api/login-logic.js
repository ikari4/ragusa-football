// .api/login-logic.js
// Take input from login form, checks database, saves player info to local storage

import { createClient } from "@libsql/client";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { inputEmail, inputPassword } = req.body;
  if (!inputEmail || !inputPassword) {
    return res.status(400).json({ error: "email and password required"});
  }

  const client = createClient ({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  try {
    const result = await client.execute({
        sql: "SELECT player_id, username, email, password, teammate FROM players WHERE email = ? LIMIT 1",
        args: [inputEmail]
    });

    const user = result.rows[0];
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    if (inputPassword !== user.password) {
        return res.status(401).json({ error: "Invalid credentials" });
    }

    delete user.player_pw;

    return res.status(200).json({ player: user });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }

}