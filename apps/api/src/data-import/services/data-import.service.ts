import { Injectable } from '@nestjs/common';
import { CommandRunnerService } from './command-runner.service';

@Injectable()
export class DataImportService {
  constructor(private readonly runner: CommandRunnerService) {}

  async importAll(symbols?: string[]) {
    const env: Record<string, string> = {};
    if (process.env.DATABASE_URL) env.DATABASE_URL = process.env.DATABASE_URL;
    if (symbols && symbols.length > 0) env.DATA_IMPORT_SYMBOLS = symbols.join(',');
    const result = await this.runner.run('npm', ['run', 'data:import'], env);
    const parsed = this.runner.parseLastJsonObject(result.output);
    if (result.code !== 0) throw new Error(parsed?.errorMessage || result.output || 'import failed');
    return parsed;
  }
}
