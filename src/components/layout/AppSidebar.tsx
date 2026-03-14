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
  const isManager = profile?.role === 'manager';

  // Filter items based on role
  const filteredNavItems = navItems.filter(item => {
    if (isManager) return true;
    // Staff only see operational items
    return ["Dashboard", "Products", "Receipts", "Deliveries", "Transfers"].includes(item.title);
  });

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      useAuthStore.getState().reset?.(); // clear store if reset exists
      
      // Clear any cached state
      queryClient.clear();
      
      // Clear local and session storage
      localStorage.clear();
      sessionStorage.clear();
      
      toast.success("Logged out from CoreInventory");
      window.location.href = '/auth';
    } catch (err) {
      toast.error("An unexpected error occurred during logout");
      console.error(err);
    }
  };

  const initials = profile?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';

  return (
    <Sidebar collapsible="icon" className="border-r border-indigo-950/20 bg-slate-900 text-slate-100 shadow-2xl">
      <div className="p-6 flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-indigo-500 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(99,102,241,0.5)]">
          <ShieldCheck className="h-5 w-5 text-white" />
        </div>
        {!collapsed && (
            <div className="flex flex-col">
                <span className="font-bold text-white text-base leading-none tracking-tight">CoreInventory</span>
                <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-[0.2em] mt-1">Enterprise</span>
            </div>
        )}
      </div>
      
      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1.5">
              {filteredNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink
                      to={item.url}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-all duration-200 group relative"
                      activeClassName="bg-indigo-600 text-white shadow-md shadow-indigo-500/20 font-semibold border-l-2 border-indigo-500"
                    >
                      <item.icon className="h-4 w-4 shrink-0 transition-transform group-hover:scale-110" />
                      {!collapsed && <span className="text-sm font-medium">{item.title}</span>}
                      {/* Active indicator dot */}
                      {!collapsed && (
                        <div className="absolute right-3 opacity-0 group-[.active]:opacity-100 transition-opacity">
                          <Circle className="h-1.5 w-1.5 fill-indigo-500 text-indigo-500" />
                        </div>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-slate-800 bg-slate-900/80 backdrop-blur-md">
        {!collapsed && (
          <div className="px-2 mb-4 flex items-center gap-3 bg-slate-800/40 p-3 rounded-2xl border border-slate-700/50">
             <Avatar className="h-9 w-9 border-2 border-indigo-500/30 shadow-lg shadow-indigo-500/10">
                <AvatarImage src={profile?.avatar_url || user?.user_metadata?.avatar_url} />
                <AvatarFallback className="bg-indigo-600 text-white text-[10px] font-bold">{initials}</AvatarFallback>
             </Avatar>
             <div className="flex flex-col min-w-0">
                <span className="text-sm font-bold text-slate-100 truncate">{profile?.full_name || "User Name"}</span>
                <span className="text-[10px] text-indigo-400 font-black uppercase tracking-widest truncate">{profile?.role || "Staff"}</span>
             </div>
          </div>
        )}
        <SidebarMenu className="gap-1">
          {isManager && (
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Settings">
                <NavLink
                  to="/settings"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-all duration-200 group"
                  activeClassName="bg-indigo-600/10 text-indigo-400 font-semibold border-l-2 border-indigo-500"
                >
                  <Settings className="h-4 w-4 shrink-0 transition-transform group-hover:scale-110" />
                  {!collapsed && <span className="text-sm">Global Settings</span>}
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="My Profile">
              <NavLink
                to="/profile"
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-all duration-200 group"
                activeClassName="bg-indigo-600/10 text-indigo-400 font-semibold border-l-2 border-indigo-500"
              >
                <User className="h-4 w-4 shrink-0 transition-transform group-hover:scale-110" />
                {!collapsed && <span className="text-sm">Account Center</span>}
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton 
                onClick={handleLogout} 
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-500 hover:bg-rose-500/10 hover:text-rose-400 transition-all cursor-pointer mt-2 group"
            >
              <LogOut className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
              {!collapsed && <span className="text-sm font-bold">Sign Out</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

