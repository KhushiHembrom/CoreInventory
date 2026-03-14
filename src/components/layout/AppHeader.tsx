import { Bell } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useWarehouseStore } from "@/stores/warehouseStore";
import { useAuthStore } from "@/stores/authStore";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export function AppHeader({ title }: { title: string }) {
  const { selectedWarehouseId, setSelectedWarehouseId } = useWarehouseStore();
  const { profile } = useAuthStore();

  const { data: warehouses } = useQuery({
    queryKey: ["warehouses"],
    queryFn: async () => {
      const { data } = await supabase.from("warehouses").select("*").order("name");
      return data || [];
    },
  });

  const { data: lowStockItems } = useQuery({
    queryKey: ["low-stock-alerts"],
    queryFn: async () => {
      const { data: stock } = await supabase.from("stock").select("quantity, product_id, warehouse_id");
      const { data: products } = await supabase.from("products").select("id, name, sku, reorder_level");
      if (!stock || !products) return [];
      return products.filter(p => {
        const totalQty = stock.filter(s => s.product_id === p.id).reduce((sum, s) => sum + (s.quantity || 0), 0);
        return totalQty <= (p.reorder_level || 10);
      }).map(p => ({
        ...p,
        totalQty: stock.filter(s => s.product_id === p.id).reduce((sum, s) => sum + (s.quantity || 0), 0),
      }));
    },
  });

  const initials = profile?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';

  return (
    <header className="h-14 border-b bg-card flex items-center justify-between px-4 shrink-0">
      <div className="flex items-center gap-3">
        <SidebarTrigger className="text-muted-foreground" />
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      </div>
      <div className="flex items-center gap-3">
        <Select value={selectedWarehouseId || "all"} onValueChange={(v) => setSelectedWarehouseId(v === "all" ? null : v)}>
          <SelectTrigger className="w-[180px] h-9 text-sm">
            <SelectValue placeholder="All Warehouses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Warehouses</SelectItem>
            {warehouses?.map(w => (
              <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-4 w-4" />
              {(lowStockItems?.length || 0) > 0 && (
                <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px] bg-destructive text-destructive-foreground">
                  {lowStockItems?.length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-3">
            <h4 className="font-medium text-sm mb-2">Low Stock Alerts</h4>
            {!lowStockItems?.length ? (
              <p className="text-xs text-muted-foreground">No alerts</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-auto">
                {lowStockItems.map(item => (
                  <div key={item.id} className="flex justify-between items-center text-xs">
                    <div>
                      <span className="font-medium">{item.name}</span>
                      <span className="text-muted-foreground ml-1 font-mono">{item.sku}</span>
                    </div>
                    <Badge className={item.totalQty === 0 ? "bg-destructive text-destructive-foreground" : "bg-warning text-warning-foreground"}>
                      {item.totalQty} units
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </PopoverContent>
        </Popover>

        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-primary text-primary-foreground text-xs">{initials}</AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
