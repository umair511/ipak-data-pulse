import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TargetsService {
  constructor(private prisma: PrismaService) {}

  async list(query: any) {
    const where: any = {};
    if (query.plantName) where.plantName = query.plantName;
    if (query.machineName) where.machineName = query.machineName;
    if (query.shift) where.shift = query.shift;
    if (query.dateFrom && query.dateTo) where.targetDate = { gte: query.dateFrom, lte: query.dateTo };
    else if (query.targetDate) where.targetDate = query.targetDate;
    const items = await this.prisma.target.findMany({ where, orderBy: { targetDate: 'desc' } });
    return { ok: true, items };
  }

  async create(body: any) {
    const item = await this.prisma.target.create({ data: body });
    return { ok: true, item };
  }

  async update(id: string, body: any) {
    const item = await this.prisma.target.update({ where: { id }, data: body });
    return { ok: true, item };
  }

  async delete(id: string) {
    await this.prisma.target.delete({ where: { id } });
    return { ok: true };
  }
}
