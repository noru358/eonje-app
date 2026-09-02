import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const target = join(ROOT, 'public', 'assets', 'hanriver-spring-sunset.png');
const source = 'https://d8j0ntlcm91z4.cloudfront.net/user_3IUSVXbiZ0tsNqdqqpOsx4mWnu0/hf_20260902_091335_c0b42e8b-cf7e-432d-abba-295ff689b902.png';
const EXPECTED_SHA256 = '8f9bc95005bad23a493e3fdb6ca86fa94ba89fa54fe0a1d462804c0f8b152f5f';
const EXPECTED_WIDTH = 2752;
const EXPECTED_HEIGHT = 1536;

function sha256(bytes){ return createHash('sha256').update(bytes).digest('hex'); }
function pngDimensions(bytes){
  if(bytes.length < 24 || bytes.subarray(1,4).toString('ascii') !== 'PNG') throw new Error('not a PNG');
  return {width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20)};
}
function validate(bytes){
  const hash=sha256(bytes);
  const {width,height}=pngDimensions(bytes);
  if(hash!==EXPECTED_SHA256) throw new Error(`unexpected asset hash: ${hash}`);
  if(width!==EXPECTED_WIDTH||height!==EXPECTED_HEIGHT) throw new Error(`unexpected asset dimensions: ${width}x${height}`);
  return {hash,width,height};
}

try {
  const existing=await readFile(target);
  const meta=validate(existing);
  console.log(`design asset verified → ${meta.width}x${meta.height} sha256:${meta.hash.slice(0,12)}`);
  process.exit(0);
} catch {}

await mkdir(dirname(target),{recursive:true});
const response=await fetch(source,{signal:AbortSignal.timeout(20_000)});
if(!response.ok) throw new Error(`design asset download failed: HTTP ${response.status}`);
const bytes=Buffer.from(await response.arrayBuffer());
const meta=validate(bytes);
await writeFile(target,bytes);
console.log(`design asset downloaded+verified → ${(bytes.length/1024/1024).toFixed(1)} MB ${meta.width}x${meta.height} sha256:${meta.hash.slice(0,12)}`);
