import { redis } from '../lib/redis';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');

  try {
    const scores = await redis.get<Record<string, any>>('live:scores');
    const events = await redis.get<Record<string, any>>('live:events');
    return res.status(200).json({
      scores:   scores  ?? {},
      events:   events  ?? {},
      ts:       Date.now(),
    });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
}
