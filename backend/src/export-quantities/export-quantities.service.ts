import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ExportQuantitiesService {
  constructor(private prisma: PrismaService) {}

  async list(query: any) {
    const where: any = {};
    if (query.plantName) where.plantName = query.plantName;
    if (query.dateFrom && query.dateTo) where.exportDate = { gte: query.dateFrom, lte: query.dateTo };
    const items = await this.prisma.exportQuantity.findMany({ where, orderBy: { exportDate: 'desc' } });
    return { ok: true, items };
  }

  async create(body: any) {
    const item = await this.prisma.exportQuantity.create({ data: body });
    return { ok: true, item };
  }

  async update(id: string, body: any) {
    const item = await this.prisma.exportQuantity.update({ where: { id }, data: body });
    return { ok: true, item };
  }

  async delete(id: string) {
    await this.prisma.exportQuantity.delete({ where: { id } });
    return { ok: true };
  }
}
