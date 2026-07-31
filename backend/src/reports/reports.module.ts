import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { AuditLogService } from '../common/services/audit-log.service';

@Module({
  controllers: [ReportsController],
  providers: [ReportsService, AuditLogService],
})
export class ReportsModule {}
