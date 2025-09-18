import { create } from 'zustand';
import { jwtDecode } from 'jwt-decode'; // Correct import
import { UserRole } from '@/types';

interface UserState {
    userId: string;
    email: string;
    role: UserRole;
    avatarUrl?: string | null; // Optional property for avatar URL
}

interface AuthState {
    token: string | null;
    user: UserState | null;
    setToken: (token: string | null) => void;
    logout: () => void;
}

interface DecodedToken {
    sub: string; // User ID
    email: string; // User email
    role: string;
    exp: number; // Expiration time
    avatarUrl?: string; // Optional property for avatar URL
    iat: number; // Issued at time
}



// Helper to get initial token from localStorage
const getInitialToken = (): string | null => {
    if (typeof window !== 'undefined') {
        return localStorage.getItem('authToken');
    }
    return null;
};

// Helper to decode token safely
const decodeToken = (token: string | null): AuthState['user'] => {
    if (!token) return null;
    try {
        // Decode the token - Adjust payload structure based on your NestJS JWT payload
        const decoded: DecodedToken = jwtDecode(token);
        // Optional: Check expiration
        if (decoded.exp * 1000 < Date.now()) {
            localStorage.removeItem('authToken'); // Remove expired token
            return null;
        }
        return { userId: decoded.sub, email: decoded.email, role: decoded.role as UserRole, avatarUrl: decoded.avatarUrl };
    } catch (error) {
        console.error("Failed to decode token:", error);
        localStorage.removeItem('authToken'); // Remove invalid token
        return null;
    }
}

export const useAuthStore = create<AuthState>((set) => ({
    token: getInitialToken(),
    user: decodeToken(getInitialToken()),
    setToken: (token) => {
        if (token) {
            localStorage.setItem('authToken', token);
            set({ token, user: decodeToken(token) });
        } else {
            localStorage.removeItem('authToken');
            set({ token: null, user: null });
        }
    },
    logout: () => {
        localStorage.removeItem('authToken');
        set({ token: null, user: null });
        // Optionally redirect to login page
        // window.location.href = '/login'; // Or use Next.js router
    },
}));