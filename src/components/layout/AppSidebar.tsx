import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/authStore";
import {
  LayoutDashboard, Package, PackageCheck, Truck,
  ArrowLeftRight, SlidersHorizontal, History, Settings, User, LogOut,
  ShieldCheck, Circle
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const navItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Products", url: "/products", icon: Package },
  { title: "Receipts", url: "/receipts", icon: PackageCheck },
  { title: "Deliveries", url: "/deliveries", icon: Truck },
  { title: "Transfers", url: "/transfers", icon: ArrowLeftRight },
  { title: "Adjustments", url: "/adjustments", icon: SlidersHorizontal },
  { title: "Move History", url: "/history", icon: History },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const navigate = useNavigate();
  const { profile, user } = useAuthStore();

  const queryClient = useQueryClient();

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        toast.error('Logout failed: ' + error.message);
        return;
      }
      
      // Clear any cached state
      queryClient.clear();
      
      // Clear local and session storage
      localStorage.clear();
      sessionStorage.clear();
      
      toast.success("Logged out from CoreInventory");
      navigate("/auth", { replace: true });
    } catch (err) {
      toast.error("An unexpected error occurred during logout");
      console.error(err);
    }
  };

  const initials = profile?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';

  return (
    <Sidebar collapsible="icon" className="border-r border-slate-200/50 bg-slate-50/50 backdrop-blur-xl">
      <div className="p-6 flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-200">
          <ShieldCheck className="h-5 w-5 text-white" />
        </div>
        {!collapsed && (
            <div className="flex flex-col">
                <span className="font-bold text-slate-900 text-base leading-none tracking-tight">CoreInventory</span>
                <span className="text-[10px] text-indigo-600 font-bold uppercase tracking-[0.2em] mt-1">Enterprise</span>
            </div>
        )}
      </div>
      
      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink
                      to={item.url}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 hover:bg-white hover:text-indigo-600 hover:shadow-sm transition-all duration-200 group"
                      activeClassName="bg-white text-indigo-600 shadow-sm font-semibold border-l-4 border-indigo-600"
                    >
                      <item.icon className="h-4 w-4 shrink-0 transition-transform group-hover:scale-110" />
                      {!collapsed && <span className="text-sm">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-slate-200/50 bg-slate-100/30">
        {!collapsed && (
          <div className="px-2 mb-4 flex items-center gap-3">
             <Avatar className="h-9 w-9 border-2 border-white shadow-sm">
                <AvatarImage src={profile?.avatar_url || user?.user_metadata?.avatar_url} />
                <AvatarFallback className="bg-indigo-600 text-white text-[10px] font-bold">{initials}</AvatarFallback>
             </Avatar>
             <div className="flex flex-col min-w-0">
                <span className="text-sm font-bold text-slate-900 truncate">{profile?.full_name || "User Name"}</span>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider truncate">{profile?.role || "Staff"}</span>
             </div>
          </div>
        )}
        <SidebarMenu className="gap-1">
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Settings">
              <NavLink
                to="/settings"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 hover:bg-white hover:text-indigo-600 hover:shadow-sm transition-all duration-200 group"
                activeClassName="bg-white text-indigo-600 shadow-sm font-semibold border-l-4 border-indigo-600"
              >
                <Settings className="h-4 w-4 shrink-0 transition-transform group-hover:scale-110" />
                {!collapsed && <span className="text-sm">Settings</span>}
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="My Profile">
              <NavLink
                to="/profile"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 hover:bg-white hover:text-indigo-600 hover:shadow-sm transition-all duration-200 group"
                activeClassName="bg-white text-indigo-600 shadow-sm font-semibold border-l-4 border-indigo-600"
              >
                <User className="h-4 w-4 shrink-0 transition-transform group-hover:scale-110" />
                {!collapsed && <span className="text-sm">Account Settings</span>}
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton 
                onClick={handleLogout} 
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-all cursor-pointer mt-1 group"
            >
              <LogOut className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
              {!collapsed && <span className="text-sm font-medium">Log out</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

