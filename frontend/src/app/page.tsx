"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../stores/authStore';
import { Loader2 } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();

  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);

  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    // Check authentication status once store is potentially hydrated
    if (token !== undefined) {
         if (token && user) {
            // User is logged in, redirect to dashboard
            router.replace('/admin/users');
          } else {
            // User is not logged in, redirect to login
            router.replace('/login');
          }
    }
    setIsCheckingAuth(false);

  }, [token, user, router]);

   if (isCheckingAuth) {
      return (
        <div className="flex min-h-screen items-center justify-center">
          s<Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
        </div>
      );
   }

  return null;
}