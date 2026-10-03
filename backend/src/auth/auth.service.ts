import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma.service';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService, private readonly jwt: JwtService) {}

  async login(username: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { username },
      include: { roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } } },
    });

    if (!user || !user.isActive || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid username or password');
    }

    const roles = user.roles.map((r) => r.role.name);
    const permissions = [...new Set(user.roles.flatMap((r) => r.role.permissions.map((p) => p.permission.code)))];

    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      username: user.username,
      roles,
      permissions,
    });

    return {
      success: true,
      accessToken,
      user: { id: user.id, username: user.username, displayName: user.displayName, roles, permissions },
    };
  }
}
