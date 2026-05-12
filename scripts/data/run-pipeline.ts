import { spawn } from 'node:child_process';

type CliArgs = {
  start: string;
  end: string;
};

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  let start = '';
  let end = '';

  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === '--start') start = args[i + 1] ?? '';
    if (args[i] === '--end') end = args[i + 1] ?? '';
  }

  if (!/^\d{4}-\d{2}$/.test(start) || !/^\d{4}-\d{2}$/.test(end)) {
    throw new Error('Usage: npm run data:pipeline -- --start YYYY-MM --end YYYY-MM');
  }

  return { start, end };
}

async function run(cmd: string, args: string[], stepName: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(cmd, args, {
      stdio: 'inherit',
      shell: false,
      env: process.env,
    });

    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${stepName} failed with exit code ${code}`));
      }
    });
  });
}

async function main() {
  const { start, end } = parseArgs();

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required for import/aggregate/verify');
  }

  const startedAt = Date.now();

  console.log(`[pipeline] start range=${start}..${end}`);

  await run('npm', ['run', 'data:download-binance', '--', '--start', start, '--end', end], 'download');
  await run('npm', ['run', 'data:unzip'], 'unzip');
  await run('npm', ['run', 'data:normalize'], 'normalize');
  await run('npm', ['run', 'data:import'], 'import');
  await run('npm', ['run', 'data:aggregate'], 'aggregate');
  await run('npm', ['run', 'data:verify'], 'verify');

  console.log(`[pipeline] done in ${Date.now() - startedAt}ms`);
}

main().catch((err) => {
  console.error('[data:pipeline] failed', err);
  process.exit(1);
});
