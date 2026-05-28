import { createDecipheriv } from 'crypto';
import { Redis } from '@upstash/redis';

const keyHex = process.env.NTAG_KEY || '00000000000000000000000000000000';
const keyBuffer = Buffer.from(keyHex, 'hex');

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
  const url = new URL(req.url, 'https://localhost');
  const allPicc = url.searchParams.getAll('picc_data');
  const piccData = allPicc[allPicc.length - 1];

  if (!piccData || piccData === 'PICC_DATA') {
    try {
      await redis.set('talent5:test', 'ok');
      const val = await redis.get('talent5:test');
      return res.status(200).json({
        mode: 'redis-test',
        redisOk: val === 'ok',
        keyFirst6: keyHex.substring(0, 6),
        keyLast6: keyHex.slice(-6),
        upstashUrlSet: !!process.env.UPSTASH_REDIS_REST_URL,
      });
    } catch (e) {
      return res.status(200).json({ mode: 'redis-test', redisError: e.message });
    }
  }

  try {
    const piccBuffer = Buffer.from(piccData, 'hex');
    const decipher = createDecipheriv('aes-128-ecb', keyBuffer, null);
    decipher.setAutoPadding(false);
    let plain = Buffer.concat([decipher.update(piccBuffer), decipher.final()]);
    if (plain.length < 11) throw new Error('too short');
    const uid = plain.slice(1, 8).toString('hex');
    const counter = plain.readUIntLE(8, 3);

    return res.status(200).json({
      mode: 'decrypt',
      uid,
      counter,
      keyFirst6: keyHex.substring(0, 6),
      keyLast6: keyHex.slice(-6),
    });
  } catch (e) {
    return res.status(200).json({ mode: 'decrypt', error: e.message });
  }
}