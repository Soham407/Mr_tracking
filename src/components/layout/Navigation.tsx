import { 
  CalendarIcon, 
  FileIcon, 
  SearchIcon, 
  SettingsIcon, 
  UserIcon, 
  UsersIcon, 
  ChartBarIcon, 
  PlusIcon,
  Pill
} from "lucide-react";
import { useState } from 'react';
import { NavLink } from "react-router-dom";
import { useUser } from "@/context/UserContext"; // Import useUser
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface NavigationProps {
  userRole: string;
}

export function Navigation({ userRole }: NavigationProps) {
  const { user } = useUser(); // Get user from context
  const isInactiveMr = user?.role === 'mr' && user?.status === 'inactive';

  // Admin navigation items
  const adminNavItems = [
    {
      title: "Dashboard",
      href: "/admin/dashboard",
      icon: ChartBarIcon,
    },
    {
      title: "Users",
      href: "/admin/users",
      icon: UsersIcon,
    },
    {
      title: "Doctors",
      href: "/admin/doctors",
      icon: UserIcon,
    },
    {
      title: "Medicines",
      href: "/admin/medicines",
      icon: Pill,
    },
    {
      title: "Medical",
      href: "/admin/medicals",
      icon: Pill,
    },
    {
      title: "Reports",
      icon: FileIcon,
      children: [
        { title: "Report", href: "/admin/reports" },
        { title: "Medical Report", href: "/admin/medical-reports" }, // Updated href
      ],
    },
  ];

  // Base MR navigation items
  let mrNavItems = [
    {
      title: "Dashboard",
      href: "/mr/dashboard",
      icon: ChartBarIcon,
    },
    {
      title: "Log Visit",
      icon: PlusIcon,
      children: [
        { title: "Doctors", href: "/mr/visits/new?type=doctor" },
        { title: "Medical", href: "/mr/visits/new?type=medical" },
      ],
    },
    {
      title: "Doctors",
      href: "/mr/doctors",
      icon: UserIcon,
    },
    {
      title: "Medicals",
      href: "/mr/medicals",
      icon: Pill,
    },
    {
      title: "Visits",
      href: "/mr/visits",
      icon: CalendarIcon,
    },
    {
      title: "Reports",
      icon: FileIcon,
      children: [
        { title: "Report", href: "/mr/reports" },
        { title: "Medical Report", href: "/mr/medical-reports" }, // Updated href
      ],
    },
  ];

  // Filter out "Log Visit" if MR is inactive
  if (isInactiveMr) {
    mrNavItems = mrNavItems.filter(item => item.href !== "/mr/visits/new");
  }

  // Choose which navigation items to show based on user role
  const navItems = userRole === "admin" ? adminNavItems : mrNavItems;

  return (
    <nav className="space-y-1 px-2 py-3">
      {navItems.map((item) =>
        item.children ? (
          <Collapsible key={item.title}>
            <CollapsibleTrigger className={`nav-link flex items-center justify-start w-full`}>
              <item.icon className="h-4 w-4" />
              <span>{item.title}</span>
            </CollapsibleTrigger>
            <CollapsibleContent>
              {item.children.map((child) => (
                <NavLink
                  key={child.href}
                  to={child.href}
                  className={({ isActive }) =>
                    `nav-link ${isActive ? "active" : ""}`
                  }
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                >
                  {child.title}
                </NavLink>
              ))}
            </CollapsibleContent>
          </Collapsible>
        ) : (
          <NavLink
            key={item.href}
            to={item.href}
            className={({ isActive }) =>
              `nav-link ${isActive ? "active" : ""}`
            }
          >
            <item.icon className="h-4 w-4" />
            <span>{item.title}</span>
          </NavLink>
        )
      )}
    </nav>
  );
}
