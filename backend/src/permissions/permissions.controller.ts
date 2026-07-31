import { Controller, Get, Put, Body, Param, UseGuards } from '@nestjs/common';
import { PermissionsService } from './permissions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('permissions')
export class PermissionsController {
  constructor(private svc: PermissionsService) {}

  @Get('all')
  getAll() { return this.svc.getAll(); }

  @Get(':userId')
  get(@Param('userId') userId: string) { return this.svc.get(userId); }

  @Put(':userId')
  set(@Param('userId') userId: string, @Body() body: any) { return this.svc.set(userId, body); }

  @Get(':userId/plants')
  getPlants(@Param('userId') userId: string) { return this.svc.getPlants(userId); }

  @Put(':userId/plants')
  setPlants(@Param('userId') userId: string, @Body() body: any) { return this.svc.setPlants(userId, body); }
}
