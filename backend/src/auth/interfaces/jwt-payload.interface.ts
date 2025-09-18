import { UserRole } from '../../users/user.interface';

export interface JwtPayload {
  email: string;
  sub: string; // Standard name for subject (user ID)
  role: UserRole;
  avatarUrl?: string; // Optional: Include avatar URL if available
}
