import { spawn } from 'node:child_process';
import { closeSync, openSync } from 'node:fs';
import net from 'node:net';

const OUTPUT_PATH = process.env.EONJE_QC_OUTPUT || 'live-qc.json';
const LOG_PATH = process.env.EONJE_QC_SERVER_LOG || 'live-qc-server.log';
const ALLOW_DEMO = process.argv.includes('--allow-demo');

function reservePort() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const port = probe.address().port;
      probe.close((error) => error ? reject(error) : resolve(port));
    });
  });
}

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, options);
    child.once('error', reject);
    child.once('exit', (code, signal) => resolve({ code, signal }));
  });
}

async function waitForHealth(url, timeoutMs = 20_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${url}/api/health`, { signal:AbortSignal.timeout(1_000) });
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`server did not become healthy within ${timeoutMs}ms; inspect ${LOG_PATH}`);
}

const port = await reservePort();
const baseUrl = `http://127.0.0.1:${port}`;
const logFd = openSync(LOG_PATH, 'w');
const server = spawn(process.execPath, ['server.mjs'], {
  env:{ ...process.env, PORT:String(port) },
  stdio:['ignore', logFd, logFd]
});
const serverDone = new Promise((resolve) => server.once('exit', resolve));

let exitCode = 1;
try {
  await waitForHealth(baseUrl);
  const qcArgs = ['scripts/live-qc.mjs', '--output', OUTPUT_PATH];
  if (ALLOW_DEMO) qcArgs.push('--allow-demo');
  const result = await run(process.execPath, qcArgs, {
    env:{ ...process.env, EONJE_BASE_URL:baseUrl },
    stdio:'inherit'
  });
  exitCode = result.code ?? 1;
  if (exitCode === 0) console.log(`Live QC report: ${OUTPUT_PATH}`);
} finally {
  if (server.exitCode === null) server.kill('SIGTERM');
  await serverDone;
  closeSync(logFd);
}

process.exitCode = exitCode;
