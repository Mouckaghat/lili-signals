import { MATCH_LINEUPS, LINEUPS_LAST_UPDATED } from '../lib/lineupData';

export default function handler(_req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  // Lineup data changes at most every 30 min (sync cadence); cache for 5 min
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');

  return res.status(200).json({
    lineups:   MATCH_LINEUPS,
    updatedAt: LINEUPS_LAST_UPDATED,
  });
}
