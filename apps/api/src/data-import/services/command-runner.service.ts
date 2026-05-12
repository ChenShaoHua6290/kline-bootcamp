import { Injectable } from '@nestjs/common';
import { spawn } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

@Injectable()
export class CommandRunnerService {
  private resolveRepoRoot(): string {
    let dir = process.cwd();
    for (let i = 0; i < 8; i += 1) {
      const pkg = path.join(dir, 'package.json');
      if (fs.existsSync(pkg)) {
        try {
          const json = JSON.parse(fs.readFileSync(pkg, 'utf-8')) as { workspaces?: unknown; name?: string };
          if (Array.isArray(json.workspaces) || json.name === 'kline-bootcamp') return dir;
        } catch {
          // noop
        }
      }
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
    return process.cwd();
  }

  run(command: string, args: string[], env?: NodeJS.ProcessEnv): Promise<{ code: number; output: string }> {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        cwd: this.resolveRepoRoot(),
        env: { ...process.env, ...(env ?? {}) },
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let out = '';
      let err = '';
      child.stdout.on('data', (d) => {
        out += String(d);
      });
      child.stderr.on('data', (d) => {
        err += String(d);
      });
      child.on('error', reject);
      child.on('close', (code) => {
        const merged = `${out}\n${err}`.trim();
        resolve({ code: code ?? 1, output: merged });
      });
    });
  }

  parseLastJsonObject(text: string): any {
    const trimmed = text.trim();
    const idx = trimmed.lastIndexOf('{');
    if (idx < 0) return null;
    const slice = trimmed.slice(idx);
    try {
      return JSON.parse(slice);
    } catch {
      return null;
    }
  }
}
