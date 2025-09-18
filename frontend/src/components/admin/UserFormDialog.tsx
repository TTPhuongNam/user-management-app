"use client";

import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import apiClient from "@/lib/apiClient";
import { User, UserRole } from "@/types";
import { Loader2 } from "lucide-react";


// Define Zod schema for user form validation
const userFormSchema = z.object({
    email: z.string().email({ message: "Invalid email address." }),
    // Password is optional in the form (required only on backend for create)
    password: z.string().min(8, { message: "Password must be at least 8 characters." }).optional().or(z.literal('')),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    role: z.nativeEnum(UserRole, { required_error: "Role is required." }),
    isDisabled: z.boolean(),
});

type UserFormValues = z.infer<typeof userFormSchema>;

interface UserFormDialogProps {
    isOpen: boolean;
    onClose: (refresh?: boolean) => void;
    user: User | null; // null for create mode, User object for edit mode
}

export function UserFormDialog({ isOpen, onClose, user }: UserFormDialogProps) {
    const [isLoading, setIsLoading] = useState(false);
    const isEditMode = user !== null;

    const form = useForm<UserFormValues>({
        resolver: zodResolver(userFormSchema),
        defaultValues: {
            email: "",
            password: "",
            firstName: "",
            lastName: "",
            role: UserRole.USER,
            isDisabled: false,
        },
    });

    // Effect to reset form when dialog opens or user data changes
    useEffect(() => {
        if (isOpen) {
            if (isEditMode && user) {
                // Edit mode: prefill form, leave password blank
                form.reset({
                    email: user.email,
                    password: "", // Don't prefill password
                    firstName: user.firstName || "",
                    lastName: user.lastName || "",
                    role: user.role,
                    isDisabled: user.isDisabled || false,
                });
            } else {
                // Create mode: reset to defaults
                form.reset({
                    email: "",
                    password: "",
                    firstName: "",
                    lastName: "",
                    role: UserRole.USER,
                    isDisabled: false,
                });
            }
        }
    }, [isOpen, user, isEditMode, form]); // Add form to dependency array

    const onSubmit = async (values: UserFormValues) => {
        setIsLoading(true);
        try {
            // Prepare payload, remove empty password if not provided for update
            const payload = { ...values };
            if (isEditMode && !payload.password) {
                delete payload.password; // Don't send empty password on update
            } else if (!isEditMode && !payload.password) {
                // Technically schema allows empty, but backend create requires it
                toast.error("Password is required for new users.");
                setIsLoading(false);
                return;
            }


            if (isEditMode && user) {
                // Update existing user
                await apiClient.patch(`/users/${user.userId}`, payload); // Adjust endpoint if needed
                toast.success("User updated successfully!");
            } else {
                // Create new user
                await apiClient.post("/users", payload); // Adjust endpoint if needed
                toast.success("User created successfully!");
            }

            onClose(true); // Close dialog and signal refresh

        } catch (error: unknown) {
            let errorMessage = "An unknown error occurred. Please try again.";

            if (error instanceof Error) {
                errorMessage = error.message;
            } else if (typeof error === "string") {
                errorMessage = error;
            }
            toast.error(errorMessage);

        } finally {
            setIsLoading(false); // Reset loading state
        }
    };

    // Handle closing the dialog without saving
    const handleCloseDialog = () => {
        if (!isLoading) {
            onClose(); // Close without refreshing
        }
    };


    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && handleCloseDialog()}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{isEditMode ? "Edit User" : "Create New User"}</DialogTitle>
                    <DialogDescription>
                        {isEditMode
                            ? "Modify the user details below."
                            : "Enter the details for the new user."}
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Email</FormLabel>
                                    <FormControl>
                                        <Input placeholder="user@example.com" {...field} disabled={isLoading || isEditMode} />
                                        {/* Usually disable email editing */}
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="password"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{isEditMode ? "New Password (Optional)" : "Password"}</FormLabel>
                                    <FormControl>
                                        <Input type="password" {...field} placeholder={isEditMode ? "Leave blank to keep current" : "********"} disabled={isLoading} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="firstName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>First Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="John" {...field} disabled={isLoading} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="lastName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Last Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Doe" {...field} disabled={isLoading} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <FormField
                            control={form.control}
                            name="role"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Role</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a role" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value={UserRole.USER}>User</SelectItem>
                                            <SelectItem value={UserRole.ADMIN}>Admin</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="isDisabled"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                    <div className="space-y-0.5">
                                        <FormLabel>Account Disabled</FormLabel>
                                    </div>
                                    <FormControl>
                                        <Switch
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                            disabled={isLoading}
                                        />
                                    </FormControl>
                                </FormItem>
                            )}
                        />

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={handleCloseDialog} disabled={isLoading}>Cancel</Button>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                {isEditMode ? "Save Changes" : "Create User"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
