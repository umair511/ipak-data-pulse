import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { PackingCostsService } from './packing-costs.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('packing-costs')
export class PackingCostsController {
  constructor(private svc: PackingCostsService) {}

  @Get()
  list(@Query() query: any) { return this.svc.list(query); }

  @Post()
  create(@Body() body: any) { return this.svc.create(body); }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) { return this.svc.update(id, body); }

  @Delete(':id')
  delete(@Param('id') id: string) { return this.svc.delete(id); }
}
