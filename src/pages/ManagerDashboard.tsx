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
  TrendingUp,
  TrendingDown,
  Filter,
  RefreshCcw,
  SlidersHorizontal
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
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import { format, subDays, startOfDay, isWithinInterval } from "date-fns";
import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const CHART_COLORS = [
  "hsl(213, 52%, 24%)",
  "hsl(160, 84%, 39%)",
  "hsl(38, 92%, 50%)",
  "hsl(217, 91%, 60%)",
  "hsl(0, 72%, 51%)",
  "hsl(280, 65%, 45%)",
];

const OperationBadge = ({ type }: { type: string }) => {
  const styles: Record<string, string> = {
    receipt: "bg-green-100 text-green-700 border-green-200",
    delivery: "bg-red-100 text-red-700 border-red-200",
    transfer_in: "bg-blue-100 text-blue-700 border-blue-200",
    transfer_out: "bg-orange-100 text-orange-700 border-orange-200",
    adjustment: "bg-purple-100 text-purple-700 border-purple-200",
  };
  return (
    <Badge variant="outline" className={styles[type] || "bg-gray-100 text-gray-700"}>
      {type.replace("_", " ")}
    </Badge>
  );
};

export default function ManagerDashboard() {
  const queryClient = useQueryClient();
  const [liveIndicator, setLiveIndicator] = useState(false);
  const [filters, setFilters] = useState({
    warehouse: "all",
    category: "all",
    docType: "all",
    status: "all",
  });

  // Data Fetching
  const { user, profile } = useAuthStore();
  const { selectedWarehouseId } = useWarehouseStore();
  
  const warehouseId = selectedWarehouseId || "all";

  const { data: warehouses } = useQuery({
    queryKey: ["warehouses"],
    queryFn: async () => {
      const { data, error } = await supabase.from("warehouses").select("*");
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*");
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const { data: stock, isLoading: stockLoading, isError: stockError, error: stockErrorInfo } = useQuery({
    queryKey: ["dashboard-stock", warehouseId],
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

  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ["dashboard-products", filters.category],
    queryFn: async () => {
      let query = supabase.from("products").select("*, categories(*)");
      if (filters.category !== "all") {
        query = query.eq("category_id", filters.category);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const { data: receipts, isLoading: receiptsLoading } = useQuery({
    queryKey: ["dashboard-receipts", warehouseId, filters.status],
    queryFn: async () => {
      let query = supabase.from("receipts").select("*");
      if (warehouseId !== "all") query = query.eq("warehouse_id", warehouseId);
      if (filters.status !== "all") query = query.eq("status", filters.status);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const { data: deliveries, isLoading: deliveriesLoading } = useQuery({
    queryKey: ["dashboard-deliveries", warehouseId, filters.status],
    queryFn: async () => {
      let query = supabase.from("deliveries").select("*");
      if (warehouseId !== "all") query = query.eq("warehouse_id", warehouseId);
      if (filters.status !== "all") query = query.eq("status", filters.status);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const { data: transfers, isLoading: transfersLoading } = useQuery({
    queryKey: ["dashboard-transfers", warehouseId, filters.status],
    queryFn: async () => {
      let query = supabase.from("internal_transfers").select("*");
      if (warehouseId !== "all") {
        query = query.or(`from_warehouse_id.eq.${warehouseId},to_warehouse_id.eq.${warehouseId}`);
      }
      if (filters.status !== "all") query = query.eq("status", filters.status);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const { data: adjustments } = useQuery({
    queryKey: ["dashboard-adjustments", warehouseId],
    queryFn: async () => {
      let query = supabase.from("stock_adjustments").select("*");
      if (warehouseId !== "all") query = query.eq("warehouse_id", warehouseId);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const { data: ledger, isLoading: ledgerLoading } = useQuery({
    queryKey: ["dashboard-ledger", warehouseId],
    queryFn: async () => {
      let query = supabase
        .from("stock_ledger")
        .select("*, products(*), warehouses(*)")
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

  // Realtime subscription
  useEffect(() => {
    const refreshData = () => {
      setLiveIndicator(true);
      queryClient.invalidateQueries({ queryKey: ["dashboard-stock"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-receipts"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-deliveries"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-transfers"] });
      setTimeout(() => setLiveIndicator(false), 2000);
    };

    const channel = supabase
      .channel('dashboard-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stock' }, refreshData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'receipts' }, refreshData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deliveries' }, refreshData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'internal_transfers' }, refreshData)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Calculations
  const totalProductsInStock = stock?.reduce((sum, s) => sum + (s.quantity || 0), 0) ?? 0;

  const productsWithStock = products?.map(p => {
    const productStock = stock?.filter(s => s.product_id === p.id).reduce((sum, s) => sum + (s.quantity || 0), 0) || 0;
    return { ...p, current_qty: productStock };
  }) || [];

  const lowStockCount = productsWithStock.filter(p => p.current_qty > 0 && p.current_qty < (p.reorder_level || 0)).length;
  const outOfStockCount = productsWithStock.filter(p => p.current_qty === 0).length;

  const pendingReceiptsCount = receipts?.filter(r => ["Waiting", "Ready"].includes(r.status || "")).length || 0;
  const pendingDeliveriesCount = deliveries?.filter(d => ["Waiting", "Ready"].includes(d.status || "")).length || 0;
  const scheduledTransfersCount = transfers?.filter(t => ["Draft", "Waiting"].includes(t.status || "")).length || 0;

  // Combined loading state: only wait for the most critical inventory data
  const isInitialLoading = stockLoading || productsLoading;
  
  // Handlers for error detail
  const errorDetail = (stockErrorInfo as any)?.message || "Check your database connection or permissions.";

  if (isInitialLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-48 bg-slate-100" />
          <Skeleton className="h-10 w-24 bg-slate-100" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl bg-slate-50" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-[400px] rounded-xl lg:col-span-2 bg-slate-50" />
          <Skeleton className="h-[400px] rounded-xl bg-slate-50" />
        </div>
      </div>
    );
  }

  if (stockError || (productsLoading === false && !products)) {
    return (
      <div className="p-8 text-center flex flex-col items-center justify-center min-h-[400px]">
        <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-xl font-bold mb-2">Notice</h2>
        <p className="text-muted-foreground mb-6 max-w-md">{errorDetail}</p>
        <Button onClick={() => queryClient.invalidateQueries()}>
          <RefreshCcw className="mr-2 h-4 w-4" />
          Retry Now
        </Button>
      </div>
    );
  }

  const isManager = true; // Always true in ManagerDashboard

  // Chart data
  const top5Products = productsWithStock
    .sort((a, b) => b.current_qty - a.current_qty)
    .slice(0, 5)
    .map(p => ({
      name: p.name.length > 12 ? p.name.substring(0, 12) + "…" : p.name,
      stock: p.current_qty,
    }));

  const opsSplit = [
    { name: "Receipts", value: receipts?.length || 0 },
    { name: "Deliveries", value: deliveries?.length || 0 },
    { name: "Transfers", value: transfers?.length || 0 },
    { name: "Adjustments", value: adjustments?.length || 0 },
  ].filter((d): d is { name: string; value: number } => Boolean(d && d.value > 0));

  const filteredLedger = ledger || [];

  const last7DaysData = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), 6 - i);
    const dateStr = format(date, "yyyy-MM-dd");
    const count = filteredLedger.filter(l => l.created_at?.startsWith(dateStr)).length || 0;
    return {
      date: format(date, "MMM dd"),
      movements: count,
    };
  });

  const kpis = [
    {
      title: "Total Products in Stock",
      value: totalProductsInStock,
      icon: Package,
      color: "text-indigo-600",
      trend: "+2.5%",
      trendUp: true,
    },
    {
      title: "Low Stock Items",
      value: lowStockCount,
      icon: AlertTriangle,
      color: "text-amber-600",
      bg: "bg-amber-50",
      trend: "-12%",
      trendUp: false,
    },
    {
      title: "Out of Stock Items",
      value: outOfStockCount,
      icon: XCircle,
      color: "text-red-600",
      bg: "bg-red-50",
      trend: "Stable",
      trendUp: null,
    },
    {
      title: "Pending Receipts",
      value: pendingReceiptsCount,
      icon: PackageCheck,
      color: "text-blue-600",
      trend: "+5",
      trendUp: true,
    },
    {
      title: "Pending Deliveries",
      value: pendingDeliveriesCount,
      icon: Truck,
      color: "text-indigo-600",
      trend: "+3",
      trendUp: true,
    },
    {
      title: "Scheduled Transfers",
      value: scheduledTransfersCount,
      icon: ArrowLeftRight,
      color: "text-violet-600",
      trend: "+1",
      trendUp: true,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Manager Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">Manager Dashboard</h1>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-50 border border-emerald-100">
            <div className={`h-2 w-2 rounded-full bg-emerald-500 ${liveIndicator ? 'animate-ping' : ''}`} />
            <span className="text-[10px] font-medium text-emerald-600 uppercase tracking-wider">Live</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => {
              queryClient.invalidateQueries();
              toast.success("Dashboard data refreshed");
            }} 
            className="gap-2"
          >
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpis.map((kpi, i) => (
          <Card 
            key={i} 
            className={`border-none shadow-sm overflow-hidden transition-all duration-200 ${kpi.bg || "bg-white"}`}
          >
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-2 rounded-lg bg-white shadow-sm border border-gray-100`}>
                  <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
                </div>
              </div>
              <div className="space-y-1">
                <h3 className="text-3xl font-bold tracking-tight">{kpi.value}</h3>
                <p className="text-xs font-medium text-muted-foreground line-clamp-1">{kpi.title}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-none shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold">Top 5 Products by Stock</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={top5Products}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                <Tooltip cursor={{ fill: "#f8fafc" }} />
                <Bar dataKey="stock" fill="hsl(213, 52%, 24%)" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Operations Split</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px] flex flex-col items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={opsSplit} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {opsSplit.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Activity Table */}
      <Card className="border-none shadow-sm overflow-hidden">
        <CardHeader className="bg-white border-b border-gray-100">
          <CardTitle className="text-base font-semibold">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead>Date/Time</TableHead>
                <TableHead>Product Name</TableHead>
                <TableHead>Operation</TableHead>
                <TableHead>Qty Change</TableHead>
                <TableHead>Warehouse</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLedger.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="text-xs">
                    {entry.created_at ? format(new Date(entry.created_at), "MMM dd, HH:mm") : "-"}
                  </TableCell>
                  <TableCell>{entry.products?.name}</TableCell>
                  <TableCell><OperationBadge type={entry.operation_type} /></TableCell>
                  <TableCell className={entry.quantity_change > 0 ? "text-emerald-600" : "text-rose-600"}>
                    {entry.quantity_change > 0 ? "+" : ""}{entry.quantity_change}
                  </TableCell>
                  <TableCell>{entry.warehouses?.name}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
