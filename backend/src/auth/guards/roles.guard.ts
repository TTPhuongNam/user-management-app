import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserRole } from '../../users/user.interface';
import { RequestWithUser } from '../interfaces/request-with-user.interface';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredRoles) {
      return true;
    }

    // Provide the interface as a type argument to getRequest
    // This makes 'request' have the correct type, resolving the error
    const request = context.switchToHttp().getRequest<RequestWithUser>();

    // Now 'request.user' is known to be of type AuthenticatedUser
    const user = request.user;

    // Runtime checks are still good practice
    if (!user || !user.role) {
      return false; // No user or role info attached
    }

    // Check if user has at least one of the required roles
    return requiredRoles.includes(user.role);
  }
}
