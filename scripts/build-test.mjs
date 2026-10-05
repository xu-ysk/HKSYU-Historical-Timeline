import { spawnSync } from 'node:child_process';
import process from 'node:process';

const command = process.platform === 'win32' ? process.env.ComSpec ?? 'cmd.exe' : 'npm';
const args = process.platform === 'win32' ? ['/d', '/s', '/c', 'npm run build'] : ['run', 'build'];
const result = spawnSync(command, args, {
  stdio: 'inherit',
  env: { ...process.env, VITE_TIMELINE_SOURCE: 'mock' },
});
if (result.error) throw result.error;
process.exit(result.status ?? 1);
