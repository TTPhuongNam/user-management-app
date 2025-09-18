export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
}

export interface User {
  userId: string; // Partition Key
  email: string; // Used for login and GSI
  firstName?: string;
  lastName?: string;
  passwordHash: string;
  role: UserRole;
  createdAt: string; // ISO 8601 string
  updatedAt: string; // ISO 8601 string
  isDisabled?: boolean;
  avatarUrl?: string; // URL to the user's avatar image
}
