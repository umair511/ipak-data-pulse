import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../common/services/audit-log.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService, private audit: AuditLogService) {}

  private hashPasswordLegacy(password: string, salt?: string): { hash: string; salt: string } {
    const s = salt || crypto.randomBytes(16).toString('hex');
    const h = crypto.createHash('sha256').update(s + password).digest('hex');
    return { hash: h, salt: s };
  }

  async list() {
    const users = await this.prisma.user.findMany({
      select: { id: true, name: true, username: true, email: true, role: true, createdAt: true, plainPassword: true },
      orderBy: { createdAt: 'asc' },
    });
    return { ok: true, items: users };
  }

  async create(body: { name: string; username: string; email?: string; password: string; role: string }) {
    const { name, username, email, password, role } = body;
    if (!name || !username || !password || !role) {
      throw new BadRequestException('All fields are required (name, username, password, role).');
    }
    const existing = await this.prisma.user.findUnique({ where: { username: username.toLowerCase() } });
    if (existing) throw new BadRequestException('A user with this username already exists.');

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await this.prisma.user.create({
      data: {
        name,
        username: username.toLowerCase(),
        email: email?.toLowerCase() || null,
        role,
        password: hashedPassword,
        plainPassword: password,
      },
      select: { id: true, name: true, username: true, email: true, role: true, createdAt: true },
    });
    await this.audit.log('u1', 'Admin', 'create', 'admin', JSON.stringify({ name, username, role }));
    return { ok: true, user };
  }

  async update(id: string, body: { name?: string; username?: string; email?: string; role?: string }) {
    const data: Record<string, unknown> = {};
    if (body.name) data.name = body.name;
    if (body.username) data.username = body.username.toLowerCase();
    if (body.email !== undefined) data.email = body.email?.toLowerCase() || null;
    if (body.role) data.role = body.role;
    if (Object.keys(data).length === 0) throw new BadRequestException('Nothing to update.');

    const user = await this.prisma.user.update({ where: { id }, data, select: { id: true, name: true, username: true, email: true, role: true } });
    await this.audit.log('u1', 'Admin', 'update', 'admin', JSON.stringify(data));
    return { ok: true, user };
  }

  async delete(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found.');
    if (user.role === 'admin') {
      const adminCount = await this.prisma.user.count({ where: { role: 'admin' } });
      if (adminCount <= 1) throw new BadRequestException('Cannot delete the last admin user.');
    }
    await this.prisma.user.delete({ where: { id } });
    await this.audit.log('u1', 'Admin', 'delete', 'admin', JSON.stringify({ deletedUser: user.username }));
    return { ok: true, message: 'User deleted.' };
  }

  async changePassword(id: string, body: { currentPassword?: string; newPassword: string }) {
    const { newPassword } = body;
    if (!newPassword) throw new BadRequestException('New password is required.');

    if (body.currentPassword) {
      const user = await this.prisma.user.findUnique({ where: { id } });
      if (!user || !user.password) throw new NotFoundException('User not found.');
      if (user.password.includes(':')) {
        const [storedHash, salt] = user.password.split(':');
        const { hash } = this.hashPasswordLegacy(body.currentPassword, salt);
        if (hash !== storedHash) throw new BadRequestException('Current password is incorrect.');
      } else {
        const valid = await bcrypt.compare(body.currentPassword, user.password);
        if (!valid) throw new BadRequestException('Current password is incorrect.');
      }
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({ where: { id }, data: { password: hashedPassword, plainPassword: newPassword } });
    await this.audit.log('u1', 'Admin', 'update', 'admin', JSON.stringify({ changedPassword: true, targetUserId: id }));
    return { ok: true, message: 'Password updated successfully.' };
  }

  async batchPasswords(body: { passwords: Record<string, string> }) {
    const { passwords } = body;
    if (!passwords || typeof passwords !== 'object') throw new BadRequestException('passwords object required.');
    const results: any[] = [];
    for (const [username, plainPassword] of Object.entries(passwords)) {
      try {
        await this.prisma.user.update({ where: { username }, data: { plainPassword } });
        results.push({ username, ok: true });
      } catch (e: any) {
        results.push({ username, ok: false, error: e.message });
      }
    }
    return { ok: true, results };
  }
}
