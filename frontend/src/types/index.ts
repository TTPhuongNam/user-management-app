
export enum UserRole {
    USER = 'USER',
    ADMIN = 'ADMIN',
}

export interface User {
    userId: string;
    email: string;
    firstName?: string;
    lastName?: string;
    role: UserRole;
    isDisabled?: boolean;
    createdAt: string;
    updatedAt: string;
    avatarUrl?: string; // Optional avatar URL
}