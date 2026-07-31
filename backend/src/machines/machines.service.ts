import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MachinesService {
  constructor(private prisma: PrismaService) {}

  async list(plantId?: string, plantName?: string) {
    const where: any = {};
    if (plantId) where.plantId = plantId;
    if (plantName) where.plantName = plantName;
    const items = await this.prisma.machine.findMany({ where, orderBy: { machineName: 'asc' } });
    return { ok: true, items };
  }

  async create(body: any) {
    const item = await this.prisma.machine.create({ data: body });
    return { ok: true, item };
  }

  async update(id: string, body: any) {
    const item = await this.prisma.machine.update({ where: { id }, data: body });
    return { ok: true, item };
  }

  async delete(id: string) {
    await this.prisma.machine.delete({ where: { id } });
    return { ok: true };
  }
}
