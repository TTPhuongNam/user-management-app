import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  Logger,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { CreateUserDto } from '../users/dto/create-user.dto'; // Reuse for registration

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private authService: AuthService) {}

  /**
   * Handles user login requests.
   * Takes email and password, validates them, and returns a JWT if successful.
   */
  @Post('login')
  @HttpCode(HttpStatus.OK) // Explicitly set success status to 200 OK
  async login(@Body() loginDto: LoginDto) {
    this.logger.debug(`Login attempt for email: ${loginDto.email}`);

    // 1. Validate user credentials using AuthService
    const validatedUser = await this.authService.validateUser(
      loginDto.email,
      loginDto.password,
    );

    // 2. If validation fails, throw UnauthorizedException
    if (!validatedUser) {
      this.logger.warn(
        `Login failed: Invalid credentials for email ${loginDto.email}`,
      );
      // Throw standard NestJS exception
      throw new UnauthorizedException('Invalid credentials');
    }

    // 3. If validation succeeds, generate JWT using AuthService
    this.logger.debug(
      `Credentials validated for email: ${loginDto.email}, generating token.`,
    );
    // The login method expects the user object (without password hash)
    return this.authService.login(validatedUser);
  }

  /**
   * Handles user registration requests.
   * Takes registration details and creates a new user via AuthService.
   */
  @Post('register')
  // NestJS automatically returns 201 Created for POST requests by default
  async register(@Body() createUserDto: CreateUserDto) {
    this.logger.debug(
      `Registration attempt received for email: ${createUserDto.email}`,
    );
    // DTO validation is handled automatically by ValidationPipe
    // AuthService.register calls UsersService.create and handles potential errors (like email conflict)
    // It returns the new user object (without password hash)
    // Errors from the service (like ConflictException) will be automatically handled by NestJS filters
    try {
      const newUser = await this.authService.register(createUserDto);
      return newUser; // Return the new user object (without password hash)
      this.logger.log(
        `Registration successful for email: ${createUserDto.email}`,
      );
      return newUser;
    } catch (error: unknown) {
      // Handle specific error types if needed
      if (error instanceof ConflictException) {
        this.logger.warn(`Registration failed: ${error.message}`);
        throw error;
      }
      if (error instanceof BadRequestException) {
        this.logger.warn(
          `Registration failed due to bad request: ${error.message}`,
        );
        throw error;
      }
    }
  }
}
