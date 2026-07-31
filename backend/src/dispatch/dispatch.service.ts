import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../common/services/audit-log.service';

@Injectable()
export class DispatchService {
  constructor(private prisma: PrismaService, private audit: AuditLogService) {}

  async list(query: any) {
    const where: any = {};
    if (query.plantName) where.plantName = query.plantName;
    if (query.customerName) where.customerName = query.customerName;
    if (query.filmCodeName) where.filmCodeName = query.filmCodeName;
    if (query.dispatchType) where.dispatchType = query.dispatchType;
    if (query.dateFrom && query.dateTo) where.dispatchDate = { gte: query.dateFrom, lte: query.dateTo };
    const items = await this.prisma.dispatch.findMany({ where, orderBy: { dispatchDate: 'desc' } });
    return { ok: true, items };
  }

  async report(query: any) {
    const where: any = {};
    if (query.plant) where.plantName = query.plant;
    if (query.dateFrom && query.dateTo) where.dispatchDate = { gte: query.dateFrom, lte: query.dateTo };
    if (query.customer) where.customerName = query.customer;
    if (query.filmCode) where.filmCodeName = query.filmCode;
    if (query.dispatchType) where.dispatchType = query.dispatchType;

    let rows = await this.prisma.dispatch.findMany({ where, orderBy: { dispatchDate: 'desc' } });

    if (query.search) {
      const q = query.search.toLowerCase();
      rows = rows.filter((r: any) =>
        r.customerName.toLowerCase().includes(q) ||
        r.filmCodeName.toLowerCase().includes(q) ||
        r.dispatchDate.includes(q) ||
        r.dispatchType.toLowerCase().includes(q)
      );
    }

    if (query.sort) {
      const sortKey = query.sort;
      const order = query.order;
      rows.sort((a: any, b: any) => {
        const va = a[sortKey] ?? '';
        const vb = b[sortKey] ?? '';
        if (typeof va === 'number') return order === 'asc' ? va - vb : vb - va;
        return order === 'asc' ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
      });
    }

    return { ok: true, data: rows };
  }

  async analytics(query: any) {
    const where: any = {};
    if (query.plant) where.plantName = query.plant;
    if (query.dateFrom && query.dateTo) where.dispatchDate = { gte: query.dateFrom, lte: query.dateTo };
    if (query.dispatchType) where.dispatchType = query.dispatchType;

    const rows = await this.prisma.dispatch.findMany({ where });

    const dailyMap = new Map<string, number>();
    rows.forEach(r => dailyMap.set(r.dispatchDate, (dailyMap.get(r.dispatchDate) || 0) + r.quantityTons));
    const daily = Array.from(dailyMap.entries()).map(([date, tons]) => ({ date, tons })).sort((a, b) => a.date.localeCompare(b.date));

    const custMap = new Map<string, number>();
    rows.forEach(r => custMap.set(r.customerName, (custMap.get(r.customerName) || 0) + r.quantityTons));
    const customerWise = Array.from(custMap.entries()).map(([name, tons]) => ({ name, tons })).sort((a, b) => b.tons - a.tons);

    const filmMap = new Map<string, number>();
    rows.forEach(r => filmMap.set(r.filmCodeName, (filmMap.get(r.filmCodeName) || 0) + r.quantityTons));
    const filmWise = Array.from(filmMap.entries()).map(([name, tons]) => ({ name, tons })).sort((a, b) => b.tons - a.tons);

    const totalTons = rows.reduce((s, r) => s + r.quantityTons, 0);
    return { ok: true, daily, customerWise, filmWise, totalTons, totalRecords: rows.length };
  }

