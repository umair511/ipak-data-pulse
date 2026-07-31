import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { FilmCodesService } from './film-codes.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('film-codes')
export class FilmCodesController {
  constructor(private svc: FilmCodesService) {}

  @Get()
  list(@Query('plantId') plantId?: string) { return this.svc.list(plantId); }

  @Get('filtered')
  filtered(@Query('plantId') plantId?: string) { return this.svc.list(plantId); }

  @Post()
  create(@Body() body: any) { return this.svc.create(body); }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) { return this.svc.update(id, body); }

  @Delete(':id')
  delete(@Param('id') id: string) { return this.svc.delete(id); }

  @Post('bulk')
  bulk(@Body() body: any) { return this.svc.bulk(body); }
}
