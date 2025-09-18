import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation'; // Use navigation router
import { useAuthStore } from '../../stores/authStore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'; // For mobile nav
import {
    LayoutDashboard, User, UserCog, Lock, LogOut, Menu, Search, Settings // Import icons
} from 'lucide-react';
import { Input } from './ui/input';

interface LayoutProps {
    children: React.ReactNode;
}

const SidebarLink = ({ href, icon: Icon, label }: { href: string; icon: React.ElementType; label: string }) => (
    <Link href={href} passHref>
        <Button variant="ghost" className="w-full justify-start text-left">
            <Icon className="mr-2 h-4 w-4" />
            {label}
        </Button>
    </Link>
);

export default function Layout({ children }: LayoutProps) {
    const { user, logout } = useAuthStore();
    const router = useRouter();

    const handleLogout = () => {
        logout();
        router.push('/login'); // Redirect to login after logout
    };

    if (!user) {
        // Can render a loading state or null, or redirect if needed immediately
        // Or handle this protection at the page level
        return <div className="flex h-screen items-center justify-center">Loading or Redirecting...</div>;
    }

    const getInitials = (email?: string): string => {
        return email ? email.substring(0, 2).toUpperCase() : '??';
    };

    return (
        <div className="flex min-h-screen w-full bg-muted/40">
            {/* Sidebar */}
            <aside className="hidden w-64 flex-col border-r bg-background p-4 md:flex">
                <div className="mb-4 flex items-center gap-2 px-2">
                    {/* <Package2 className="h-6 w-6" /> */}
                    <span className="text-lg font-semibold">Sing App</span> {/* App Name */}
                </div>
                <nav className="flex flex-col gap-1">
                    <SidebarLink href="/dashboard" icon={LayoutDashboard} label="Dashboard" />
                    {user?.role === 'ADMIN' && (
                        <SidebarLink href="/admin/users" icon={UserCog} label="Users" />
                    )}
                    <SidebarLink href="/profile" icon={User} label="My Profile" />
                    <SidebarLink href="/change-password" icon={Lock} label="Change Password" />
                    {/* <SidebarLink href="/documentation" icon={BookOpenText} label="Documentation" /> */}
                </nav>
            </aside>

            <div className="flex flex-1 flex-col">
                {/* Header */}
                <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b bg-background px-4 md:justify-end">
                    {/* Mobile Nav Trigger */}
                    <Sheet>
                        <SheetTrigger asChild>
                            <Button size="icon" variant="outline" className="md:hidden">
                                <Menu className="h-5 w-5" />
                                <span className="sr-only">Toggle Menu</span>
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="w-64 p-4">
                            {/* Mobile Sidebar Content - Reuse Nav Links */}
                            <div className="mb-4 flex items-center gap-2 px-2">
                                <span className="text-lg font-semibold">Sing App</span>
                            </div>
                            <nav className="flex flex-col gap-1">
                                <SidebarLink href="/dashboard" icon={LayoutDashboard} label="Dashboard" />
                                {user?.role === 'ADMIN' && (
                                    <SidebarLink href="/admin/users" icon={UserCog} label="Users" />
                                )}
                                <SidebarLink href="/profile" icon={User} label="My Profile" />
                                <SidebarLink href="/change-password" icon={Lock} label="Change Password" />
                            </nav>
                        </SheetContent>
                    </Sheet>


                    {/* Search Bar (Optional based on image) */}
                    <div className="relative ml-auto flex-1 md:grow-0">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Search Dashboard..."
                            className="w-full rounded-lg bg-background pl-8 md:w-[200px] lg:w-[320px]"
                        />
                    </div>

                    {/* User Menu */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="icon" className="ml-4 overflow-hidden rounded-full">
                                <Avatar className="h-8 w-8">
                                    {/* Add AvatarImage if you store image URLs */}
                                    <AvatarImage src={user.avatarUrl ?? undefined} alt={user.email} />
                                    <AvatarFallback>{getInitials(user.email)}</AvatarFallback>
                                </Avatar>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>{user?.email}</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => router.push('/profile')}>
                                <User className="mr-2 h-4 w-4" /> Profile
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => router.push('/settings')}> {/* Or wherever settings are */}
                                <Settings className="mr-2 h-4 w-4" /> Settings
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={handleLogout}>
                                <LogOut className="mr-2 h-4 w-4" /> Logout
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </header>

                {/* Main Content */}
                <main className="flex-1 p-4 md:p-6">
                    {children} {/* Page content goes here */}
                </main>

                {/* Footer (Optional based on image) */}
                <footer className="border-t bg-background p-4 text-center text-sm text-muted-foreground">
                    Sing App React Admin Dashboard Template - Made by Flatlogic (Adapted)
                </footer>
            </div>
        </div>
    );
}