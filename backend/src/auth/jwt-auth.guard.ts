import { CanActivate, ExecutionContext, Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { REQUIRED_PERMISSION } from './permissions.decorator';
import { PrismaService } from '../prisma.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const header = request.headers.authorization as string | undefined;

    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Bearer token required');
    }

    try {
      const payload = await this.jwt.verifyAsync(header.slice(7));
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, username: true, displayName: true, isActive: true },
      });

      if (!user?.isActive) throw new UnauthorizedException('User is inactive');
      request.user = { ...payload, id: user.id, username: user.username, displayName: user.displayName };

      const required = this.reflector.getAllAndOverride<string>(REQUIRED_PERMISSION, [
        context.getHandler(),
        context.getClass(),
      ]);

      if (required && !payload.permissions?.includes(required)) {
        throw new ForbiddenException(`Missing permission: ${required}`);
      }

      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) throw error;
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