  async reportSummary(query: any) {
    const where: any = {};
    if (query.plant) where.plantName = query.plant;
    if (query.dateFrom && query.dateTo) where.dispatchDate = { gte: query.dateFrom, lte: query.dateTo };
    if (query.dispatchType) where.dispatchType = query.dispatchType;
    if (query.customer) where.customerName = query.customer;

    const rows = await this.prisma.dispatch.findMany({ where });
    const total = rows.reduce((s, r) => s + r.quantityTons, 0);
    const exportTons = rows.filter(r => r.dispatchType === 'Export').reduce((s, r) => s + r.quantityTons, 0);
    const localTons = rows.filter(r => r.dispatchType === 'Local').reduce((s, r) => s + r.quantityTons, 0);
    const uniqueCustomers = new Set(rows.map(r => r.customerName.toLowerCase())).size;

    const dailyMap = new Map<string, { exportTons: number; localTons: number }>();
    rows.forEach(r => {
      const cur = dailyMap.get(r.dispatchDate) || { exportTons: 0, localTons: 0 };
      if (r.dispatchType === 'Export') cur.exportTons += r.quantityTons;
      else cur.localTons += r.quantityTons;
      dailyMap.set(r.dispatchDate, cur);
    });
    const daily = Array.from(dailyMap.entries())
      .map(([date, v]) => ({ date, ...v, total: v.exportTons + v.localTons }))
      .sort((a, b) => a.date.localeCompare(b.date)).slice(-30);

    const custMap = new Map<string, { exportTons: number; localTons: number }>();
    rows.forEach(r => {
      const cur = custMap.get(r.customerName) || { exportTons: 0, localTons: 0 };
      if (r.dispatchType === 'Export') cur.exportTons += r.quantityTons;
      else cur.localTons += r.quantityTons;
      custMap.set(r.customerName, cur);
    });
    const customerWise = Array.from(custMap.entries())
      .map(([name, v]) => ({ name, ...v, total: v.exportTons + v.localTons }))
      .sort((a, b) => b.total - a.total);

    const dateMap = new Map<string, { exportTons: number; localTons: number }>();
    rows.forEach(r => {
      const cur = dateMap.get(r.dispatchDate) || { exportTons: 0, localTons: 0 };
      if (r.dispatchType === 'Export') cur.exportTons += r.quantityTons;
      else cur.localTons += r.quantityTons;
      dateMap.set(r.dispatchDate, cur);
    });
    const dateWise = Array.from(dateMap.entries())
      .map(([date, v]) => ({ date, ...v, total: v.exportTons + v.localTons }))
      .sort((a, b) => b.date.localeCompare(a.date));

    return { ok: true, total, exportTons, localTons, uniqueCustomers, recordCount: rows.length, daily, customerWise, dateWise };
  }

  async customers(query: any) {
    const where: any = {};
    if (query.plant) where.plantName = query.plant;
    const rows = await this.prisma.dispatch.findMany({ where, select: { customerName: true }, distinct: ['customerName'] });
    return { ok: true, items: rows.map(r => r.customerName).sort() };
  }

  async create(body: any) {
    const item = await this.prisma.dispatch.create({ data: body });
    return { ok: true, item };
  }

  async update(id: string, body: any) {
    const item = await this.prisma.dispatch.update({ where: { id }, data: body });
    return { ok: true, item };
  }

  async delete(id: string) {
    await this.prisma.dispatch.delete({ where: { id } });
    return { ok: true };
  }

  async bulk(body: { items: any[]; plantId?: string; plantName?: string; createdByName?: string }) {
    const { items, plantId, plantName, createdByName } = body;
    if (!Array.isArray(items) || items.length === 0) throw new BadRequestException('No items provided.');

    const created: any[] = [];
    const errors: { index: number; error: string }[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.customerName || !item.filmCodeId || !item.quantityTons || !item.dispatchDate) {
        errors.push({ index: i, error: `Row ${i + 1}: Missing required fields.` });
        continue;
      }
      try {
        const record = await this.prisma.dispatch.create({
          data: {
            dispatchDate: item.dispatchDate,
            customerName: item.customerName,
            filmCodeId: item.filmCodeId,
            filmCodeName: item.filmCodeName || '',
            quantityTons: parseFloat(item.quantityTons),
            dispatchType: item.dispatchType || 'Local',
            plantId: plantId || null,
            plantName: plantName || null,
            createdByName: createdByName || '',
          },
        });
        created.push(record);
      } catch (err: any) {
        errors.push({ index: i, error: `Row ${i + 1}: ${err.message}` });
      }
    }
    return { ok: true, created: created.length, errors, total: items.length };
  }
}
