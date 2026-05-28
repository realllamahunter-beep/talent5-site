import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
  try {
    const url = new URL(req.url, 'https://localhost');
    const code = url.searchParams.get('code');
    const uid = url.searchParams.get('uid');
    const counter = url.searchParams.get('counter');

    if (!code || !uid || !counter) {
      return res.status(400).json({ valid: false, error: 'Missing parameters' });
    }

    const data = await redis.get(`talent5:code:${code}`);
    if (!data) {
      return res.status(200).json({ valid: false, reason: 'invalid_code' });
    }

    if (data.uid !== uid || data.counter !== parseInt(counter)) {
      return res.status(200).json({ valid: false, reason: 'tampered' });
    }

    if (data.used) {
      return res.status(200).json({ valid: false, reason: 'already_used' });
    }

    data.used = true;
    await redis.set(`talent5:code:${code}`, data, { ex: 600 });

    return res.status(200).json({ valid: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ valid: false, error: e.message });
  }
}