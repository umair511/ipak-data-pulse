import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../common/services/audit-log.service';

@Injectable()
export class PermissionsService {
  constructor(private prisma: PrismaService, private audit: AuditLogService) {}

  async get(userId: string) {
    const permissions = await this.prisma.userPermission.findMany({ where: { userId }, select: { permission: true } });
    return { ok: true, permissions: permissions.map(p => p.permission) };
  }

  async set(userId: string, body: { permissions: string[] }) {
    const { permissions } = body;
    if (!Array.isArray(permissions)) return { ok: false, error: 'permissions must be an array.' };
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found.');

    await this.prisma.userPermission.deleteMany({ where: { userId } });
    for (const p of permissions) {
      await this.prisma.userPermission.create({ data: { userId, permission: p } });
    }
    await this.audit.log('u1', 'Admin', 'update', 'admin', JSON.stringify({ permissions }));
    return { ok: true, message: 'Permissions updated.' };
  }

  async getAll() {
    const allPerms = await this.prisma.userPermission.findMany({ select: { userId: true, permission: true } });
    return { ok: true, items: allPerms };
  }

  async getPlants(userId: string) {
    const plants = await this.prisma.userPlant.findMany({ where: { userId }, select: { plantId: true, plantName: true } });
    return { ok: true, plants: plants.map(p => ({ id: p.plantId, name: p.plantName })) };
  }

  async setPlants(userId: string, body: { plants: { id: string; name: string }[] }) {
    const { plants } = body;
    if (!Array.isArray(plants)) return { ok: false, error: 'plants must be an array.' };
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found.');

    await this.prisma.userPlant.deleteMany({ where: { userId } });
    for (const p of plants) {
      await this.prisma.userPlant.create({ data: { userId, plantId: p.id, plantName: p.name } });
    }
    return { ok: true, message: 'Plant assignments updated.' };
  }
}
