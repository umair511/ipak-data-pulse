import { Module } from '@nestjs/common';
import { PackingCostsController } from './packing-costs.controller';
import { PackingCostsService } from './packing-costs.service';

@Module({
  controllers: [PackingCostsController],
  providers: [PackingCostsService],
})
export class PackingCostsModule {}
