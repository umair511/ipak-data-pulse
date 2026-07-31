import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async generate(query: any) {
    const { plant, reportType, section, machine, shift, dateFrom, dateTo } = query;
    const where: any = {};
    if (plant) where.plantName = plant;
    if (section) where.section = section;
    if (machine) where.machineName = machine;
    if (shift) where.shift = shift;

    if (reportType === 'Target') {
      const targetWhere: any = {};
      if (plant) targetWhere.plantName = plant;
      if (dateFrom && dateTo) targetWhere.targetDate = { gte: dateFrom, lte: dateTo };
      const entryWhere: any = {};
      if (plant) entryWhere.plantName = plant;
      if (dateFrom && dateTo) entryWhere.entryDate = { gte: dateFrom, lte: dateTo };

      const targets = await this.prisma.target.findMany({ where: targetWhere, orderBy: { targetDate: 'asc' } });
      const entries = await this.prisma.productionEntry.findMany({ where: entryWhere });
      const results = targets.map(t => {
        const matching = entries.filter(e => e.entryDate === t.targetDate && e.machineName === t.machineName && e.shift === t.shift);
        const actual = matching.reduce((s, e) => s + e.productionTons, 0);
        return { ...t, actual, achievement: t.dailyTargetTons > 0 ? (actual / t.dailyTargetTons * 100) : 0 };
      });
      return { ok: true, data: results };
    }

    if (dateFrom && dateTo) where.entryDate = { gte: dateFrom, lte: dateTo };

    const entries = await this.prisma.productionEntry.findMany({ where, orderBy: { entryDate: 'desc' } });
    let data: any[] = [];

    switch (reportType) {
      case 'Overall Production':
        data = entries.map(e => ({ date: e.entryDate, machine: e.machineName, film: e.filmCodeName, production: e.productionTons, waste: e.wasteTons, wastePercent: e.wastePercent || (e.productionTons > 0 ? (e.wasteTons / e.productionTons * 100) : 0) }));
        break;
      case 'Film-wise Production': {
        const filmMap = new Map<string, { production: number; waste: number }>();
        entries.forEach(e => { const cur = filmMap.get(e.filmCodeName) || { production: 0, waste: 0 }; cur.production += e.productionTons; cur.waste += e.wasteTons; filmMap.set(e.filmCodeName, cur); });
        data = Array.from(filmMap.entries()).map(([film, v]) => ({ film, ...v }));
        break;
      }
      case 'Machine-wise Production': {
        const mMap = new Map<string, { section: string; production: number }>();
        entries.forEach(e => { const cur = mMap.get(e.machineName) || { section: e.section, production: 0 }; cur.production += e.productionTons; mMap.set(e.machineName, cur); });
        data = Array.from(mMap.entries()).map(([machine, v]) => ({ machine, ...v }));
        break;
      }
      case 'Waste':
        data = entries.map(e => ({ date: e.entryDate, machine: e.machineName, production: e.productionTons, waste: e.wasteTons, wastePercent: e.wastePercent || (e.productionTons > 0 ? (e.wasteTons / e.productionTons * 100) : 0) }));
        break;
      case 'Downtime':
        data = entries.filter(e => e.downtimeMinutes > 0).map(e => ({ date: e.entryDate, machine: e.machineName, downtimeHours: e.downtimeMinutes / 60, reason: e.downtimeReasonLabel || 'Unknown' }));
        break;
      case 'Settings':
        data = entries.filter(e => e.section === 'Slitter').map(e => ({ date: e.entryDate, machine: e.machineName, settings: e.numberOfSettings || 0 }));
        break;
      case 'Cycles':
        data = entries.filter(e => e.section === 'Metallizer').map(e => ({ date: e.entryDate, machine: e.machineName, film: e.filmCodeName, cycles: e.numberOfCycles || 0 }));
        break;
      default:
        data = entries;
    }

    return { ok: true, data };
  }
}
