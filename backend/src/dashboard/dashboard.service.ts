import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async kpis(query: any) {
    const where: any = {};
    if (query.plant) where.plantName = query.plant;
    if (query.dateFrom && query.dateTo) where.entryDate = { gte: query.dateFrom, lte: query.dateTo };

    const entries = await this.prisma.productionEntry.findMany({ where });
    const totalProd = entries.reduce((s, e) => s + e.productionTons, 0);
    const totalWaste = entries.reduce((s, e) => s + e.wasteTons, 0);
    const totalDowntime = entries.reduce((s, e) => s + e.downtimeMinutes, 0);
    const totalSettings = entries.reduce((s, e) => s + (e.numberOfSettings || 0), 0);
    const totalCycles = entries.reduce((s, e) => s + (e.numberOfCycles || 0), 0);

    const sections = ['Film Line', 'Slitter', 'Metallizer'];
    const sectionKpis = sections.map(section => {
      const secEntries = entries.filter(e => e.section === section);
      const secProd = secEntries.reduce((s, e) => s + e.productionTons, 0);
      const secWaste = secEntries.reduce((s, e) => s + e.wasteTons, 0);
      const secDt = secEntries.reduce((s, e) => s + e.downtimeMinutes, 0);
      const secSettings = secEntries.reduce((s, e) => s + (e.numberOfSettings || 0), 0);
      const secCycles = secEntries.reduce((s, e) => s + (e.numberOfCycles || 0), 0);
      return {
        section,
        production: secProd,
        waste: secWaste,
        wastePercent: secProd > 0 ? (secWaste / secProd * 100) : 0,
        downtimeHours: secDt / 60,
        settings: secSettings,
        cycles: secCycles,
      };
    });

    return { ok: true, total: { production: totalProd, waste: totalWaste, downtimeHours: totalDowntime / 60, settings: totalSettings, cycles: totalCycles }, sections: sectionKpis };
  }

  async dispatchKpis(query: any) {
    const whereMonth: any = {};
    const whereYesterday: any = {};
    if (query.plant) { whereMonth.plantName = query.plant; whereYesterday.plantName = query.plant; }
    if (query.monthDateFrom && query.monthDateTo) whereMonth.dispatchDate = { gte: query.monthDateFrom, lte: query.monthDateTo };
    if (query.yesterdayDate) whereYesterday.dispatchDate = { gte: query.yesterdayDate, lte: query.yesterdayDate };

    const [monthRows, yestRows] = await Promise.all([
      this.prisma.dispatch.findMany({ where: whereMonth }),
      this.prisma.dispatch.findMany({ where: whereYesterday }),
    ]);

    const sumByType = (rows: any[]) => {
      const total = rows.reduce((s, r) => s + r.quantityTons, 0);
      const exportTons = rows.filter(r => r.dispatchType === 'Export').reduce((s, r) => s + r.quantityTons, 0);
      const localTons = rows.filter(r => r.dispatchType === 'Local').reduce((s, r) => s + r.quantityTons, 0);
      return { total, exportTons, localTons };
    };

    return { ok: true, month: sumByType(monthRows), yesterday: sumByType(yestRows) };
  }
}
