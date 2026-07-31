import { Module } from '@nestjs/common';
import { DispatchController } from './dispatch.controller';
import { DispatchService } from './dispatch.service';
import { AuditLogService } from '../common/services/audit-log.service';

@Module({
  controllers: [DispatchController],
  providers: [DispatchService, AuditLogService],
})
export class DispatchModule {}
