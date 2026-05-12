import { Injectable } from '@nestjs/common';
import { CommandRunnerService } from './command-runner.service';

@Injectable()
export class DataUnzipService {
  constructor(private readonly runner: CommandRunnerService) {}

  async unzipAll() {
    const result = await this.runner.run('npm', ['run', 'data:unzip']);
    const parsed = this.runner.parseLastJsonObject(result.output);
    if (result.code !== 0) throw new Error(parsed?.errorMessage || result.output || 'unzip failed');
    return parsed;
  }
}
