import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private svc: DashboardService) {}

  @Get('kpis')
  kpis(@Query() query: any) { return this.svc.kpis(query); }

  @Get('dispatch-kpis')
  dispatchKpis(@Query() query: any) { return this.svc.dispatchKpis(query); }
}
