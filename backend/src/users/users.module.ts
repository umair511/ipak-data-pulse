import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { AuditLogService } from '../common/services/audit-log.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService, AuditLogService],
  exports: [UsersService],
})
export class UsersModule {}
