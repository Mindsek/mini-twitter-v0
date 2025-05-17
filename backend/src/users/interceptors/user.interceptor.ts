import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { User } from 'generated/prisma';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

type UserWithoutPassword = Omit<User, 'password'>;

@Injectable()
export class UserInterceptor implements NestInterceptor {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<UserWithoutPassword | UserWithoutPassword[] | null> {
    return next.handle().pipe(
      map((data: User | User[] | null) => {
        if (Array.isArray(data)) {
          return data
            .map((user) => this.excludePassword(user))
            .filter((user): user is UserWithoutPassword => user !== null);
        }
        return this.excludePassword(data);
      }),
    );
  }

  private excludePassword(user: User | null): UserWithoutPassword | null {
    if (!user) return null;
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}
