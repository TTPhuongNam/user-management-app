import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from './user.interface';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // --- Get Current User Profile ---
  @UseGuards(JwtAuthGuard) // Only needs login, not specific role
  @Get('profile')
  async getProfile(@Req() req: Request) {
    // req.user is populated by JwtStrategy's validate method
    const authenticatedUser = req.user as AuthenticatedUser; // Cast to AuthenticatedUser type
    const userId = authenticatedUser?.userId; // Extract userId from the authenticated user
    const user = await this.usersService.findOneByIdOrFail(userId);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...userProfile } = user;
    return userProfile;
  }

  // --- Update Current User Profile ---
  @UseGuards(JwtAuthGuard) // Only needs login, not specific role
  @Patch('profile')
  async updateOwnProfile(
    @Req() req: Request, // Get request object to check if user is updating themselves
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    const authenticatedUser = req.user as AuthenticatedUser;
    const userId = authenticatedUser?.userId; // Extract userId from the authenticated user
    return this.usersService.update(userId, updateProfileDto);
  }

  // --- Admin: Create User ---
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post()
  async create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  // --- Admin: Get All Users ---
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get()
  async findAll() {
    // Service's findAll method already excludes password hashes
    return this.usersService.findAll();
  }

  // --- Admin: Get Specific User ---
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get(':id')
  // Use ParseUUIDPipe to validate that the id param is a valid UUID
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    // Service returns the full user object including hash, filter it here
    const user = await this.usersService.findOneByIdOrFail(id);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...result } = user;
    return result;
  }

  // --- Admin: Update Specific User ---
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Req() req: Request, // Get request object to check if admin is updating themselves
  ) {
    // Optional: Prevent admin from accidentally changing their own role or disabling themselves
    const authenticatedUser = req.user as AuthenticatedUser; // Cast to AuthenticatedUser type
    const adminUserId = authenticatedUser?.userId; // Extract userId from the authenticated user
    if (
      id === adminUserId &&
      (updateUserDto.role !== UserRole.ADMIN || updateUserDto.isDisabled)
    ) {
      throw new ForbiddenException(
        'Admins cannot change their own role or disable themselves.',
      );
    }

    // Service's update method already excludes password hash from the return
    return this.usersService.update(id, updateUserDto);
  }

  // --- Admin: Delete Specific User ---
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT) // Return 204 No Content on success
  async remove(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    // Prevent admin from deleting themselves
    const authenticatedUser = req.user as AuthenticatedUser; // Cast to AuthenticatedUser type
    const adminUserId = authenticatedUser?.userId; // Extract userId from the authenticated user
    if (id === adminUserId) {
      throw new ForbiddenException('Admins cannot delete their own account.');
    }

    await this.usersService.remove(id);
  }
}
