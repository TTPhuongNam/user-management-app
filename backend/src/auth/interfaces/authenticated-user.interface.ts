import { UserRole } from 'src/users/user.interface';

export interface AuthenticatedUser {
  userId: string; // User ID from the database
  email: string; // User's email address
  role: UserRole;
  avatarUrl?: string; // Optional URL to the user's avatar image
}
