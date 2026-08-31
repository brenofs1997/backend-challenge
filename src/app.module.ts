import { Module } from '@nestjs/common';
import { HealthController } from './interfaces/http/health/health.controller';

@Module({
  controllers: [HealthController],
})
export class AppModule {}
