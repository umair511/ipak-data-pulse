import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private svc: AnalyticsService) {}

  @Get('production')
  production(@Query() q: any) { return this.svc.production(q); }

  @Get('downtime')
  downtime(@Query() q: any) { return this.svc.downtime(q); }

  @Get('film-wise')
  filmWise(@Query() q: any) { return this.svc.filmWise(q); }

  @Get('machine-wise')
  machineWise(@Query() q: any) { return this.svc.machineWise(q); }

  @Get('settings')
  settings(@Query() q: any) { return this.svc.settings(q); }

  @Get('cycles')
  cycles(@Query() q: any) { return this.svc.cycles(q); }

  @Get('target-machines')
  targetMachines(@Query() q: any) { return this.svc.targetMachines(q); }

  @Get('target')
  target(@Query() q: any) { return this.svc.target(q); }

  @Get('export-plant-wise')
  exportPlantWise(@Query() q: any) { return this.svc.exportPlantWise(q); }

  @Get('dispatch-plant-wise')
  dispatchPlantWise(@Query() q: any) { return this.svc.dispatchPlantWise(q); }
}
