import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('audit')
export class AuditController {
  constructor(private svc: AuditService) {}

  @Get()
  list(@Query() query: any) { return this.svc.list(query); }

  @Get('stats')
  stats() { return this.svc.stats(); }

  @Get('user/:userId')
  byUser(@Param('userId') userId: string, @Query('limit') limit?: string) { return this.svc.byUser(userId, limit); }

  @Get('module/:module')
  byModule(@Param('module') module: string, @Query('limit') limit?: string) { return this.svc.byModule(module, limit); }
}
