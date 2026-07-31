import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  private buildWhere(query: any, dateField = 'entryDate') {
    const where: any = {};
    if (query.plant) where.plantName = query.plant;
    if (query.section) where.section = query.section;
    if (query.dateFrom && query.dateTo) where[dateField] = { gte: query.dateFrom, lte: query.dateTo };
    return where;
  }

  async production(query: any) {
    const where = this.buildWhere(query);
    const entries = await this.prisma.productionEntry.findMany({ where, orderBy: { entryDate: 'asc' } });
    const dailyMap = new Map<string, { production: number; waste: number }>();
    const monthlyMap = new Map<string, { production: number; waste: number }>();

    entries.forEach(e => {
      const d = e.entryDate;
      const m = d.substring(0, 7);
      const cur = dailyMap.get(d) || { production: 0, waste: 0 };
      cur.production += e.productionTons; cur.waste += e.wasteTons; dailyMap.set(d, cur);
      const mon = monthlyMap.get(m) || { production: 0, waste: 0 };
      mon.production += e.productionTons; mon.waste += e.wasteTons; monthlyMap.set(m, mon);
    });

    return { ok: true, daily: Array.from(dailyMap.entries()).map(([date, v]) => ({ date, ...v })), monthly: Array.from(monthlyMap.entries()).map(([month, v]) => ({ month, ...v })) };
  }

  async downtime(query: any) {
    const where = this.buildWhere(query);
    where.downtimeMinutes = { gt: 0 };
    const entries = await this.prisma.productionEntry.findMany({ where, orderBy: { entryDate: 'asc' } });

    const reasonMap = new Map<string, number>();
    const dailyMap = new Map<string, number>();
    entries.forEach(e => {
      const label = e.downtimeReasonLabel || 'Unknown';
      reasonMap.set(label, (reasonMap.get(label) || 0) + e.downtimeMinutes);
      dailyMap.set(e.entryDate, (dailyMap.get(e.entryDate) || 0) + e.downtimeMinutes);
    });

    const reasons = Array.from(reasonMap.entries())
      .map(([reason, minutes]) => ({ reason, minutes, hours: minutes / 60 }))
      .sort((a, b) => b.minutes - a.minutes);

    const daily = Array.from(dailyMap.entries())
      .map(([date, minutes]) => ({ date, downtimeHours: minutes / 60 }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const monthlyMap = new Map<string, number>();
    daily.forEach(d => { const m = d.date.substring(0, 7); monthlyMap.set(m, (monthlyMap.get(m) || 0) + d.downtimeHours); });
    const monthly = Array.from(monthlyMap.entries()).map(([month, downtimeHours]) => ({ month, downtimeHours }));

    return { ok: true, reasons, daily, monthly };
  }

  async filmWise(query: any) {
    const where = this.buildWhere(query);
    const entries = await this.prisma.productionEntry.findMany({ where, orderBy: { entryDate: 'asc' } });

    const filmMap = new Map<string, { production: number; waste: number }>();
    entries.forEach(e => {
      const cur = filmMap.get(e.filmCodeName) || { production: 0, waste: 0 };
      cur.production += e.productionTons; cur.waste += e.wasteTons; filmMap.set(e.filmCodeName, cur);
    });
    const films = Array.from(filmMap.entries()).map(([film, v]) => ({ film, ...v }));

    const dailyFilmMap = new Map<string, Map<string, number>>();
    entries.forEach(e => {
      if (!dailyFilmMap.has(e.entryDate)) dailyFilmMap.set(e.entryDate, new Map());
      const dayMap = dailyFilmMap.get(e.entryDate)!;
      dayMap.set(e.filmCodeName, (dayMap.get(e.filmCodeName) || 0) + e.productionTons);
    });
    const daily = Array.from(dailyFilmMap.entries()).map(([date, fm]) => {
      const row: any = { date }; fm.forEach((v, k) => { row[k] = v; }); return row;
    });
    const filmsList = [...new Set(entries.map(e => e.filmCodeName))];

    return { ok: true, films, daily, filmsList };
  }

  async machineWise(query: any) {
    const where = this.buildWhere(query);
    const entries = await this.prisma.productionEntry.findMany({ where, orderBy: { entryDate: 'asc' } });

    const machineMap = new Map<string, { section: string; production: number }>();
    entries.forEach(e => {
      const cur = machineMap.get(e.machineName) || { section: e.section, production: 0 };
      cur.production += e.productionTons; machineMap.set(e.machineName, cur);
    });
    const machines = Array.from(machineMap.entries()).map(([machine, v]) => ({ machine, ...v }));

    const dailyMachineMap = new Map<string, Map<string, number>>();
    entries.forEach(e => {
      if (!dailyMachineMap.has(e.entryDate)) dailyMachineMap.set(e.entryDate, new Map());
      const dayMap = dailyMachineMap.get(e.entryDate)!;
      dayMap.set(e.machineName, (dayMap.get(e.machineName) || 0) + e.productionTons);
    });
    const daily = Array.from(dailyMachineMap.entries()).map(([date, mMap]) => {
      const row: any = { date }; mMap.forEach((v, k) => { row[k] = v; }); return row;
    });
    const machinesList = [...new Set(entries.map(e => e.machineName))];

    return { ok: true, machines, daily, machinesList };
  }

  async settings(query: any) {
    const where = this.buildWhere(query);
    where.section = 'Slitter';
    const entries = await this.prisma.productionEntry.findMany({ where, orderBy: { entryDate: 'asc' } });

    const dailyMap = new Map<string, number>();
    const machineDailyMap = new Map<string, Map<string, number>>();
    entries.forEach(e => {
      dailyMap.set(e.entryDate, (dailyMap.get(e.entryDate) || 0) + (e.numberOfSettings || 0));
      if (!machineDailyMap.has(e.machineName)) machineDailyMap.set(e.machineName, new Map());
      const mDay = machineDailyMap.get(e.machineName)!;
      mDay.set(e.entryDate, (mDay.get(e.entryDate) || 0) + (e.numberOfSettings || 0));
    });

    const daily = Array.from(dailyMap.entries()).map(([date, settings]) => ({ date, settings }));
    const monthlyMap = new Map<string, number>();
    daily.forEach(d => { const m = d.date.substring(0, 7); monthlyMap.set(m, (monthlyMap.get(m) || 0) + d.settings); });
    const monthly = Array.from(monthlyMap.entries()).map(([month, settings]) => ({ month, settings }));

    const machinesList = [...new Set(entries.map(e => e.machineName))];
    const byMachine = machinesList.map((machine: string) => {
      const mMap = machineDailyMap.get(machine) || new Map();
      return { machine, daily: Array.from(mMap.entries()).map(([date, settings]) => ({ date, settings })) };
    });

    return { ok: true, daily, monthly, byMachine, machinesList };
  }

  async cycles(query: any) {
    const where = this.buildWhere(query);
    where.section = 'Metallizer';
    const entries = await this.prisma.productionEntry.findMany({ where, orderBy: { entryDate: 'asc' } });

    const dailyMap = new Map<string, number>();
    entries.forEach(e => { dailyMap.set(e.entryDate, (dailyMap.get(e.entryDate) || 0) + (e.numberOfCycles || 0)); });
    const daily = Array.from(dailyMap.entries()).map(([date, cycles]) => ({ date, cycles }));
    const monthlyMap = new Map<string, number>();
    daily.forEach(d => { const m = d.date.substring(0, 7); monthlyMap.set(m, (monthlyMap.get(m) || 0) + d.cycles); });
    const monthly = Array.from(monthlyMap.entries()).map(([month, cycles]) => ({ month, cycles }));

    return { ok: true, daily, monthly };
  }

  async targetMachines(query: any) {
    const where: any = {};
    if (query.plant) where.plantName = query.plant;
    const targets = await this.prisma.target.findMany({ where, select: { machineName: true }, distinct: ['machineName'] });
    return { ok: true, machines: targets.map(t => t.machineName).sort() };
  }

  async target(query: any) {
    const targetWhere: any = {};
    const prodWhere: any = {};
    if (query.plant) { targetWhere.plantName = query.plant; prodWhere.plantName = query.plant; }
    if (query.machine) { targetWhere.machineName = query.machine; prodWhere.machineName = query.machine; }
    if (query.dateFrom && query.dateTo) { targetWhere.targetDate = { gte: query.dateFrom, lte: query.dateTo }; prodWhere.entryDate = { gte: query.dateFrom, lte: query.dateTo }; }

    const targets = await this.prisma.target.findMany({ where: targetWhere, orderBy: { targetDate: 'asc' } });
    const entries = await this.prisma.productionEntry.findMany({ where: prodWhere });

    const actualMap = new Map<string, number>();
    entries.forEach(e => { const key = `${e.entryDate}|${e.machineName}|${e.shift}`; actualMap.set(key, (actualMap.get(key) || 0) + e.productionTons); });

    const enriched = targets.map(t => {
      const key = `${t.targetDate}|${t.machineName}|${t.shift}`;
      const actual = actualMap.get(key) || 0;
      return { ...t, actual, achievement: t.dailyTargetTons > 0 ? (actual / t.dailyTargetTons * 100) : 0 };
    });

    const dailyMap = new Map<string, { target: number; actual: number }>();
    enriched.forEach(t => {
      const cur = dailyMap.get(t.targetDate) || { target: 0, actual: 0 };
      cur.target += t.dailyTargetTons; cur.actual += t.actual; dailyMap.set(t.targetDate, cur);
    });
    const daily = Array.from(dailyMap.entries())
      .map(([date, v]) => ({ date, target: v.target, actual: v.actual, achievement: v.target > 0 ? (v.actual / v.target * 100) : 0 }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const monthlyMap = new Map<string, { target: number; actual: number }>();
    daily.forEach(d => {
      const m = d.date.substring(0, 7);
      const cur = monthlyMap.get(m) || { target: 0, actual: 0 };
      cur.target += d.target; cur.actual += d.actual; monthlyMap.set(m, cur);
    });
    const monthly = Array.from(monthlyMap.entries())
      .map(([month, v]) => ({ month, target: v.target, actual: v.actual, achievement: v.target > 0 ? (v.actual / v.target * 100) : 0 }));

    return { ok: true, daily, monthly, targets: enriched };
  }

  async exportPlantWise(query: any) {
    const allRecords = await this.prisma.exportQuantity.findMany({ orderBy: { exportDate: 'asc' }, select: { plantName: true, exportDate: true, exportQuantityTons: true } });
    const filtered = query.month ? allRecords.filter(r => r.exportDate.startsWith(query.month)) : allRecords;
    const plantMap = new Map<string, number>();
    filtered.forEach(r => { plantMap.set(r.plantName, (plantMap.get(r.plantName) || 0) + r.exportQuantityTons); });
    const plantData = Array.from(plantMap.entries()).map(([plant, tons]) => ({ plant, tons }));
    const months = [...new Set(allRecords.map(r => r.exportDate.substring(0, 7)))].sort().reverse();
    return { ok: true, plantData, months, total: plantData.reduce((s, p) => s + p.tons, 0) };
  }

  async dispatchPlantWise(query: any) {
    const where: any = {};
    if (query.dispatchType) where.dispatchType = query.dispatchType;
    const allRecords = await this.prisma.dispatch.findMany({ where, orderBy: { dispatchDate: 'asc' }, select: { plantName: true, dispatchDate: true, quantityTons: true } });
    const filtered = query.month ? allRecords.filter(r => r.dispatchDate.startsWith(query.month)) : allRecords;
    const plantMap = new Map<string, number>();
    filtered.forEach(r => { plantMap.set(r.plantName, (plantMap.get(r.plantName) || 0) + r.quantityTons); });
    const plantData = Array.from(plantMap.entries()).map(([plant, tons]) => ({ plant, tons }));
    const months = [...new Set(allRecords.map(r => r.dispatchDate.substring(0, 7)))].sort().reverse();
    return { ok: true, plantData, months, total: plantData.reduce((s, p) => s + p.tons, 0) };
  }
}
