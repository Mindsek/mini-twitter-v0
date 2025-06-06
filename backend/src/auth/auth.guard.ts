import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { JWT_CONFIG } from 'src/config/jwt-config';
import { UsersService } from 'src/users/users.service';
import { JwtPayload } from './entities/auth.entity';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private logger: Logger,
    private userService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user: JwtPayload }>();
    const token = this.extractTokenFromHeader(request);
    if (!token) {
      throw new UnauthorizedException('No token provided');
    }
    try {
      // Verify the token
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: JWT_CONFIG.secret,
      });
      request.user = payload;
      if (payload.id && typeof payload.id === 'string') {
        // Find the user for security
        const user = await this.userService.findOne(payload.id);
        if (!user) throw new UnauthorizedException('User not found');
        request.user = { ...payload, ...user };
      }
    } catch (error) {
      this.logger.error('Token verification failed', error);
      throw new UnauthorizedException('Invalid token');
    }
    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    // Try Bearer token first
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    if (type === 'Bearer' && token) {
      this.logger.log('Bearer token found', token);
      return token;
    }

    // Try cookie if Bearer token not found
    const cookieToken = request.cookies?.['auth-session'];
    if (cookieToken) {
      this.logger.log('Cookie token found', cookieToken);
      return cookieToken as string;
    }

    return undefined;
  }
}
