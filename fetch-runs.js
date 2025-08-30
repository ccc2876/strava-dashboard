require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { kv } = require('@vercel/kv');

const CACHE_DURATION = 5 * 60 * 1000; // Not used at build time, but kept for consistency
let cachedData = null;
let lastFetch = 0;

const TOKEN_KEY = 'strava_refresh_token'; // Key for KV store

// Load refresh token from KV or fallback to env
async function loadRefreshToken() {
  const token = await kv.get(TOKEN_KEY);
  return token || process.env.STRAVA_REFRESH_TOKEN;
}

// Save new refresh token to KV
async function saveRefreshToken(refresh_token) {
  await kv.set(TOKEN_KEY, refresh_token);
}

async function fetchActivities() {
  try {
    const now = Date.now();

    // Always fetch fresh at build time (ignore cache)
    console.log("Fetching new data from Strava for build...");

    const refresh_token = await loadRefreshToken();

    // 1. Exchange refresh token for access token
    const tokenResponse = await axios.post("https://www.strava.com/oauth/token", null, {
      params: {
        client_id: process.env.STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        refresh_token,
        grant_type: "refresh_token",
      },
    });

    const { access_token, refresh_token: newRefreshToken } = tokenResponse.data;

    // 2. Save new refresh token
    await saveRefreshToken(newRefreshToken);

    // 3. Fetch activities (paginate if >200 activities)
    let allActivities = [];
    let page = 1;
    while (true) {
      const activitiesRes = await axios.get(
        "https://www.strava.com/api/v3/athlete/activities",
        {
          headers: { Authorization: `Bearer ${access_token}` },
          params: { per_page: 200, page },
        }
      );
      const data = activitiesRes.data;
      if (!data.length) break;
      allActivities = allActivities.concat(data);
      page++;
    }

    // Write to public/runs.json
    const outputPath = path.join(process.cwd(), 'public', 'runs.json');
    fs.writeFileSync(outputPath, JSON.stringify(allActivities, null, 2));
    console.log(`Generated public/runs.json with ${allActivities.length} activities`);

    return allActivities;
  } catch (err) {
    console.error("Strava fetch error:", err.response?.data || err.message);
    process.exit(1); // Fail the build if fetch fails
  }
}

// Run the fetch
fetchActivities();