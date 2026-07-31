import { Module } from '@nestjs/common';
import { ExportQuantitiesController } from './export-quantities.controller';
import { ExportQuantitiesService } from './export-quantities.service';

@Module({
  controllers: [ExportQuantitiesController],
  providers: [ExportQuantitiesService],
})
export class ExportQuantitiesModule {}
