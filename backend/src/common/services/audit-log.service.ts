import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuditLogService {
  constructor(private prisma: PrismaService) {}

  async log(userId: string, userName: string, action: string, module: string, details?: string) {
    try {
      await this.prisma.auditLog.create({
        data: { userId, userName, action, module, details: details || null },
      });
    } catch (e: any) {
      console.error('Audit log write failed:', e.message);
    }
  }
}
