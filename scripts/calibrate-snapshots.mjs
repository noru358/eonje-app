import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pairAqForecasts, pairCrowdForecasts, summarizeAqPairs, summarizeCrowdPairs } from '../src/calibration.mjs';

const paths = process.argv.slice(2).filter((arg) => !arg.startsWith('--'));
if (!paths.length) {
  console.error('Usage: node scripts/calibrate-snapshots.mjs <snapshot.jsonl> [more.jsonl ...]');
  process.exit(2);
}

async function readRecords(path) {
  const text = await readFile(resolve(path), 'utf8');
  return text.split(/\r?\n/).filter(Boolean).map((line, index) => {
    try { return JSON.parse(line); }
    catch (error) { throw new Error(`${path}:${index + 1}: ${error.message}`); }
  });
}

const records = (await Promise.all(paths.map(readRecords))).flat();
const aqPairs = pairAqForecasts(records);
const crowdPairs = pairCrowdForecasts(records);

const report = {
  generatedAt:new Date().toISOString(),
  files:paths,
  records:records.length,
  aq:{
    matchedPairs:aqPairs.length,
    byLeadTime:summarizeAqPairs(aqPairs)
  },
  crowd:{
    matchedPairs:crowdPairs.length,
    byLeadTime:summarizeCrowdPairs(crowdPairs)
  },
  note:'Metrics are observational calibration diagnostics only. Do not change public scoring until sample sizes cover multiple dates, parks, and lead-time buckets.'
};

console.log(JSON.stringify(report, null, 2));
