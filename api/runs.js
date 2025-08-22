import axios from "axios";

let cachedData = null;
let lastFetch = 0;

export default async function handler(req, res) {
  try {
    const now = Date.now();

    // Refresh every 5 minutes (300000 ms)
    if (!cachedData || now - lastFetch > 5 * 60 * 1000) {
      console.log("Fetching new data from Strava...");

      // 1. Refresh access token
      const tokenResponse = await axios.post("https://www.strava.com/oauth/token", null, {
        params: {
          client_id: process.env.STRAVA_CLIENT_ID,
          client_secret: process.env.STRAVA_CLIENT_SECRET,
          refresh_token: process.env.STRAVA_REFRESH_TOKEN,
          grant_type: "refresh_token",
        },
      });

      const access_token = tokenResponse.data.access_token;

      // 2. Fetch activities
      const activitiesRes = await axios.get(
        "https://www.strava.com/api/v3/athlete/activities",
        {
          headers: { Authorization: `Bearer ${access_token}` },
          params: { per_page: 200 }, // grab up to 200 activities
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
