import axios from 'axios';
import fs from 'fs';
import path from 'path';

const REFRESH_TOKEN = process.env.STRAVA_REFRESH_TOKEN;
const CLIENT_ID = process.env.STRAVA_CLIENT_ID;
const CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET;

let accessToken = null;

async function refreshAccessToken() {
  const res = await axios.post('https://www.strava.com/oauth/token', null, {
    params: {
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: REFRESH_TOKEN,
    },
  });
  accessToken = res.data.access_token;
}

async function fetchActivities() {
  if (!accessToken) await refreshAccessToken();
  const res = await axios.get('https://www.strava.com/api/v3/athlete/activities', {
    headers: { Authorization: `Bearer ${accessToken}` },
    params: { per_page: 200 },
  });
  const activities = res.data;

  const filePath = path.join(process.cwd(), 'public', 'runs.json');
  fs.writeFileSync(filePath, JSON.stringify(activities, null, 2));

  return activities;
}

export default async function handler(req, res) {
  try {
    const activities = await fetchActivities();
    res.status(200).json(activities);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch activities' });
  }
}
