import { Injectable } from '@nestjs/common';
import { CommandRunnerService } from './command-runner.service';

@Injectable()
export class DataNormalizeService {
  constructor(private readonly runner: CommandRunnerService) {}

  async normalizeAll(symbols?: string[]) {
    const env = symbols && symbols.length > 0 ? { DATA_IMPORT_SYMBOLS: symbols.join(',') } : undefined;
    const result = await this.runner.run('npm', ['run', 'data:normalize'], env);
    const parsed = this.runner.parseLastJsonObject(result.output);
    if (result.code !== 0) throw new Error(parsed?.errorMessage || result.output || 'normalize failed');
    return parsed;
  }
}
