import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../stores/authStore';
import { UserRole } from '@/types';

const withAuth = <P extends object>(
    WrappedComponent: React.ComponentType<P>,
    allowedRoles?: UserRole[]
) => {
    const AuthComponent = (props: P) => {
        const router = useRouter();
        const { user, token } = useAuthStore(); // Get user and token

        useEffect(() => {
            if (!token) {
                // No token found, redirect to login
                router.replace('/login');
            } else if (user) {
                // Token exists, user info loaded
                if (allowedRoles && allowedRoles.length > 0) {
                    // Check if user's role is allowed
                    const userRole = user.role as UserRole;
                    if (!allowedRoles.includes(userRole)) {
                        // Role not allowed, redirect to a 'forbidden' page or dashboard
                        router.replace('/dashboard'); // Or a dedicated /unauthorized page
                    }
                }
                // User is authenticated and (if roles specified) authorized
            }
            // If token exists but user is null, the store is likely still initializing/decoding
            // Or the token is invalid (handled by store potentially)
            // Could add a loading state here if needed
        }, [user, token, router]);

        // Render the wrapped component if authenticated (and authorized)
        // Optionally add a loading spinner while checking auth
        if (!token || !user) {
            return <div className="flex h-screen items-center justify-center">Authenticating...</div>; // Or null, or a spinner
        }

        // If role check is needed and user doesn't match, return null or loading/redirecting indicator
        if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role as UserRole)) {
            return <div className="flex h-screen items-center justify-center">Redirecting...</div>; // Or null
        }


        return <WrappedComponent {...props} />;
    };

    // Assign display name for easier debugging
    AuthComponent.displayName = `WithAuth(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`;

    return AuthComponent;
};

export default withAuth;