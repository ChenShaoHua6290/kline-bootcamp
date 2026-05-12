import { Injectable } from '@nestjs/common';
import { CommandRunnerService } from './command-runner.service';

@Injectable()
export class DataVerifyService {
  constructor(private readonly runner: CommandRunnerService) {}

  async verifyAll() {
    const env = process.env.DATABASE_URL ? { DATABASE_URL: process.env.DATABASE_URL } : undefined;
    const result = await this.runner.run('npm', ['run', 'data:verify'], env);
    const parsed = this.runner.parseLastJsonObject(result.output);
    if (result.code !== 0) throw new Error(parsed?.errorMessage || result.output || 'verify failed');
    return parsed;
  }
}
