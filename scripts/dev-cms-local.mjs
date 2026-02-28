import { spawn } from 'node:child_process';

const children = [];
let shuttingDown = false;

function start(name, command, args, options = {}) {
  const child = spawn(command, args, {
    stdio: 'inherit',
    shell: true,
    ...options,
  });

  child.on('exit', (code, signal) => {
    if (shuttingDown) return;

    const reason = signal ? `signal ${signal}` : `code ${code ?? 0}`;
    console.error(`[dev:cms] ${name} exited with ${reason}`);
    shutdown(code ?? 1);
  });

  children.push(child);
  return child;
}

function shutdown(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;

  for (const child of children) {
    if (!child.killed) child.kill('SIGTERM');
  }

  setTimeout(() => process.exit(exitCode), 120);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

console.log('[dev:cms] Starting Decap proxy on http://localhost:8082');
start('decap-server', 'npx', ['decap-server'], {
  env: { ...process.env, PORT: '8082' },
});

console.log('[dev:cms] Starting Astro dev server');
start('astro dev', 'npm', ['run', 'dev']);
