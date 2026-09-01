import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const [inputArg, outputArg] = process.argv.slice(2);
if (!inputArg || !outputArg) throw new Error('usage: node scripts/import-live-fixture.mjs INPUT.jsonl OUTPUT.json');

const records = (await readFile(resolve(inputArg), 'utf8'))
  .split(/\r?\n/)
  .filter(Boolean)
  .map((line) => JSON.parse(line));
const latest = new Map();
for (const record of records) {
  const id = record?.place?.id;
  if (!id) continue;
  const prior = latest.get(id);
  if (!prior || new Date(record.capturedAt) > new Date(prior.capturedAt)) latest.set(id, record);
}

const expected = ['yeouido', 'banpo', 'ttukseom', 'mangwon', 'jamsil', 'ichon'];
if (expected.some((id) => !latest.has(id))) throw new Error('fixture must contain the latest record for all six parks');
const fixture = {
  capturedFrom:'live snapshot; normalized public Seoul/KMA data; no API keys',
  records:expected.map((id) => {
    const { capturedAt, ...record } = latest.get(id);
    return record;
  })
};
const output = resolve(outputArg);
await mkdir(dirname(output), { recursive:true });
await writeFile(output, `${JSON.stringify(fixture, null, 2)}\n`, 'utf8');
console.log(`Wrote ${fixture.records.length} records to ${outputArg}`);
