import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProductionService {
  constructor(private prisma: PrismaService) {}

  async list(query: any) {
    const where: any = {};
    if (query.plantName) where.plantName = query.plantName;
    if (query.section) where.section = query.section;
    if (query.machineName) where.machineName = query.machineName;
    if (query.shift) where.shift = query.shift;
    if (query.entryDate) {
      if (query.dateFrom && query.dateTo) where.entryDate = { gte: query.dateFrom, lte: query.dateTo };
      else where.entryDate = query.entryDate;
    } else if (query.dateFrom && query.dateTo) {
      where.entryDate = { gte: query.dateFrom, lte: query.dateTo };
    }
    const items = await this.prisma.productionEntry.findMany({ where, orderBy: { entryDate: 'desc' } });
    return { ok: true, items };
  }

  async create(body: any) {
    const item = await this.prisma.productionEntry.create({ data: body });
    return { ok: true, item };
  }

  async update(id: string, body: any) {
    const item = await this.prisma.productionEntry.update({ where: { id }, data: body });
    return { ok: true, item };
  }

  async delete(id: string) {
    await this.prisma.productionEntry.delete({ where: { id } });
    return { ok: true };
  }
}
