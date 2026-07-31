import { Module } from '@nestjs/common';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import { AuditLogService } from '../common/services/audit-log.service';

@Module({
  controllers: [CustomersController],
  providers: [CustomersService, AuditLogService],
})
export class CustomersModule {}
