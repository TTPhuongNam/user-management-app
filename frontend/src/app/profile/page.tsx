"use client";

import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import Layout from "@/components/layout";
import withAuth from "@/components/withAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import apiClient from "@/lib/apiClient";
import { useAuthStore } from "../../../stores/authStore";
import { User, UserRole } from "@/types"; // Assuming User type is defined

// Define Zod schema for profile update validation
const profileFormSchema = z.object({
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    email: z.string().email().readonly(), // Email usually not updatable here
    role: z.nativeEnum(UserRole).readonly(), // Role not updatable by user
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

function ProfilePage() {
    const user = useAuthStore((state) => state.user);
    const [isLoading, setIsLoading] = React.useState(false);
    const [isFetching, setIsFetching] = React.useState(true);

    const form = useForm<ProfileFormValues>({
        resolver: zodResolver(profileFormSchema),
        defaultValues: {
            email: "",
            firstName: "",
            lastName: "",
            role: UserRole.USER, // Default, will be overwritten
        },
    });

    // Fetch profile data on component mount
    useEffect(() => {
        const fetchProfile = async () => {
            setIsFetching(true);
            try {
                const response = await apiClient.get<User>('/users/profile'); // Fetch from your profile endpoint
                const profileData = response.data;
                // Reset form with fetched data
                form.reset({
                    email: profileData.email,
                    firstName: profileData.firstName || "",
                    lastName: profileData.lastName || "",
                    role: profileData.role,
                });
            } catch (error: unknown) {
                console.error("Failed to fetch profile:", error);
                // Type guard for error object
                if (
                    error &&
                    typeof error === "object" &&
                    "response" in error &&
                    error.response &&
                    typeof error.response === "object" &&
                    "data" in error.response &&
                    error.response.data &&
                    typeof error.response.data === "object" &&
                    "message" in error.response.data
                ) {
                    toast.error(
                        (error.response as { data: { message?: string } }).data.message ||
                        "Failed to load profile data."
                    );
                } else {
                    toast.error("Failed to load profile data.");
                }
            } finally {
                setIsFetching(false);
            }
        };

        if (user) { // Ensure user is loaded before fetching
            fetchProfile();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, form.reset]); // Depend on user and form.reset

    const onSubmit = async (values: ProfileFormValues) => {
        setIsLoading(true);
        try {
            // Only send fields that can be updated (e.g., firstName, lastName)
            const updatePayload = {
                firstName: values.firstName,
                lastName: values.lastName,
            };
            // Assume backend has PATCH /users/profile or similar endpoint
            await apiClient.patch('/users/profile', updatePayload); // Adjust endpoint if needed
            toast.success("Profile updated successfully!");

        } catch (error: unknown) {
            let errorMessage = "Failed to update profile.";
            if (error && typeof error === "object" && "response" in error && error.response && typeof error.response === "object" && "data" in error.response && error.response.data && typeof error.response.data === "object" && "message" in error.response.data) {
                errorMessage = (error.response as { data: { message?: string } }).data.message || errorMessage;
            }
            console.error("Profile update error:", error);
            toast.error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    if (isFetching) {
        return <Layout><p>Loading profile...</p></Layout>; // Or a spinner component
    }

    return (
        <Layout>
            <Card>
                <CardHeader>
                    <CardTitle>My Profile</CardTitle>
                    <CardDescription>Manage your personal information.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Email</FormLabel>
                                        <FormControl>
                                            <Input {...field} readOnly disabled />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="role"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Role</FormLabel>
                                        <FormControl>
                                            <Input {...field} readOnly disabled />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="firstName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>First Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Your first name" {...field} disabled={isLoading} />
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
                                            <Input placeholder="Your last name" {...field} disabled={isLoading} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <Button type="submit" disabled={isLoading}>
                                {isLoading ? "Saving..." : "Save Changes"}
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </Layout>
    );
}

export default withAuth(ProfilePage);