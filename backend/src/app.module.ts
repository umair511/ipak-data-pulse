import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { MachinesModule } from './machines/machines.module';
import { FilmCodesModule } from './film-codes/film-codes.module';
import { ProductionModule } from './production/production.module';
import { TargetsModule } from './targets/targets.module';
import { DispatchModule } from './dispatch/dispatch.module';
import { ExportQuantitiesModule } from './export-quantities/export-quantities.module';
import { PackingCostsModule } from './packing-costs/packing-costs.module';
import { CustomersModule } from './customers/customers.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { ReportsModule } from './reports/reports.module';
import { PermissionsModule } from './permissions/permissions.module';
import { AuditModule } from './audit/audit.module';
import { DowntimeReasonsModule } from './downtime-reasons/downtime-reasons.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    MachinesModule,
    FilmCodesModule,
    DowntimeReasonsModule,
    ProductionModule,
    TargetsModule,
    DispatchModule,
    ExportQuantitiesModule,
    PackingCostsModule,
    CustomersModule,
    DashboardModule,
    AnalyticsModule,
    ReportsModule,
    PermissionsModule,
    AuditModule,
  ],
})
export class AppModule {}
