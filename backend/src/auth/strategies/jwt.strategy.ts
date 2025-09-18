import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';
import { JwtPayload } from '../interfaces/jwt-payload.interface'; // <-- Import the interface
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    // ... constructor implementation (validated secret) ...
    private configService: ConfigService,
    private usersService: UsersService,
  ) {
    const secret = configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error(
        'JWT_SECRET not found in configuration. JwtStrategy cannot be initialized.',
      );
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  // Passport automatically calls this after verifying JWT signature and expiration
  // Corrected: Use the JwtPayload interface for the payload parameter
  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    // Accessing payload properties is now type-safe
    const user = await this.usersService.findOneById(payload.sub); // Use payload.sub

    if (!user || user.isDisabled) {
      throw new UnauthorizedException('User not found or disabled.');
    }
    // Return essential info, now using type-safe properties from payload
    // Also added return type annotation to the method itself for clarity
    return {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
      avatarUrl: payload.avatarUrl,
    };
  }
}
