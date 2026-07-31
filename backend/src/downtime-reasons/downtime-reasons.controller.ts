import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { DowntimeReasonsService } from './downtime-reasons.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('downtime-reasons')
export class DowntimeReasonsController {
  constructor(private svc: DowntimeReasonsService) {}

  @Get()
  list() { return this.svc.list(); }

  @Post()
  create(@Body() body: any) { return this.svc.create(body); }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) { return this.svc.update(id, body); }

  @Delete(':id')
  delete(@Param('id') id: string) { return this.svc.delete(id); }
}
