"use client"; // Mark as client component to use hooks like useAuthStore

import Layout from '@/components/layout';
import withAuth from '@/components/withAuth'; // Your HOC for protected routes
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { useAuthStore } from '../../../stores/authStore';

function DashboardPage() {
    const user = useAuthStore((state) => state.user); // Get user info

    return (
        <Layout>
            <Card>
                <CardHeader>
                    <CardTitle>Dashboard</CardTitle>
                    <CardDescription>Welcome back, {user?.email || 'User'}!</CardDescription>
                </CardHeader>
                <CardContent>
                    <p>This is your main dashboard area.</p>
                    <p>Your Role: {user?.role}</p>
                    {/* Add more dashboard widgets or information here */}
                </CardContent>
            </Card>
        </Layout>
    );
}

// Protect this page, allow any logged-in user
export default withAuth(DashboardPage);