import { ReactNode, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Sidebar, SidebarContent, SidebarHeader, SidebarProvider } from "@/components/ui/sidebar";
import { UserProvider, useUser } from "@/context/UserContext"; // Import UserProvider and useUser
import { MobileNavigation } from "./MobileNavigation";
import { Navigation } from "./Navigation";
import { UserNav } from "./UserNav";
import { supabase } from "@/integrations/supabase/client";
// User type is now managed by context

interface AppLayoutProps {
  children: ReactNode;
}

// Inner component to access context after provider is set up
function AppLayoutContent({ children }: AppLayoutProps) {
  const { user, setUser, isLoading, setIsLoading } = useUser(); // Use context state
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;

    
    const fetchUser = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error("Session error:", sessionError);
          if (mounted) {
            navigate("/");
            setIsLoading(false);
          }
          return;
        }

        if (!session) {
          if (mounted) {
            navigate("/");
            setIsLoading(false);
          }
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();

        if (profileError || !profile) {
          console.error("Error fetching profile:", profileError);
          if (mounted) {
            navigate("/");
            setIsLoading(false);
          }
          return;
        }

        if (profile.status === "pending") {
          if (mounted) {
            navigate("/");
            setIsLoading(false);
          }
          return;
        }

        if (mounted) {
          setUser(profile); // Set user in context
          setIsLoading(false); // Set loading in context

          // If on the wrong dashboard, redirect to the correct one
          if (profile.role === "admin" && location.pathname.startsWith("/mr")) {
            navigate("/admin/dashboard");
          } else if (profile.role === "mr" && location.pathname.startsWith("/admin")) {
            navigate("/mr/dashboard");
          }
        }
      } catch (error) {
        console.error("Error in fetchUser:", error);
        if (mounted) {
          navigate("/");
          setIsLoading(false);
        }
      }
    };

    fetchUser();

    // Listen for auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        if (mounted) {
          navigate("/");
        }
      } else {
        fetchUser(); // Re-fetch user on auth state change
      }
    });

    return () => {
      mounted = false;
      authListener?.subscription.unsubscribe();
    };

  }, [navigate, location.pathname, setUser, setIsLoading]); // Add context setters to dependency array

  // If loading or no user is set, show loading
  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-pulse text-lg">Loading...</div>
      </div>
    );
  }

  // Determine user role and name for child components
  const userRole = user?.role || 'mr'; // Default to 'mr' or handle appropriately
  const userName = user?.name || 'User'; // Default name

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-muted/40">
        <Sidebar className="hidden md:block">
          <SidebarHeader className="flex h-14 items-center border-b px-4">
            <span className="font-semibold">MR Tracking</span>
          </SidebarHeader>
          <SidebarContent>
            <Navigation userRole={userRole} /> {/* Pass role */}
          </SidebarContent>
        </Sidebar>

        <div className="flex flex-col w-full">
          <header className="flex h-14 items-center gap-4 border-b bg-background px-4 lg:px-6">
            <span className="md:hidden font-semibold">MR Tracking</span>
            <div className="ml-auto flex items-center gap-2">
              <UserNav userName={userName} userRole={userRole} /> {/* Pass name and role */}
            </div>
          </header>
          <main className="flex-1 p-4 md:p-6">
            <div className="mx-auto max-w-7xl animate-fade-in">{children}</div>
          </main>
          <MobileNavigation className="md:hidden" userRole={userRole} /> {/* Pass role */}
        </div>
      </div>
    </SidebarProvider>
  );
}

// Wrap the content component with the provider
export function AppLayout({ children }: AppLayoutProps) {
  return (
    <UserProvider>
      <AppLayoutContent>{children}</AppLayoutContent>
    </UserProvider>
  );
}
