// api/runs.js
import axios from "axios";

export default async function handler(req, res) {
  try {
    const client_id = process.env.STRAVA_CLIENT_ID;
    const client_secret = process.env.STRAVA_CLIENT_SECRET;
    const refresh_token = process.env.STRAVA_REFRESH_TOKEN;

    // Refresh access token
    const tokenResponse = await axios.post("https://www.strava.com/oauth/token", null, {
      params: {
        client_id,
        client_secret,
        refresh_token,
        grant_type: "refresh_token",
      },
    });

    const access_token = tokenResponse.data.access_token;

    // Fetch activities
    const activitiesRes = await axios.get("https://www.strava.com/api/v3/athlete/activities", {
      headers: { Authorization: `Bearer ${access_token}` },
      params: { per_page: 50 }, // limit for now
    });

    res.setHeader("Content-Type", "application/json");
    res.status(200).json(activitiesRes.data);
  } catch (err) {
    console.error("Strava fetch error:", err.response?.data || err.message);
    res.status(500).json({ error: "Failed to fetch activities" });
  }
}
