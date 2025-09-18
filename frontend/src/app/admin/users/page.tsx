"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Layout from '@/components/layout';
import withAuth from '@/components/withAuth';
import { UserRole, User } from '@/types';
import apiClient from '@/lib/apiClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserPlus, Search, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

// Placeholder Imports for required components (implement these separately)
import UserTable from '@/components/admin/UserTable';
import { UserFormDialog } from '@/components/admin/UserFormDialog';

function AdminUsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);

    // Use useCallback to memoize fetchUsers function
    const fetchUsers = useCallback(async (search = '') => {
        setLoading(true);
        try {
            // Add filtering/search params if backend supports it
            const response = await apiClient.get('/users', { params: { search } }); // Assuming admin endpoint
            setUsers(response.data);
        } catch (err: unknown) {
            console.error("Failed to fetch users:", err);
            if (err && typeof err === 'object' && 'response' in err && err.response && typeof err.response === 'object' && 'data' in err.response && err.response.data && typeof err.response.data === 'object' && 'message' in err.response.data) {
                toast.error((err.response as { data: { message?: string } }).data.message || 'Failed to fetch users.');
            } else {
                toast.error('Failed to fetch users.');
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const handleSearch = () => {
        fetchUsers(searchTerm);
    };

    const handleAddNew = () => {
        setEditingUser(null);
        setIsDialogOpen(true);
    };

    const handleEdit = (user: User) => {
        setEditingUser(user);
        setIsDialogOpen(true);
    };

    const handleDelete = async (userId: string) => {
        if (!confirm(`Are you sure you want to delete user ${userId}?`)) {
            return;
        }
        try {
            await apiClient.delete(`/users/${userId}`); // Add actual delete API call
            toast.success('User deleted successfully.');
            fetchUsers(searchTerm);
        } catch (err: unknown) {
            console.error(`Failed to delete user ${userId}:`, err);
            if (err && typeof err === 'object' && 'response' in err && err.response && typeof err.response === 'object' && 'data' in err.response && err.response.data && typeof err.response.data === 'object' && 'message' in err.response.data) {
                toast.error((err.response as { data: { message?: string } }).data.message || 'Failed to delete user.');
            } else {
                toast.error('Failed to delete user.');
            }
            setLoading(false); // Reset loading state on error
        }
    }

    // handleToggleDisable would be similar to handleDelete, making a PATCH request

    const handleDialogClose = (refresh?: boolean) => {
        setIsDialogOpen(false);
        setEditingUser(null);
        if (refresh) {
            fetchUsers(searchTerm); // Refresh table if dialog indicated changes were made
        }
    };

    return (
        <Layout>
            <div className="mb-4 flex items-center justify-between">
                <h1 className="text-2xl font-semibold">User Management</h1>
                <Button onClick={handleAddNew}>
                    <UserPlus className="mr-2 h-4 w-4" /> New User
                </Button>
            </div>

            {/* Search Bar */}
            <div className="mb-4 flex items-center gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Search users by name or email..."
                        className="w-full rounded-lg bg-background pl-8"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()} // Trigger search on Enter
                    />
                </div>
                <Button onClick={handleSearch} disabled={loading}>
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                    Search
                </Button>
            </div>

            {/* User Table Component */}
            {loading && users.length === 0 ? ( // Show loading only on initial load
                <div className="flex justify-center items-center p-10"> <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /> </div>
            ) : (
                <UserTable
                    users={users}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    isLoading={loading} // Pass loading state to table for potential overlay/skeleton
                // onToggleDisable={handleToggleDisable}
                />
            )}

            {/* User Create/Edit Dialog */}
            {/* Dialog is conditionally rendered based on isDialogOpen to manage its state */}
            {isDialogOpen && (
                <UserFormDialog
                    isOpen={isDialogOpen}
                    onClose={handleDialogClose}
                    user={editingUser}
                />
            )}
        </Layout>
    );
}

// Protect this page, only allow ADMINs
export default withAuth(AdminUsersPage, [UserRole.ADMIN]);