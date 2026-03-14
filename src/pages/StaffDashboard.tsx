import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import { useWarehouseStore } from "@/stores/warehouseStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Package,
  AlertTriangle,
  XCircle,
  PackageCheck,
  Truck,
  ArrowLeftRight,
  RefreshCcw,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const OperationBadge = ({ type }: { type: string }) => {
  const styles: Record<string, string> = {
    receipt: "bg-green-100 text-green-700 border-green-200",
    delivery: "bg-red-100 text-red-700 border-red-200",
    transfer_in: "bg-blue-100 text-blue-700 border-blue-200",
    transfer_out: "bg-orange-100 text-orange-700 border-orange-200",
  };
  return (
    <Badge variant="outline" className={styles[type] || "bg-gray-100 text-gray-700"}>
      {type.replace("_", " ")}
    </Badge>
  );
};

export default function StaffDashboard() {
  const queryClient = useQueryClient();
  const [liveIndicator, setLiveIndicator] = useState(false);
  const { user } = useAuthStore();
  const { selectedWarehouseId } = useWarehouseStore();
  
  const warehouseId = selectedWarehouseId || "all";

  const { data: stock, isLoading: stockLoading } = useQuery({
    queryKey: ["staff-stock", warehouseId],
    queryFn: async () => {
      let query = supabase.from("stock").select("*, products(*)");
      if (warehouseId !== "all") {
        query = query.eq("warehouse_id", warehouseId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const { data: ledger, isLoading: ledgerLoading } = useQuery({
    queryKey: ["staff-ledger", warehouseId],
    queryFn: async () => {
      let query = supabase
        .from("stock_ledger")
        .select("*, products(*), warehouses(*)")
        .neq("operation_type", "adjustment") // Filter out adjustments for staff
        .order("created_at", { ascending: false })
        .limit(10);
      if (warehouseId !== "all") {
        query = query.eq("warehouse_id", warehouseId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const { data: receipts } = useQuery({
    queryKey: ["staff-receipts", warehouseId],
    queryFn: async () => {
      let query = supabase.from("receipts").select("*").in("status", ["Waiting", "Ready"]);
      if (warehouseId !== "all") {
        query = query.eq("warehouse_id", warehouseId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const { data: deliveries } = useQuery({
    queryKey: ["staff-deliveries", warehouseId],
    queryFn: async () => {
      let query = supabase.from("deliveries").select("*").in("status", ["Waiting", "Ready"]);
      if (warehouseId !== "all") {
        query = query.eq("warehouse_id", warehouseId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  useEffect(() => {
    const refreshData = () => {
      setLiveIndicator(true);
      queryClient.invalidateQueries({ queryKey: ["staff-stock"] });
      queryClient.invalidateQueries({ queryKey: ["staff-ledger"] });
      setTimeout(() => setLiveIndicator(false), 2000);
    };

    const channel = supabase
      .channel('staff-dashboard-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stock' }, refreshData)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const totalStock = stock?.reduce((sum, s) => sum + (s.quantity || 0), 0) ?? 0;
  const pendingTasks = (receipts?.length || 0) + (deliveries?.length || 0);

  if (stockLoading || ledgerLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48 bg-slate-100" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
        <Skeleton className="h-[400px] rounded-xl bg-slate-50" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">Staff Dashboard</h1>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-50">
            <div className={`h-2 w-2 rounded-full bg-emerald-500 ${liveIndicator ? 'animate-ping' : ''}`} />
            <span className="text-[10px] font-bold text-emerald-600 uppercase">Live</span>
          </div>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => {
            queryClient.invalidateQueries();
            toast.success("Dashboard data synced");
          }}
        >
          <RefreshCcw className="h-4 w-4 mr-2" />
          Sync
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-none shadow-sm bg-indigo-600 text-white">
          <CardContent className="p-6">
            <Package className="h-6 w-6 mb-2 opacity-80" />
            <h3 className="text-3xl font-bold">{totalStock}</h3>
            <p className="text-xs opacity-80 font-medium">Total Products in Stock</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white">
          <CardContent className="p-6">
            <PackageCheck className="h-6 w-6 mb-2 text-emerald-600" />
            <h3 className="text-3xl font-bold text-slate-900">{receipts?.length || 0}</h3>
            <p className="text-xs text-slate-500 font-medium">Pending Receipts</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white">
          <CardContent className="p-6">
            <Truck className="h-6 w-6 mb-2 text-rose-600" />
            <h3 className="text-3xl font-bold text-slate-900">{deliveries?.length || 0}</h3>
            <p className="text-xs text-slate-500 font-medium">Pending Deliveries</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white">
          <CardContent className="p-6">
            <AlertTriangle className="h-6 w-6 mb-2 text-amber-500" />
            <h3 className="text-3xl font-bold text-slate-900">{pendingTasks}</h3>
            <p className="text-xs text-slate-500 font-medium">Tasks for Today</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50 border-b">
          <CardTitle className="text-base">Recent Stock Operations</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50">
                <TableHead>Time</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Operation</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Warehouse</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ledger?.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="text-xs text-slate-500">
                    {entry.created_at ? format(new Date(entry.created_at), "HH:mm") : "-"}
                  </TableCell>
                  <TableCell className="font-medium">{entry.products?.name}</TableCell>
                  <TableCell><OperationBadge type={entry.operation_type} /></TableCell>
                  <TableCell className={`font-bold ${entry.quantity_change > 0 ? "text-emerald-600" : "text-rose-600"}`}>
                    {entry.quantity_change > 0 ? "+" : ""}{entry.quantity_change}
                  </TableCell>
                  <TableCell className="text-xs">{entry.warehouses?.name}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
