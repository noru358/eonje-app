import { mkdir, stat, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const target = join(ROOT, 'public', 'assets', 'hanriver-spring-sunset.png');
const source = 'https://d8j0ntlcm91z4.cloudfront.net/user_3IUSVXbiZ0tsNqdqqpOsx4mWnu0/hf_20260902_091335_c0b42e8b-cf7e-432d-abba-295ff689b902.png';

async function hasUsableAsset(){
  try { return (await stat(target)).size > 200_000; } catch { return false; }
}

if (await hasUsableAsset()) {
  console.log('design asset ready → public/assets/hanriver-spring-sunset.png');
  process.exit(0);
}

try {
  await mkdir(dirname(target), { recursive:true });
  const response = await fetch(source, { signal:AbortSignal.timeout(20_000) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length < 200_000) throw new Error(`asset too small: ${bytes.length}`);
  await writeFile(target, bytes);
  console.log(`design asset downloaded → ${(bytes.length/1024/1024).toFixed(1)} MB`);
} catch (error) {
  console.warn(`design asset download failed; SVG fallback will be used: ${error.message}`);
}
