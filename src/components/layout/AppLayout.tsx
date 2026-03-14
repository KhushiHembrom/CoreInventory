import { Outlet, useLocation } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { AppHeader } from "./AppHeader";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/products": "Products",
  "/receipts": "Receipts",
  "/deliveries": "Deliveries",
  "/transfers": "Internal Transfers",
  "/adjustments": "Stock Adjustments",
  "/history": "Move History",
  "/settings": "Settings",
  "/profile": "Profile",
};

export function AppLayout() {
  const location = useLocation();
  const baseRoute = "/" + location.pathname.split("/")[1];
  const title = pageTitles[baseRoute] || "CoreInventory";

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <AppHeader title={title} />
          <main className="flex-1 p-6 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
