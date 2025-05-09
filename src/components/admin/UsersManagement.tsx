import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger, // Added for potential future use if needed
  DialogClose, // Added for delete confirmation
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog" // Using AlertDialog for confirmation is better practice
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
// Updated imports for icons
import { CheckCircle, PlusIcon, Search, XCircle, Trash2, Power, PowerOff } from "lucide-react";

// Helper function to format date as dd-Mon-yy
const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return "-";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) { // Check if date is valid
      return "-";
    }
    const day = String(date.getDate()).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2); // Get last two digits of year
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = monthNames[date.getMonth()];
    return `${day}-${month}-${year}`;
  } catch (e) {
    console.error("Error formatting date:", dateString, e);
    return "-"; // Return fallback on error
  }
};

export function UsersManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false); // Renamed for clarity
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    password: "",
    role: "mr",
    region: "",
  });
  const [formErrors, setFormErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
  }>({});
  // State for delete confirmation
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);


  useEffect(() => {
    fetchUsers();
  }, []);
  
  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("*");
        
      if (error) {
        throw error;
      }
      
      setUsers(data || []);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to load users");
    } finally {
      setIsLoading(false);
    }
  };
  
  const validateForm = () => {
    const errors: {
      name?: string;
      email?: string;
      password?: string;
    } = {};
    let isValid = true;
    
    if (!newUser.name.trim()) {
      errors.name = "Name is required";
      isValid = false;
    }
    
    if (!newUser.email.trim()) {
      errors.email = "Email is required";
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(newUser.email)) {
      errors.email = "Email is invalid";
      isValid = false;
    }
    
    if (!newUser.password.trim()) {
      errors.password = "Password is required";
      isValid = false;
    } else if (newUser.password.length < 6) {
      errors.password = "Password must be at least 6 characters";
      isValid = false;
    }
    
    setFormErrors(errors);
    return isValid;
  };
  
  const handleAddUser = async () => {
    if (!validateForm()) {
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // First create the auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newUser.email,
        password: newUser.password,
        options: {
          data: {
            name: newUser.name,
          }
        }
      });
      
      if (authError) throw authError;
      
      // Explicitly insert the profile data after successful signup
      if (authData.user) {
        const { error: insertError } = await supabase
          .from("profiles")
          .insert({
            id: authData.user.id, // Link to the auth user
            name: newUser.name,
            email: newUser.email, // Store email in profile too if needed, or remove if redundant
            role: newUser.role,
            region: newUser.region || null,
            status: "active" // Set status directly
          });

        if (insertError) throw insertError;
      } else {
        // Handle case where user object is unexpectedly null after signup
        throw new Error("User creation succeeded but user data is missing.");
      }

      toast.success("User added successfully!");
      setIsAddUserDialogOpen(false); // Use renamed state setter
      fetchUsers(); // Refresh the users list

      // Reset form
      setNewUser({
        name: "",
        email: "",
        password: "",
        role: "mr",
        region: "",
      });
      setFormErrors({});
      
    } catch (error: any) {
      console.error("Error adding user:", error);
      
      // Handle specific auth errors
      if (error.message?.includes("already registered")) {
        setFormErrors({
          ...formErrors,
          email: "Email is already registered"
        });
      } else {
        toast.error(error.message || "Failed to add user");
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const updateUserStatus = async (userId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ status: newStatus })
        .eq("id", userId);
        
      if (error) throw error;
      
      toast.success(`User ${newStatus === "active" ? "approved" : "rejected"}`);
      fetchUsers(); // Refresh user list
    } catch (error: any) {
      console.error("Error updating user status:", error);
      toast.error(error.message || "Failed to update user status");
    }
  };

  // Function to toggle user status between active and inactive
  const toggleUserStatus = async (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "inactive" : "active";
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ status: newStatus })
        .eq("id", userId);

      if (error) throw error;

      toast.success(`User status updated to ${newStatus}`);
      fetchUsers(); // Refresh user list
    } catch (error: any) {
      console.error("Error updating user status:", error);
      toast.error(error.message || "Failed to update user status");
    }
  };

  // Function to delete a user
  const handleDeleteUser = async (userId: string) => {
    try {
      setIsSubmitting(true); // Indicate processing

      // 1. Delete the user from Supabase Auth
      // IMPORTANT: This requires admin privileges. Ensure your Supabase client is configured
      // correctly or move this logic to a secure backend/edge function.
      // You might need to create a Supabase Edge Function for this.
      // For now, assuming admin client is available or this runs in a secure context.
      const { error: authError } = await supabase.auth.admin.deleteUser(userId);
      if (authError) {
        // Handle cases like user not found, though deletion should ideally cascade or be handled
        if (authError.message.includes("User not found")) {
          console.warn(`Auth user ${userId} not found, attempting profile deletion.`);
        } else {
          // Check if the error is due to insufficient permissions
          if (authError.message.includes("Database error saving new user") || authError.message.includes("permission denied")) {
             toast.error("Admin privileges required to delete users. Please configure server-side deletion.");
          } else {
            throw authError; // Rethrow other auth errors
          }
          // Stop execution if auth deletion failed critically (unless it was just 'not found')
          setIsSubmitting(false);
          return;
        }
      }

      // 2. Delete the user's profile from the 'profiles' table
      // This might be redundant if cascade delete is set up on the foreign key,
      // but explicit deletion is safer if unsure.
      const { error: profileError } = await supabase
        .from("profiles")
        .delete()
        .eq("id", userId);

      if (profileError) {
        throw profileError; // Throw profile deletion errors
      }

      toast.success("User deleted successfully!");
      fetchUsers(); // Refresh the list
      setIsDeleteDialogOpen(false); // Close confirmation dialog
      setUserToDelete(null); // Clear selected user

    } catch (error: any) {
      console.error("Error deleting user:", error);
      toast.error(error.message || "Failed to delete user");
    } finally {
      setIsSubmitting(false);
    }
  };


  // Filter and sort users based on search term and role
  const adminUsers = users
    .filter(
      (user) =>
        user.role === 'admin' &&
        (user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
         user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
         (user.region && user.region.toLowerCase().includes(searchTerm.toLowerCase())) ||
         user.status.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    .sort((a, b) => a.name.localeCompare(b.name)); // Sort by name A-Z

  const mrUsers = users
    .filter(
      (user) =>
        user.role === 'mr' &&
        (user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
         user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
         (user.region && user.region.toLowerCase().includes(searchTerm.toLowerCase())) ||
         user.status.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    .sort((a, b) => a.name.localeCompare(b.name)); // Sort by name A-Z


  return (
    <div className="space-y-6"> {/* Increased spacing */}
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Users Management</h2>
        <Button onClick={() => setIsAddUserDialogOpen(true)}>
          <PlusIcon className="mr-2 h-4 w-4" /> Add User
        </Button>
      </div>
      
      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search users by name, email, role, region, or status..." // Updated placeholder
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center py-8">
          <p>Loading users...</p>
        </div>
      ) : (
        <>
          {/* Administrators Table */}
          <div className="space-y-2">
            <h3 className="text-2xl font-semibold tracking-tight">Administrators</h3>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    {/* Removed Role column as it's implicit */}
                    <TableHead className="hidden md:table-cell">Region</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {adminUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center"> {/* Adjusted colSpan */}
                        No administrators found{searchTerm ? " matching your search" : ""}.
                      </TableCell>
                    </TableRow>
                  ) : (
                    adminUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell className="hidden md:table-cell">{user.region || "-"}</TableCell>
                        <TableCell>
                          <div className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
                            user.status === "active"
                              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                              : user.status === "inactive"
                              ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
                              : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
                          }`}>
                            {user.status}
                          </div>
                        </TableCell>
                        <TableCell>{formatDate(user.created_at)}</TableCell>
                        <TableCell className="text-right">
                          <span className="text-xs text-muted-foreground italic">No actions</span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Medical Representatives Table */}
          <div className="space-y-2">
            <h3 className="text-2xl font-semibold tracking-tight">Medical Representatives</h3>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    {/* Removed Role column */}
                    <TableHead className="hidden md:table-cell">Region</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mrUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center"> {/* Adjusted colSpan */}
                        No Medical Representatives found{searchTerm ? " matching your search" : ""}.
                      </TableCell>
                    </TableRow>
                  ) : (
                    mrUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell className="hidden md:table-cell">{user.region || "-"}</TableCell>
                        <TableCell>
                          <div className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
                            user.status === "active"
                              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                              : user.status === "inactive"
                              ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
                              : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
                          }`}>
                            {user.status}
                          </div>
                        </TableCell>
                        <TableCell>{formatDate(user.created_at)}</TableCell>
                        <TableCell className="text-right">
                          {/* Actions specific to MR role */}
                          <div className="flex justify-end space-x-2">
                            {user.status === "active" ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => toggleUserStatus(user.id, user.status)}
                                title="Deactivate User"
                              >
                                <PowerOff className="h-4 w-4" />
                              </Button>
                            ) : user.status === "inactive" ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => toggleUserStatus(user.id, user.status)}
                                title="Activate User"
                              >
                                <Power className="h-4 w-4" />
                              </Button>
                            ) : null}
                            {/* Display Approve/Reject for 'pending' status */}
                            {user.status === "pending" && (
                              <>
                                <Button
                                  onClick={() => updateUserStatus(user.id, "active")}
                                  size="sm"
                                  className="bg-green-500 hover:bg-green-600"
                                  title="Approve User"
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                                <Button
                                  onClick={() => updateUserStatus(user.id, "rejected")}
                                  size="sm"
                                  variant="destructive"
                                  title="Reject User"
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            {/* Delete Button - always show for MRs */}
                            {/*
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => {
                                setUserToDelete(user);
                                setIsDeleteDialogOpen(true);
                              }}
                              title="Delete User"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                            */}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </>
      )}

      {/* Add User Dialog */}
      <Dialog open={isAddUserDialogOpen} onOpenChange={setIsAddUserDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>
              Create a new user account. The user status will be set to 'active'.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                placeholder="Soham Bhutkar"
                className={formErrors.name ? "border-red-500" : ""}
              />
              {formErrors.name && (
                <p className="text-xs text-red-500">{formErrors.name}</p>
              )}
            </div>
            {/* Email Input */}
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                placeholder="soham.abc@example.com"
                className={formErrors.email ? "border-red-500" : ""}
              />
              {formErrors.email && (
                <p className="text-xs text-red-500">{formErrors.email}</p>
              )}
            </div>
            {/* Password Input */}
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                placeholder="•••••••• (min. 6 characters)"
                className={formErrors.password ? "border-red-500" : ""}
              />
              {formErrors.password && (
                <p className="text-xs text-red-500">{formErrors.password}</p>
              )}
            </div>
            {/* Role Select */}
            <div className="grid gap-2">
              <Label htmlFor="role">Role</Label>
              <Select
                value={newUser.role}
                onValueChange={(value) => setNewUser({ ...newUser, role: value })}
              >
                <SelectTrigger id="role">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mr">Medical Representative</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  {/* Add other roles if applicable */}
                </SelectContent>
              </Select>
            </div>
            {/* Region Input */}
            <div className="grid gap-2">
              <Label htmlFor="region">Region (Optional)</Label>
              <Input
                id="region"
                value={newUser.region}
                onChange={(e) => setNewUser({ ...newUser, region: e.target.value })}
                placeholder="e.g., North, South"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddUserDialogOpen(false)}> {/* Use renamed state setter */}
              Cancel
            </Button>
            <Button onClick={handleAddUser} disabled={isSubmitting}>
              {isSubmitting ? "Adding..." : "Add User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the user{' '}
              <span className="font-semibold">{userToDelete?.name} ({userToDelete?.email})</span>{' '}
              and remove their data from the servers. This requires admin privileges.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setUserToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => userToDelete && handleDeleteUser(userToDelete.id)}
              disabled={isSubmitting}
              className="bg-red-600 hover:bg-red-700" // Destructive style
            >
              {isSubmitting ? "Deleting..." : "Yes, delete user"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
