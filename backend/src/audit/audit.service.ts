import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async list(query: any) {
    const page = parseInt(query.page || '1');
    const limit = Math.min(parseInt(query.limit || '20'), 200);
    const skip = (page - 1) * limit;
    const where: any = {};
    if (query.module) where.module = query.module;
    if (query.action) where.action = query.action;
    if (query.startDate && query.endDate) where.createdAt = { gte: new Date(query.startDate), lte: new Date(query.endDate) };

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({ where, include: { user: { select: { id: true, name: true, email: true, username: true } } }, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      this.prisma.auditLog.count({ where }),
    ]);
    return { ok: true, logs, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async stats() {
    const last7Days = new Date();
    last7Days.setDate(last7Days.getDate() - 7);
    const [totalLogs, recentLogs, moduleCounts] = await Promise.all([
      this.prisma.auditLog.count(),
      this.prisma.auditLog.count({ where: { createdAt: { gte: last7Days } } }),
      this.prisma.auditLog.groupBy({ by: ['module'], _count: { id: true }, orderBy: { _count: { id: 'desc' } } }),
    ]);
    return { ok: true, stats: { totalLogs, last7Days: recentLogs, moduleBreakdown: moduleCounts.map(m => ({ module: m.module, count: m._count.id })) } };
  }

  async byUser(userId: string, limit?: string) {
    const logs = await this.prisma.auditLog.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: parseInt(limit || '20') });
    return { ok: true, logs };
  }

  async byModule(module: string, limit?: string) {
    const logs = await this.prisma.auditLog.findMany({ where: { module }, orderBy: { createdAt: 'desc' }, take: parseInt(limit || '50') });
    return { ok: true, logs };
  }
}
