import {
  LayoutDashboard, Package, PackageCheck, Truck,
  ArrowLeftRight, SlidersHorizontal, History, Settings, User, LogOut,
  ShieldCheck
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";

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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out from StockSavvy");
    navigate("/auth");
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-slate-200/50 bg-slate-50/50 backdrop-blur-xl">
      <div className="p-6 flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-200">
          <ShieldCheck className="h-5 w-5 text-white" />
        </div>
        {!collapsed && (
            <div className="flex flex-col">
                <span className="font-bold text-slate-900 text-base leading-none">StockSavvy</span>
                <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider mt-1">Pro Edition</span>
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

      <SidebarFooter className="p-4 border-t border-slate-200/50">
        <SidebarMenu className="gap-1">
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Settings">
                <NavLink
                to="/settings"
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-500 hover:bg-white hover:text-slate-900 transition-all"
                activeClassName="bg-white text-slate-900 shadow-sm"
                >
                <Settings className="h-4 w-4" />
                {!collapsed && <span className="text-sm">Settings</span>}
                </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="My Profile">
              <NavLink
                to="/profile"
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-500 hover:bg-white hover:text-slate-900 transition-all font-medium"
                activeClassName="bg-white text-slate-900 shadow-sm"
              >
                <User className="h-4 w-4 shrink-0" />
                {!collapsed && <span className="text-sm">Account</span>}
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton 
                onClick={handleLogout} 
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-all cursor-pointer mt-2"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="text-sm">Log out</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

