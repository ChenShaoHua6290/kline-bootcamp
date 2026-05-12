import * as fs from 'node:fs';
import * as fsp from 'node:fs/promises';
import * as path from 'node:path';
import unzipper from 'unzipper';

const ROOT = process.cwd();
const RAW_ROOT = path.join(ROOT, 'data', 'raw');
const OUT_ROOT = path.join(ROOT, 'data', 'unzipped');

async function walkZipFiles(dir: string): Promise<string[]> {
  const out: string[] = [];
  if (!fs.existsSync(dir)) return out;
  const entries = await fsp.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walkZipFiles(full)));
    else if (entry.isFile() && entry.name.toLowerCase().endsWith('.zip')) out.push(full);
  }
  return out;
}

function toOutputDir(zipPath: string): string {
  const rel = path.relative(RAW_ROOT, path.dirname(zipPath));
  return path.join(OUT_ROOT, rel);
}

function expectedCsvPath(zipPath: string): string {
  const name = path.basename(zipPath, '.zip');
  return path.join(toOutputDir(zipPath), `${name}.csv`);
}

async function unzipOne(zipPath: string, outDir: string) {
  await fsp.mkdir(outDir, { recursive: true });
  const stream = fs.createReadStream(zipPath).pipe(unzipper.Extract({ path: outDir }));
  await new Promise<void>((resolve, reject) => {
    stream.on('close', () => resolve());
    stream.on('error', reject);
  });
}

async function main() {
  const zipFiles = await walkZipFiles(RAW_ROOT);
  const skipped: string[] = [];
  const success: string[] = [];
  const failed: Array<{ zip: string; error: string }> = [];

  for (const zipPath of zipFiles) {
    const csvPath = expectedCsvPath(zipPath);
    if (fs.existsSync(csvPath)) {
      skipped.push(zipPath);
      continue;
    }
    const outDir = toOutputDir(zipPath);
    try {
      await unzipOne(zipPath, outDir);
      success.push(zipPath);
    } catch (err) {
      failed.push({ zip: zipPath, error: err instanceof Error ? err.message : String(err) });
    }
  }

  console.log(
    JSON.stringify(
      {
        zipCount: zipFiles.length,
        successCount: success.length,
        skipCount: skipped.length,
        failCount: failed.length,
        success,
        skipped,
        failed,
      },
      null,
      2,
    ),
  );

  if (failed.length > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error('[data:unzip] failed', err);
  process.exit(1);
});
