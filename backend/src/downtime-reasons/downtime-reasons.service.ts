import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DowntimeReasonsService {
  constructor(private prisma: PrismaService) {}

  async list() {
    const items = await this.prisma.downtimeReason.findMany({ orderBy: { reasonLabel: 'asc' } });
    return { ok: true, items };
  }

  async create(body: any) {
    const item = await this.prisma.downtimeReason.create({ data: body });
    return { ok: true, item };
  }

  async update(id: string, body: any) {
    const item = await this.prisma.downtimeReason.update({ where: { id }, data: body });
    return { ok: true, item };
  }

  async delete(id: string) {
    await this.prisma.downtimeReason.delete({ where: { id } });
    return { ok: true };
  }
}
