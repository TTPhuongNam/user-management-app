import {
  IsString,
  MinLength,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsUrl,
} from 'class-validator';
import { UserRole } from '../user.interface';

export class UpdateUserDto {
  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  @IsBoolean()
  @IsOptional()
  isDisabled?: boolean;

  // Optional: Allow admins to reset/change password via this endpoint
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @IsOptional()
  password?: string;

  @IsUrl({}, { message: 'Avatar URL must be a valid URL.' })
  @IsOptional()
  avatarUrl?: string;
}
