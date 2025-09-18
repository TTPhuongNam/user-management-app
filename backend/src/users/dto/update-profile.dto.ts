import { IsString, IsOptional, IsUrl } from 'class-validator';

export class UpdateProfileDto {
  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsUrl({}, { message: 'Avatar URL must be a valid URL.' })
  @IsOptional()
  avatarUrl?: string;
  // eslint-disable-next-line prettier/prettier
}