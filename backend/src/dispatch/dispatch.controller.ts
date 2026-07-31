import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { DispatchService } from './dispatch.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('dispatch')
export class DispatchController {
  constructor(private svc: DispatchService) {}

  @Get('list')
  list(@Query() query: any) { return this.svc.list(query); }

  @Get('report')
  report(@Query() query: any) { return this.svc.report(query); }

  @Get('analytics')
  analytics(@Query() query: any) { return this.svc.analytics(query); }

  @Get('report-summary')
  reportSummary(@Query() query: any) { return this.svc.reportSummary(query); }

  @Get('customers')
  customers(@Query() query: any) { return this.svc.customers(query); }

  @Post()
  create(@Body() body: any) { return this.svc.create(body); }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) { return this.svc.update(id, body); }

  @Delete(':id')
  delete(@Param('id') id: string) { return this.svc.delete(id); }

  @Post('bulk')
  bulk(@Body() body: any) { return this.svc.bulk(body); }
}
