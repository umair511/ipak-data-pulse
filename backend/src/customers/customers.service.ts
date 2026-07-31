import { Injectable, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../common/services/audit-log.service';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService, private audit: AuditLogService) {}

  async list(query: any) {
    const where: any = { status: 'Active' };
    if (query.plant) where.plantName = query.plant;
    if (query.plantName) where.plantName = query.plantName;
    const customers = await this.prisma.customer.findMany({ where, orderBy: { name: 'asc' } });
    return { ok: true, items: customers.map(r => ({ id: r.id, name: r.name, plantName: r.plantName })) };
  }

  async create(body: { name: string; plantName?: string; plantId?: string }) {
    if (!body.name || !body.name.trim()) throw new BadRequestException('Customer name is required.');
    const trimmed = body.name.trim();
    const existing = await this.prisma.customer.findFirst({ where: { name: trimmed, plantName: body.plantName || null } });
    if (existing) throw new ConflictException('Customer already exists for this plant.');
    const customer = await this.prisma.customer.create({
      data: { name: trimmed, plantId: body.plantId || null, plantName: body.plantName || null },
    });
    await this.audit.log('u1', 'Admin', 'create', 'customers', JSON.stringify({ name: trimmed, plantName: body.plantName }));
    return { ok: true, customer: { id: customer.id, name: customer.name, plantName: customer.plantName } };
  }

  async update(id: string, body: any) {
    const item = await this.prisma.customer.update({ where: { id }, data: body });
    return { ok: true, item };
  }

  async delete(id: string) {
    const existing = await this.prisma.customer.findUnique({ where: { id } });
    await this.prisma.customer.delete({ where: { id } });
    await this.audit.log('u1', 'Admin', 'delete', 'customers', JSON.stringify({ deletedName: existing?.name || id }));
    return { ok: true };
  }
}
