import { Module } from '@nestjs/common';
import { PermissionsController } from './permissions.controller';
import { PermissionsService } from './permissions.service';
import { AuditLogService } from '../common/services/audit-log.service';

@Module({
  controllers: [PermissionsController],
  providers: [PermissionsService, AuditLogService],
})
export class PermissionsModule {}
