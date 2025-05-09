// src/components/profile/ProfileSettingsForm.tsx
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"; // Import Select components
import { Tables } from '../../../supabase/types'; // Import the generated type

// Use the generated Row type for profile data
type UserProfile = Tables<'profiles'>;


// Define props for the component
interface ProfileSettingsFormProps {
    profileData: UserProfile;
    userId: string; // Pass the user ID explicitly
}

// Define the validation schema using Zod, matching the 'profiles' table structure
// Only include fields the user should edit here.
const profileFormSchema = z.object({
    name: z.string().min(1, { message: "Name cannot be empty." }).max(100).optional().or(z.literal('')),
    region: z.string().max(50).optional().nullable(), // Allow region update if desired
});

// Infer the type from the Zod schema
type ProfileFormValues = z.infer<typeof profileFormSchema>;

const ProfileSettingsForm: React.FC<ProfileSettingsFormProps> = ({ profileData, userId }) => {
    const [loading, setLoading] = useState(false);

    const form = useForm<ProfileFormValues>({
        resolver: zodResolver(profileFormSchema),
        defaultValues: {
            name: profileData.name || '',
            region: profileData.region || null, // Initialize region from profile data
        },
        mode: 'onChange', // Validate on change
    });

    const onSubmit = async (data: ProfileFormValues) => {
        setLoading(true);
        try {
            // Construct the update object with only the fields present in the form schema
            const updates: Partial<Tables<'profiles'>> = {
                 // id is used in .eq() below, not in the update payload itself for .update()
                 // Remove 'updated_at' as it doesn't exist in the schema based on types.ts
            };

             // Add fields from the form data if they exist and are part of the schema
            if (data.name !== undefined) {
                updates.name = data.name || ''; // Use empty string or handle as needed
            }
            if (data.region !== undefined) {
                updates.region = data.region || null; // Store empty string as null if desired
            }
            // Add other fields from 'data' if they are part of the form schema

            // Use update, targeting the specific user ID
            const { error } = await supabase
                .from('profiles')
                .update(updates)
                .eq('id', userId); // Ensure we only update the correct profile

            if (error) {
                throw error;
            }

            toast({
                title: "Profile Updated",
                description: "Your profile information has been saved.",
            });
            // Optionally: refresh profile data in the parent component or redirect
            form.reset(data); // Reset form with new default values to clear dirty state
        } catch (error: any) {
            console.error("Error updating profile:", error);
            toast({
                title: "Update Failed",
                description: `Could not update profile: ${error.message}`,
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Name Field (was Username/Full Name) */}
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Name</FormLabel>
                            <FormControl>
                                <Input placeholder="Your full name" {...field} />
                            </FormControl>
                            {/* <FormDescription>Optional: Your display name.</FormDescription> */}
                            <FormMessage />
                        </FormItem>
                    )}
                />

                 {/* Region Field (Optional) */}
                 <FormField
                    control={form.control}
                    name="region"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Region (Optional)</FormLabel>
                            <FormControl>
                                {/* Pass null if field value is empty string to match Supabase type */}
                                <Input placeholder="Your region" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? null : e.target.value)} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* Removed Full Name and Website fields */}

                {/* Submit Button */}
                <Button type="submit" disabled={loading || !form.formState.isDirty}>
                    {loading ? 'Saving...' : 'Update Profile'}
                </Button>
                 {!form.formState.isDirty && <p className="text-sm text-muted-foreground pt-2">No changes detected.</p>}
            </form>
        </Form>
    );
};

export default ProfileSettingsForm;
