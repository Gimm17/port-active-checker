import { spawn } from 'node:child_process';
import http from 'node:http';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const electronEntry = join(root, 'dist-electron', 'main', 'main.js');

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: root,
      stdio: 'inherit',
      shell: true,
      ...options
    });
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${command} ${args.join(' ')} exited with ${code}`));
    });
  });
}

function spawnLong(command, args, env = {}) {
  const child = spawn(command, args, {
    cwd: root,
    stdio: 'inherit',
    shell: true,
    env: {
      ...process.env,
      ...env
    }
  });
  return child;
}

function waitForUrl(url, timeoutMs = 20000) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      const request = http.get(url, (response) => {
        response.resume();
        resolve();
      });
      request.on('error', () => {
        if (Date.now() - started > timeoutMs) {
          reject(new Error(`Timed out waiting for ${url}`));
          return;
        }
        setTimeout(tick, 250);
      });
    };
    tick();
  });
}

await run('npm', ['run', 'build:electron']);

if (!existsSync(electronEntry)) {
  throw new Error('Electron entry was not compiled.');
}

const vite = spawnLong('npx', ['vite', '--host', '127.0.0.1']);

try {
  await waitForUrl('http://127.0.0.1:5173');
  const electron = spawnLong('npx', ['electron', '.'], {
    VITE_DEV_SERVER_URL: 'http://127.0.0.1:5173'
  });

  electron.on('exit', (code) => {
    vite.kill();
    process.exit(code ?? 0);
  });
} catch (error) {
  vite.kill();
  throw error;
}
