import { Module } from '@nestjs/common';
import { DowntimeReasonsController } from './downtime-reasons.controller';
import { DowntimeReasonsService } from './downtime-reasons.service';

@Module({
  controllers: [DowntimeReasonsController],
  providers: [DowntimeReasonsService],
})
export class DowntimeReasonsModule {}
