import {
  Injectable,
  UnauthorizedException,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from '../users/user.interface';
import { CreateUserDto } from '../users/dto/create-user.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  /**
   * Validates user credentials.
   * Called during the login process *before* generating a token.
   * @param email The user's email
   * @param pass The user's plaintext password
   * @returns The user object (without password hash) if validation succeeds, otherwise null.
   */
  async validateUser(
    email: string,
    pass: string,
  ): Promise<Omit<User, 'passwordHash'> | null> {
    this.logger.debug(`Attempting validation for email: ${email}`);

    // Find user by email (service handles case-insensitivity if implemented)
    const user = await this.usersService.findOneByEmail(email);

    // Check if user exists and is not disabled
    if (!user) {
      this.logger.warn(`Validation failed: User not found for email ${email}`);
      return null;
    }
    if (user.isDisabled) {
      this.logger.warn(`Validation failed: User ${email} is disabled.`);
      throw new UnauthorizedException(
        'Account has been disabled. Try again later.',
      );
    }

    // Check if password matches
    const isPasswordMatching = await bcrypt.compare(pass, user.passwordHash);

    if (isPasswordMatching) {
      this.logger.debug(`Validation successful for email: ${email}`);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { passwordHash, ...result } = user;
      return result;
    }

    this.logger.warn(`Validation failed: Invalid password for email ${email}`);
    return null; // Password doesn't match
  }

  /**
   * Generates a JWT access token for a validated user.
   * @param user User object (should not contain password hash)
   * @returns An object containing the access_token.
   */
  login(user: Omit<User, 'passwordHash'> & { avatarUrl?: string }): {
    access_token: string;
  } {
    if (!user || !user.userId || !user.email || !user.role) {
      this.logger.error(
        'Login failed: Invalid user object received for JWT generation.',
        { userId: user?.userId },
      );
      throw new InternalServerErrorException(
        'Cannot generate token due to invalid user data.',
      );
    }

    const payload = {
      email: user.email,
      sub: user.userId, // 'sub' (subject) is standard claim for user ID
      role: user.role,
      avatarUrl: user.avatarUrl || null, // Optional: Include avatar URL if available
    };

    this.logger.debug(`Generating token for user ID: ${user.userId}`);
    const accessToken = this.jwtService.sign(payload);

    return {
      access_token: accessToken,
    };
  }

  /**
   * Handles user registration by calling the UsersService.
   * @param createUserDto DTO containing registration details
   * @returns The newly created user object (without password hash).
   */
  async register(
    createUserDto: CreateUserDto,
  ): Promise<Omit<User, 'passwordHash'>> {
    this.logger.debug(`Registration attempt for email: ${createUserDto.email}`);
    // UsersService.create handles hashing, email uniqueness check, etc.
    try {
      const newUser = await this.usersService.create(createUserDto);
      this.logger.log(
        `Registration successful for email: ${createUserDto.email}, userId: ${newUser.userId}`,
      );
      return newUser;
    } catch (error: unknown) {
      let errorMessage = 'Registration failed due to an unknown error.';
      let errorStack: string | undefined = undefined;
      if (error instanceof Error) {
        errorMessage = error.message;
        errorStack = error.stack;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      this.logger.error(
        `Registration failed for email: ${createUserDto.email}, error: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }
}
