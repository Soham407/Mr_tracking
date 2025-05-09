
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

interface UserNavProps {
  userName: string;
  userRole: string;
}

export function UserNav({ userName, userRole }: UserNavProps) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };
  
  const handleLogout = () => {
    localStorage.removeItem("user");
    toast.success("Logged out successfully");
    navigate("/");
  };

  return (
    <div className="flex items-center space-x-2"> {/* Add a container for name, role, and button */}
      <div className="flex items-center space-x-1"> {/* Container for name and role, now a flex row */}
        <p className={`font-medium ${userRole === 'admin' ? 'text-base' : 'text-base'}`}>{userName}-</p> {/* Increased name text size */}
        <p className={`text-muted-foreground capitalize font-bold ${userRole === 'admin' ? 'text-base' : 'text-base'}`}> {/* Increased Admin/MR text size and made bold */}
          {userRole === 'mr' ? 'Medical Representative' : 'Admin'}
        </p>
      </div>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-9 w-9 rounded-full">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-primary text-primary-foreground">
                {getInitials(userName)}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end">
          <DropdownMenuLabel>
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium">{userName}</p>
              <p className="text-xs text-muted-foreground capitalize">
                {userRole === 'mr' ? 'Medical Representative' : 'Admin'}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem
              onClick={() => {
                setIsOpen(false);
                navigate('/profile-settings'); // Navigate to the new unified profile settings page
              }}
            >
              Profile Settings
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout} className="text-red-500">
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
