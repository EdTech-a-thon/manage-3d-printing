import { spawn } from 'node:child_process';
await import('./setup-pocketbase.mjs');

function run(command, args, options = {}) {
  return spawn(command, args, { stdio: 'inherit', ...options });
}

const app = run('bun', ['x', 'vite', '--host', '0.0.0.0', '--port', '8000']);

process.on('SIGINT', () => app.kill('SIGTERM'));
process.on('SIGTERM', () => app.kill('SIGTERM'));
