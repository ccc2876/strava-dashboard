import axios from 'axios';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    // Strava verification challenge
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === process.env.STRAVA_VERIFY_TOKEN) {
      console.log('Webhook verification requested:', { mode, token, challenge });
      res.status(200).json({ 'hub.challenge': challenge });
    } else {
      console.error('Webhook verification failed:', { mode, token });
      res.status(403).send('Forbidden');
    }
  } else if (req.method === 'POST') {
    // Handle webhook event
    const event = req.body;
    if (event.object_type === 'activity' && event.aspect_type === 'create') {
      const deployHook = process.env.VERCEL_DEPLOY_HOOK_URL;
      try {
        await axios.post(deployHook);
        console.log('Deploy triggered for new activity:', event);
      } catch (err) {
        console.error('Deploy trigger failed:', err);
      }
    }
    res.status(200).send('Event received');
  } else {
    res.status(405).send('Method Not Allowed');
  }
}