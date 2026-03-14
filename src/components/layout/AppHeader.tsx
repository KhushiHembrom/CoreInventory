import { Bell, Warehouse, ShieldCheck, Plus, User, Settings, LogOut } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { useWarehouseStore } from "@/stores/warehouseStore";
import { useAuthStore } from "@/stores/authStore";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

export function AppHeader({ title }: { title: string }) {
  const navigate = useNavigate();
  const { selectedWarehouseId, setSelectedWarehouseId } = useWarehouseStore();
  const { profile, user, reset: handleLogout } = useAuthStore();

  const { data: warehouses } = useQuery({
    queryKey: ["warehouses"],
    queryFn: async () => {
      const { data } = await supabase.from("warehouses").select("*").order("name");
      return data || [];
    },
  });

  const { data: alertItems } = useQuery({
    queryKey: ['alerts'],
    queryFn: async () => {
      const { data } = await supabase
        .from('stock')
        .select('quantity, products(name, sku, reorder_level)')
      return data?.filter(
        s => s.quantity === 0 || 
        s.quantity < (s.products as any)?.reorder_level
      ) ?? []
    },
    staleTime: 30000,
  });

  const alertCount = alertItems?.length || 0;

  return (
    <header className="h-16 border-b bg-white/80 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-30 shadow-sm border-slate-100">
      <div className="flex items-center gap-4">
        <SidebarTrigger />
        <div className="h-6 w-[1px] bg-slate-200 mx-2" />
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Warehouse className="h-4 w-4" />
          <Select value={selectedWarehouseId || "all"} onValueChange={id => setSelectedWarehouseId(id === "all" ? null : id)}>
            <SelectTrigger className="w-[180px] h-9 border-gray-200 bg-white hover:bg-slate-50 focus:ring-0 px-3 gap-2 text-sm font-medium text-slate-900 transition-colors">
              <SelectValue placeholder="All Warehouses" />
            </SelectTrigger>
            <SelectContent className="z-50" position="popper" sideOffset={5}>
              <SelectItem value="all">All Locations</SelectItem>
              {warehouses?.map(w => (
                <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative hover:bg-slate-100 rounded-xl transition-colors">
              <Bell className="h-5 w-5 text-slate-600" />
              {alertCount > 0 && (
                <span className="absolute top-2 right-2 h-4 w-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white animate-in zoom-in">
                  {alertCount}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 p-0 border-slate-100 shadow-xl rounded-2xl overflow-hidden">
            <div className="p-4 bg-slate-50/80 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Stock Alerts</h3>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">Inventory level monitoring</p>
            </div>
            <div className="max-h-[350px] overflow-y-auto">
              {alertCount === 0 ? (
                <div className="p-10 text-center">
                  <div className="h-12 w-12 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-3">
                    <ShieldCheck className="h-6 w-6 text-emerald-500" />
                  </div>
                  <p className="text-sm font-medium text-slate-900">All stock levels healthy</p>
                  <p className="text-xs text-slate-500 mt-1">No critical issues detected</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {alertItems?.map((item, i) => {
                    const isOutOfStock = item.quantity === 0;
                    return (
                      <div key={i} className="p-4 hover:bg-slate-50 transition-colors group">
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <p className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{(item.products as any)?.name}</p>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className={`text-[10px] font-bold py-0 ${isOutOfStock ? "bg-rose-50 text-rose-600 border-rose-100" : "bg-amber-50 text-amber-600 border-amber-100"}`}>
                                {isOutOfStock ? "OUT OF STOCK" : "LOW STOCK"}
                              </Badge>
                              <span className="text-[10px] font-medium text-slate-400">{(item.products as any)?.sku}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`text-sm font-mono font-bold ${isOutOfStock ? "text-rose-600" : "text-amber-600"}`}>{item.quantity}</p>
                            <p className="text-[10px] text-slate-400">Limit: {(item.products as any)?.reorder_level}</p>
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="w-full mt-3 h-8 text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 border border-indigo-100 rounded-lg"
                          onClick={() => navigate('/receipts/new')}
                        >
                          <Plus className="h-3 w-3 mr-1.5" />
                          Restock Now
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            {alertCount > 0 && (
              <div className="p-3 bg-slate-50 border-t border-slate-100 text-center">
                <button 
                  onClick={() => navigate('/products')}
                  className="text-[10px] font-bold text-slate-500 hover:text-indigo-600 uppercase tracking-widest transition-colors"
                >
                  View All Products
                </button>
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="h-8 w-[1px] bg-slate-200" />
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-3 hover:bg-slate-100 rounded-xl px-2 h-10 transition-colors">
              <Avatar className="h-8 w-8 border-2 border-white shadow-sm ring-1 ring-slate-100">
                <AvatarImage src={profile?.avatar_url} />
                <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-500 text-white text-[10px] font-bold">
                  {profile?.full_name?.substring(0, 2).toUpperCase() || "UI"}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:flex flex-col items-start gap-0.5">
                <span className="text-xs font-bold text-slate-900 leading-none">{profile?.full_name}</span>
                <Badge variant="outline" className="text-[9px] font-bold py-0 h-4 uppercase tracking-tighter bg-slate-50 border-slate-200">
                  {profile?.role}
                </Badge>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 p-1 border-slate-100 shadow-xl rounded-2xl">
            <div className="p-3 border-b border-slate-50 mb-1">
              <p className="text-xs font-bold text-slate-900">{profile?.full_name}</p>
              <p className="text-[10px] text-slate-500 truncate mt-0.5">{user?.email}</p>
            </div>
            <DropdownMenuItem onClick={() => navigate('/profile')} className="rounded-xl gap-2 text-xs font-medium focus:bg-indigo-50 focus:text-indigo-600 cursor-pointer py-2.5">
              <User className="h-4 w-4" />
              My Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/settings')} className="rounded-xl gap-2 text-xs font-medium focus:bg-indigo-50 focus:text-indigo-600 cursor-pointer py-2.5">
              <Settings className="h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-slate-50" />
            <DropdownMenuItem onClick={handleLogout} className="rounded-xl gap-2 text-xs font-medium text-rose-600 focus:bg-rose-50 focus:text-rose-600 cursor-pointer py-2.5">
              <LogOut className="h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
