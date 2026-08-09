import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', { lazyConnect: true });

  async get(key: string) {
    try {
      await this.redis.connect();
      return await this.redis.get(key);
    } catch {
      return null;
    }
  }

  async set(key: string, value: string, ttlSec = 3600) {
    try {
      await this.redis.connect();
      await this.redis.set(key, value, 'EX', ttlSec);
    } catch {
      // fallback for MVP when redis is unavailable
    }
  }

  async onModuleDestroy() {
    if (this.redis.status === 'ready') {
      await this.redis.quit();
    }
  }
}
