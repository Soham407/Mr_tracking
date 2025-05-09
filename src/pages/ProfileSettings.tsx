// src/pages/ProfileSettings.tsx
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client'; // Assuming client is exported like this
import ProfileSettingsForm from '@/components/profile/ProfileSettingsForm'; // We'll create this next
import { useAuth } from '@/hooks/useAuth'; // Assuming you have a hook to get the current user
import { AppLayout } from "@/components/layout/AppLayout"; // Import AppLayout
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast"; // Or sonner if you prefer
import { Tables } from '../../supabase/types'; // Corrected import path

// Use the generated Row type for profile data
type UserProfile = Tables<'profiles'>;


const ProfileSettings: React.FC = () => {
    const { user } = useAuth(); // Get the authenticated user
    const [loading, setLoading] = useState<boolean>(true);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchProfile = async () => {
            if (!user) {
                setError("User not authenticated.");
                setLoading(false);
                return;
            }

            setLoading(true);
            setError(null);
            try {
                const { data, error: fetchError, status } = await supabase
                    .from('profiles')
                    .select(`*`) // Select specific columns if needed: 'username, full_name, website, avatar_url'
                    .eq('id', user.id)
                    .single();

                if (fetchError && status !== 406) { // 406 means no row found, which might be okay if profile is created later
                    throw fetchError;
                }

                if (data) {
                    setProfile(data); // No need for 'as UserProfile' anymore
                } else if (status === 406) {
                    // Handle case where profile doesn't exist yet.
                    // We cannot set a partial profile here as it won't match the UserProfile type.
                    // The form should handle the initial creation/upsert if needed.
                    // For now, let's treat it as an error or show a specific message.
                    console.warn("Profile not found for user:", user.id);
                    setError("Profile not found. Please complete your profile.");
                    // Or setProfile(null) and handle the null case in the return statement
                }
            } catch (fetchError: any) {
                console.error("Error fetching profile:", fetchError);
                setError(`Failed to load profile: ${fetchError.message}`);
                toast({
                    title: "Error",
                    description: "Could not load your profile data.",
                    variant: "destructive",
                });
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [user]); // Re-run if the user object changes

    if (loading) {
        return <div>Loading profile...</div>; // Replace with a Skeleton loader if desired
    }

    if (error) {
        return <div className="text-red-500">{error}</div>;
    }

    if (!profile) {
        return <div>Could not load profile information.</div>;
    }

    // Determine title based on role if needed, or keep generic
    // AppLayout handles the title/header internally
    // const pageTitle = "Profile Settings"; 

    return (
        <AppLayout> {/* Wrap content in AppLayout (no title prop) */}
            <div className="container mx-auto p-4"> {/* Keep container for padding */}
                <Card>
                    <CardHeader>
                        <CardTitle>Profile Settings</CardTitle>
                    <CardDescription>Update your personal information.</CardDescription>
                </CardHeader>
                <CardContent>
                        {/* Pass profile data and user ID to the form */}
                        <ProfileSettingsForm key={profile.id} profileData={profile} userId={user!.id} />
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
};

export default ProfileSettings;
