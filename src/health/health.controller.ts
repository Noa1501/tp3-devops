import { Controller, Get, Res } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import Redis from 'ioredis';

@Controller()
export class HealthController {
  private redis?: Redis;

  constructor(
    @InjectDataSource() private dataSource: DataSource,
    private config: ConfigService,
  ) {
    const redisUrl = this.config.get<string>('REDIS_URL');
    if (redisUrl) {
      this.redis = new Redis(redisUrl);
    }
  }

  @Get('health')
  async health(@Res() res: Response) {
    const result: any = { status: 'healthy', timestamp: new Date().toISOString() };

    try {
      await this.dataSource.query('SELECT 1');
      result.database = 'connected';
    } catch {
      result.status = 'unhealthy';
      result.database = 'disconnected';
    }

    if (!this.redis) {
      result.status = 'unhealthy';
      result.cache = 'disconnected';
    } else {
      try {
        await this.redis.ping();
        result.cache = 'connected';
      } catch {
        result.status = 'unhealthy';
        result.cache = 'disconnected';
      }
    }

    res.status(result.status === 'healthy' ? 200 : 503).json(result);
  }
}