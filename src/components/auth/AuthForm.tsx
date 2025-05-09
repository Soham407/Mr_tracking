import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { supabase } from "@/integrations/supabase/client";
import { FaEye, FaEyeSlash } from 'react-icons/fa'; // Assuming react-icons is installed
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const loginSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
});

const registerSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
});

type LoginValues = z.infer<typeof loginSchema>;
type RegisterValues = z.infer<typeof registerSchema>;

export function AuthForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [isInactiveMrDialogOpen, setIsInactiveMrDialogOpen] = useState(false); // State for the inactive MR dialog
  const [showLoginPassword, setShowLoginPassword] = useState(false); // State for login password visibility
  const [showRegisterPassword, setShowRegisterPassword] = useState(false); // State for register password visibility
  const navigate = useNavigate();

  // Login form
  const loginForm = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Register form
  const registerForm = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  const onLogin = async (data: LoginValues) => {
    setIsLoading(true);
    
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (authError) {
        throw authError;
      }

      if (authData.user) {
        // Get the user's profile to determine their role
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", authData.user.id)
          .single();

        if (profileError) {
          // If profile doesn't exist, create one
          const { data: newProfile, error: createError } = await supabase
            .from("profiles")
            .insert({
              id: authData.user.id,
              email: authData.user.email,
              name: authData.user.user_metadata?.full_name || authData.user.email?.split('@')[0] || 'User',
              role: 'mr', // Default role
              status: 'pending' // Default status
            })
            .select()
            .single();

          if (createError) {
            throw createError;
          }

          if (newProfile) {
            if (newProfile.status === "pending") {
              toast.error("Your account is pending approval. Please wait for admin approval.");
              return;
            }

            // Store user data in localStorage
            localStorage.setItem("user", JSON.stringify({
              id: authData.user.id,
              email: authData.user.email,
              name: newProfile.name,
              role: newProfile.role,
            }));

            // Navigate based on role
            if (newProfile.role === "admin") {
              navigate("/admin/dashboard");
            } else {
              navigate("/mr/dashboard");
            }
          }
        } else if (profile) {
          // Check for inactive MR status
          if (profile.role === 'mr' && profile.status === 'inactive') {
            setIsInactiveMrDialogOpen(true); // Open the dialog
            // Log out the user from Supabase session
            await supabase.auth.signOut();
            return; // Prevent further execution
          }

          if (profile.status === "pending") {
            toast.error("Your account is pending approval. Please wait for admin approval.");
            // Optionally log out pending users as well
            await supabase.auth.signOut();
            return;
          }

          if (profile.status === "rejected") {
            toast.error("Your account has been rejected. Please contact the administrator for assistance.");
            await supabase.auth.signOut();
            return;
          }

          // Store user data in localStorage
          localStorage.setItem("user", JSON.stringify({
            id: authData.user.id,
            email: authData.user.email,
            name: profile.name,
            role: profile.role,
          }));

          // Navigate based on role
          if (profile.role === "admin") {
            navigate("/admin/dashboard");
          } else {
            navigate("/mr/dashboard");
          }
        }
        
        toast.success("Login successful");
      }
    } catch (error: unknown) {
      console.error("Login error:", error);
      if (error instanceof Error) {
        toast.error(error.message || "Failed to login. Please check your credentials.");
      } else {
        toast.error("Failed to login. Please check your credentials.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const onRegister = async (data: RegisterValues) => {
    setIsLoading(true);
    
    try {
      // Removed problematic console.logs
      
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            name: data.name,
            role: "mr", // Default role for registration
            status: "pending", // Set status to pending for admin approval
          }
        }
      });
      
      if (authError) {
        console.error("Supabase auth error:", authError);
        throw authError;
      }
      
      // Removed problematic console.log
      
      // Explicitly update the profile to set the role and status
      if (authData.user) {
        const { error: updateError } = await supabase
          .from("profiles")
          .update({ 
            role: "mr", 
            status: "pending" 
          })
          .eq("id", authData.user.id);
          
        if (updateError) throw updateError;
      }
      
      toast.success("Registration successful! Please wait for admin approval.");
      loginForm.setValue("email", data.email); // Pre-fill email for login
      
    } catch (error: unknown) {
      console.error("Registration error:", error);
      
      if (error instanceof Error && error.message?.includes("already registered")) {
        registerForm.setError("email", {
          type: "manual",
          message: "Email is already registered",
        });
      } else {
        toast.error(error.message || "Failed to register. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">MR Tracking</h1>
        <p className="text-muted-foreground">MR Visit Tracking System</p>
      </div>
      
      <Tabs defaultValue="login" className="w-full">
        <TabsList className="grid grid-cols-2 w-full">
          <TabsTrigger value="login">Login</TabsTrigger>
          <TabsTrigger value="register">Register</TabsTrigger>
        </TabsList>
        
        <TabsContent value="login" className="mt-4 space-y-4">
          <Form {...loginForm}>
            <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
              <FormField
                control={loginForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="your.email@example.com" type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={loginForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <div className="relative">
                      <FormControl>
                        <Input
                          placeholder="******"
                          type={showLoginPassword ? "text" : "password"}
                          {...field}
                        />
                      </FormControl>
                      <div
                        className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer"
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                      >
                        {showLoginPassword ? <FaEyeSlash /> : <FaEye />}
                      </div>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>
              
              
            </form>
          </Form>
        </TabsContent>
        
        <TabsContent value="register" className="mt-4 space-y-4">
          <Form {...registerForm}>
            <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-4">
              <FormField
                control={registerForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Soham B" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={registerForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="your.email@example.com" type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={registerForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <div className="relative">
                      <FormControl>
                        <Input
                          placeholder="******"
                          type={showRegisterPassword ? "text" : "password"}
                          {...field}
                        />
                      </FormControl>
                      <div
                        className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer"
                        onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                      >
                        {showRegisterPassword ? <FaEyeSlash /> : <FaEye />}
                      </div>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Registering..." : "Register"}
              </Button>
              
              <div className="text-center text-sm text-muted-foreground">
                <p>Registration is open for Medical Representatives only.</p>
                <p>You'll need admin approval after registration.</p>
              </div>
            </form>
          </Form>
        </TabsContent>
      </Tabs>

      {/* Inactive MR Dialog */}
      <Dialog open={isInactiveMrDialogOpen} onOpenChange={setIsInactiveMrDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Account Inactive</DialogTitle>
            <DialogDescription>
              Your account is currently inactive. Please contact the administrator for assistance.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  );
}
