import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  private hashPasswordLegacy(password: string, salt?: string): { hash: string; salt: string } {
    const s = salt || crypto.randomBytes(16).toString('hex');
    const h = crypto.createHash('sha256').update(s + password).digest('hex');
    return { hash: h, salt: s };
  }

  private verifyPasswordBcrypt(password: string, hashed: string): Promise<boolean> {
    return bcrypt.compare(password, hashed);
  }

  private verifyPasswordLegacy(password: string, storedHash: string, salt: string): boolean {
    const { hash } = this.hashPasswordLegacy(password, salt);
    return hash === storedHash;
  }

  private generateTokens(user: { id: string; username: string; role: string }) {
    const payload = { sub: user.id, username: user.username, role: user.role };
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.config.get<string>('JWT_SECRET', 'ipak-jwt-secret'),
      expiresIn: this.config.get<string>('JWT_EXPIRATION', '7d'),
    });
    return { accessToken, refreshToken };
  }

  async login(username: string, password: string) {
    if (!username || !password) {
      throw new UnauthorizedException('Username and password are required.');
    }
    const loginId = username.toLowerCase();
    const user = await this.prisma.user.findFirst({ where: { username: loginId } });
    if (!user || !user.password) {
      throw new UnauthorizedException('Invalid username or password.');
    }

    let valid = false;
    if (user.password.includes(':')) {
      const [storedHash, salt] = user.password.split(':');
      valid = this.verifyPasswordLegacy(password, storedHash, salt);
    } else {
      valid = await this.verifyPasswordBcrypt(password, user.password);
    }

    if (!valid) {
      throw new UnauthorizedException('Invalid username or password.');
    }

    const tokens = this.generateTokens(user);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await this.prisma.refreshToken.create({
      data: { token: tokens.refreshToken, userId: user.id, expiresAt },
    });

    return {
      ok: true,
      user: { id: user.id, name: user.name, username: user.username, email: user.email, role: user.role },
      ...tokens,
    };
  }

  async register(data: { name: string; username: string; email?: string; password: string; role?: string }) {
    const existing = await this.prisma.user.findUnique({ where: { username: data.username.toLowerCase() } });
    if (existing) throw new ConflictException('A user with this username already exists.');

    const hashedPassword = await bcrypt.hash(data.password, 12);
    const user = await this.prisma.user.create({
      data: {
        name: data.name,
        username: data.username.toLowerCase(),
        email: data.email?.toLowerCase() || null,
        role: data.role || 'operator',
        password: hashedPassword,
        plainPassword: data.password,
      },
      select: { id: true, name: true, username: true, email: true, role: true, createdAt: true },
    });

    const tokens = this.generateTokens(user as any);
    return { ok: true, user, ...tokens };
  }

  async refresh(refreshToken: string) {
    const stored = await this.prisma.refreshToken.findUnique({ where: { token: refreshToken } });
    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token.');
    }
    const user = await this.prisma.user.findUnique({ where: { id: stored.userId } });
    if (!user) throw new UnauthorizedException('User not found.');

    await this.prisma.refreshToken.delete({ where: { id: stored.id } });

    const tokens = this.generateTokens(user);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await this.prisma.refreshToken.create({
      data: { token: tokens.refreshToken, userId: user.id, expiresAt },
    });

    return { ok: true, ...tokens };
  }

  async logout(refreshToken: string) {
    await this.prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
    return { ok: true, message: 'Logged out.' };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, username: true, email: true, role: true, createdAt: true },
    });
    return { ok: true, user };
  }

  async seed() {
    const count = await this.prisma.user.count();
    if (count === 0) {
      const { hash, salt } = this.hashPasswordLegacy('admin123');
      await this.prisma.user.create({
        data: { id: 'u1', username: 'admin', email: null, name: 'Admin', role: 'admin', password: `${hash}:${salt}` },
      });
      return { ok: true, message: 'Admin user created (admin / admin123)' };
    }
    return { ok: true, message: 'Users already exist. Nothing seeded.' };
  }
}
