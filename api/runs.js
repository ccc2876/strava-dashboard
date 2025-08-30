import axios from "axios";
import fs from "fs";
import path from "path";

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
let cachedData = null;
let lastFetch = 0;
require('dotenv').config();

const TOKEN_PATH = path.join(process.cwd(), "strava_token.json");

// Load refresh token from file or environment
function loadRefreshToken() {
  if (fs.existsSync(TOKEN_PATH)) {
    const data = JSON.parse(fs.readFileSync(TOKEN_PATH, "utf-8"));
    return data.refresh_token;
  }
  // fallback to env
  return process.env.STRAVA_REFRESH_TOKEN;
}

// Save new refresh token
function saveRefreshToken(refresh_token) {
  fs.writeFileSync(TOKEN_PATH, JSON.stringify({ refresh_token }, null, 2));
}

export default async function handler(req, res) {
  try {
    const now = Date.now();

    if (!cachedData || now - lastFetch > CACHE_DURATION) {
      console.log("Fetching new data from Strava...");

      const refresh_token = loadRefreshToken();

      // 1️⃣ Exchange refresh token for access token
      const tokenResponse = await axios.post("https://www.strava.com/oauth/token", null, {
        params: {
          client_id: process.env.STRAVA_CLIENT_ID,
          client_secret: process.env.STRAVA_CLIENT_SECRET,
          refresh_token,
          grant_type: "refresh_token",
        },
      });

      const { access_token, refresh_token: newRefreshToken } = tokenResponse.data;

      // 2️⃣ Save new refresh token automatically
      saveRefreshToken(newRefreshToken);

      // 3️⃣ Fetch activities
      const activitiesRes = await axios.get(
        "https://www.strava.com/api/v3/athlete/activities",
        {
          headers: { Authorization: `Bearer ${access_token}` },
          params: { per_page: 200 },
        }
      );

      cachedData = activitiesRes.data;
      lastFetch = now;
    }

    res.status(200).json(cachedData);
  } catch (err) {
    console.error("Strava fetch error:", err.response?.data || err.message);
    res.status(500).json({ error: "Failed to fetch activities" });
  }
}
