import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@/types";
import Login from "./Login";
import { Button } from "@/components/ui/button";

const Index = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    let mounted = true;
    
    const checkUserStatus = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !session) {
          if (mounted) {
            setIsLoading(false);
          }
          return;
        }

        // First try to get the profile
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();

        // If profile doesn't exist, create one
        if (profileError?.code === 'PGRST116' || !profile) {
          // Check if a profile with this email already exists
          const { data: existingProfile, error: checkError } = await supabase
            .from("profiles")
            .select("id")
            .eq("email", session.user.email)
            .single();

          if (checkError && checkError.code !== 'PGRST116') {
            console.error("Error checking existing profile:", checkError);
            if (mounted) {
              setIsLoading(false);
            }
            return;
          }

          if (existingProfile) {
            // If profile exists with same email but different ID, update the ID
            const { error: updateError } = await supabase
              .from("profiles")
              .update({ id: session.user.id })
              .eq("id", existingProfile.id);

            if (updateError) {
              console.error("Error updating profile ID:", updateError);
              if (mounted) {
                setIsLoading(false);
              }
              return;
            }
          } else {
            // Create new profile
            const { data: newProfile, error: createError } = await supabase
              .from("profiles")
              .insert({
                id: session.user.id,
                email: session.user.email,
                name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
                role: 'mr', // Default role
                status: 'pending' // Default status
              })
              .select()
              .single();

            if (createError) {
              console.error("Error creating profile:", createError);
              if (mounted) {
                setIsLoading(false);
              }
              return;
            }

            if (mounted) {
              setUser(newProfile);
            }
          }
        } else if (profileError) {
          console.error("Error fetching profile:", profileError);
          if (mounted) {
            setIsLoading(false);
          }
          return;
        } else {
          if (mounted) {
            setUser(profile);
          }
        }

        if (mounted) {
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Error in checkUserStatus:", error);
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    checkUserStatus();

    // Listen for auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        checkUserStatus(); // Re-check status on login
      } else {
        setUser(null);
        setIsLoading(false);
      }
    });

    return () => {
      mounted = false;
      authListener?.subscription.unsubscribe();
    };
  }, [navigate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-pulse text-lg">Loading...</div>
      </div>
    );
  }

  if (user && user.status === "pending") {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-center space-y-4">
        <h1 className="text-3xl font-bold">Account Pending Approval</h1>
        <p className="text-muted-foreground">
          Your account is currently pending administrator approval.
        </p>
        <p className="text-muted-foreground">
          You will receive an email notification once your account has been activated.
        </p>
        <Button onClick={async () => {
          await supabase.auth.signOut();
          setUser(null);
          navigate("/");
        }}>Sign Out</Button>
      </div>
    );
  }

  return <Login />;
};

export default Index;
