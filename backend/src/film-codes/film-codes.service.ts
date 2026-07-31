import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FilmCodesService {
  constructor(private prisma: PrismaService) {}

  async list(plantId?: string) {
    const where: any = {};
    if (plantId) where.plantId = plantId;
    const items = await this.prisma.filmCode.findMany({ where, orderBy: { filmCodeName: 'asc' } });
    return { ok: true, items };
  }

  async create(body: any) {
    const item = await this.prisma.filmCode.create({ data: body });
    return { ok: true, item };
  }

  async update(id: string, body: any) {
    const item = await this.prisma.filmCode.update({ where: { id }, data: body });
    return { ok: true, item };
  }

  async delete(id: string) {
    await this.prisma.filmCode.delete({ where: { id } });
    return { ok: true };
  }

  async bulk(body: { items: any[]; plantId?: string; plantName?: string }) {
    const { items, plantId, plantName } = body;
    if (!Array.isArray(items) || items.length === 0) throw new BadRequestException('No items provided.');

    const created: any[] = [];
    const skipped: { index: number; name: string; reason: string }[] = [];

    for (let i = 0; i < items.length; i++) {
      const name = (items[i].filmCodeName || '').trim();
      if (!name) { skipped.push({ index: i, name: '', reason: 'Empty film code name' }); continue; }
      const existing = await this.prisma.filmCode.findFirst({ where: { filmCodeName: name, plantId: plantId || null } });
      if (existing) { skipped.push({ index: i, name, reason: 'Already exists for this plant' }); continue; }
      const record = await this.prisma.filmCode.create({
        data: { filmCodeName: name, description: items[i].description || null, plantId: plantId || null, plantName: plantName || null, status: 'Active' },
      });
      created.push(record);
    }
    return { ok: true, created: created.length, skipped, total: items.length };
  }
}
