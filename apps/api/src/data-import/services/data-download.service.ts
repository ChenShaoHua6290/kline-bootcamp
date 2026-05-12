import { Injectable } from '@nestjs/common';
import { CommandRunnerService } from './command-runner.service';

@Injectable()
export class DataDownloadService {
  constructor(private readonly runner: CommandRunnerService) {}

  async downloadBinance(startMonth: string, endMonth: string, symbols?: string[], interval?: string) {
    const env: Record<string, string> = {};
    if (symbols && symbols.length > 0) env.DATA_IMPORT_SYMBOLS = symbols.join(',');
    if (interval) env.DATA_IMPORT_INTERVAL = interval;
    const result = await this.runner.run(
      'npm',
      ['run', 'data:download-binance', '--', '--start', startMonth, '--end', endMonth],
      Object.keys(env).length > 0 ? env : undefined,
    );
    const parsed = this.runner.parseLastJsonObject(result.output);
    if (result.code !== 0) {
      throw new Error(parsed?.errorMessage || result.output || 'download failed');
    }
    return parsed;
  }
}
