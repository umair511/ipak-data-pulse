import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PackingCostsService {
  constructor(private prisma: PrismaService) {}

  async list(query: any) {
    const where: any = {};
    if (query.plantName) where.plantName = query.plantName;
    if (query.dateFrom && query.dateTo) where.costMonth = { gte: query.dateFrom, lte: query.dateTo };
    const items = await this.prisma.packingCost.findMany({ where, orderBy: { costMonth: 'desc' } });
    return { ok: true, items };
  }

  async create(body: any) {
    const item = await this.prisma.packingCost.create({ data: body });
    return { ok: true, item };
  }

  async update(id: string, body: any) {
    const item = await this.prisma.packingCost.update({ where: { id }, data: body });
    return { ok: true, item };
  }

  async delete(id: string) {
    await this.prisma.packingCost.delete({ where: { id } });
    return { ok: true };
  }
}
