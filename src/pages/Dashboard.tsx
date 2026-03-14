import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/authStore";
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

export default function Dashboard() {
  const queryClient = useQueryClient();
  const [liveIndicator, setLiveIndicator] = useState(false);
  const [filters, setFilters] = useState({
    warehouse: "all",
    category: "all",
    docType: "all",
    status: "all",
  });

  // Data Fetching
  const { user } = useAuthStore();
  
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
    queryKey: ["dashboard-stock", filters.warehouse],
    queryFn: async () => {
      let query = supabase.from("stock").select("*, products(*)");
      if (filters.warehouse !== "all") {
        query = query.eq("warehouse_id", filters.warehouse);
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
    queryKey: ["dashboard-receipts", filters.warehouse, filters.status],
    queryFn: async () => {
      let query = supabase.from("receipts").select("*");
      if (filters.warehouse !== "all") query = query.eq("warehouse_id", filters.warehouse);
      if (filters.status !== "all") query = query.eq("status", filters.status);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const { data: deliveries, isLoading: deliveriesLoading } = useQuery({
    queryKey: ["dashboard-deliveries", filters.warehouse, filters.status],
    queryFn: async () => {
      let query = supabase.from("deliveries").select("*");
      if (filters.warehouse !== "all") query = query.eq("warehouse_id", filters.warehouse);
      if (filters.status !== "all") query = query.eq("status", filters.status);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const { data: transfers, isLoading: transfersLoading } = useQuery({
    queryKey: ["dashboard-transfers", filters.warehouse, filters.status],
    queryFn: async () => {
      let query = supabase.from("internal_transfers").select("*");
      if (filters.warehouse !== "all") {
        query = query.or(`from_warehouse_id.eq.${filters.warehouse},to_warehouse_id.eq.${filters.warehouse}`);
      }
      if (filters.status !== "all") query = query.eq("status", filters.status);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const { data: adjustments } = useQuery({
    queryKey: ["dashboard-adjustments", filters.warehouse],
    queryFn: async () => {
      let query = supabase.from("stock_adjustments").select("*");
      if (filters.warehouse !== "all") query = query.eq("warehouse_id", filters.warehouse);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const { data: ledger, isLoading: ledgerLoading } = useQuery({
    queryKey: ["dashboard-ledger", filters.warehouse],
    queryFn: async () => {
      let query = supabase
        .from("stock_ledger")
        .select("*, products(*), warehouses(*)")
        .order("created_at", { ascending: false })
        .limit(10);
      if (filters.warehouse !== "all") {
        query = query.eq("warehouse_id", filters.warehouse);
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

  // combined loading state
  const isInitialLoading = stockLoading || productsLoading || receiptsLoading || deliveriesLoading || transfersLoading || ledgerLoading;

  if (isInitialLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-24" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-80 rounded-xl lg:col-span-2" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      </div>
    );
  }

  if (stockError) {
    return (
      <div className="p-8 text-center flex flex-col items-center justify-center min-h-[400px]">
        <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-xl font-bold mb-2">Error loading dashboard</h2>
        <p className="text-muted-foreground mb-6 max-w-md">
          {stockErrorInfo instanceof Error ? stockErrorInfo.message : "We couldn't fetch the latest inventory data. This might be due to a database connection issue or permissions."}
        </p>
        <Button onClick={() => queryClient.invalidateQueries()}>
          <RefreshCcw className="mr-2 h-4 w-4" />
          Retry Now
        </Button>
      </div>
    );
  }

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
  ].filter(d => d.value > 0);

  const last7DaysData = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), 6 - i);
    const dateStr = format(date, "yyyy-MM-dd");
    const count = ledger?.filter(l => l.created_at?.startsWith(dateStr)).length || 0;
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
      {/* Header & Live Status */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">Inventory Dashboard</h1>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-50 border border-emerald-100">
            <div className={`h-2 w-2 rounded-full bg-emerald-500 ${liveIndicator ? 'animate-ping' : ''}`} />
            <span className="text-[10px] font-medium text-emerald-600 uppercase tracking-wider">Live</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries()} className="gap-2">
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters Bar */}
      <Card className="border-none shadow-sm bg-muted/30">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <SlidersHorizontal className="h-3.5 w-3.5" /> Warehouse
              </label>
              <Select value={filters.warehouse} onValueChange={(v) => setFilters(f => ({ ...f, warehouse: v }))}>
                <SelectTrigger className="bg-white"><SelectValue placeholder="All Warehouses" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Warehouses</SelectItem>
                  {warehouses?.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Filter className="h-3.5 w-3.5" /> Category
              </label>
              <Select value={filters.category} onValueChange={(v) => setFilters(f => ({ ...f, category: v }))}>
                <SelectTrigger className="bg-white"><SelectValue placeholder="All Categories" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Document Type</label>
              <Select value={filters.docType} onValueChange={(v) => setFilters(f => ({ ...f, docType: v }))}>
                <SelectTrigger className="bg-white"><SelectValue placeholder="All Types" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="receipt">Receipts</SelectItem>
                  <SelectItem value="delivery">Deliveries</SelectItem>
                  <SelectItem value="transfer">Transfers</SelectItem>
                  <SelectItem value="adjustment">Adjustments</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Status</label>
              <Select value={filters.status} onValueChange={(v) => setFilters(f => ({ ...f, status: v }))}>
                <SelectTrigger className="bg-white"><SelectValue placeholder="All Statuses" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Draft">Draft</SelectItem>
                  <SelectItem value="Waiting">Waiting</SelectItem>
                  <SelectItem value="Ready">Ready</SelectItem>
                  <SelectItem value="Done">Done</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="ghost"
              className="text-sm font-medium text-muted-foreground hover:text-foreground"
              onClick={() => setFilters({ warehouse: "all", category: "all", docType: "all", status: "all" })}
            >
              Reset Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpis.map((kpi, i) => (
          <Card 
            key={i} 
            className={`border-none shadow-sm overflow-hidden transition-all duration-200 ${kpi.bg || "bg-white"} ${kpi.onClick ? "cursor-pointer hover:ring-2 hover:ring-indigo-500/20 active:scale-[0.98]" : ""}`}
            onClick={kpi.onClick}
          >
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-2 rounded-lg bg-white shadow-sm border border-gray-100`}>
                  <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
                </div>
                {kpi.trend && (
                  <div className={`flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    kpi.trendUp === true ? "text-emerald-600 bg-emerald-50" :
                    kpi.trendUp === false ? "text-rose-600 bg-rose-50" :
                    "text-slate-500 bg-slate-100"
                  }`}>
                    {kpi.trendUp === true && <TrendingUp size={10} />}
                    {kpi.trendUp === false && <TrendingDown size={10} />}
                    {kpi.trend}
                  </div>
                )}
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
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-base font-semibold">Top 5 Products by Stock</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={top5Products} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "#888" }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "#888" }}
                />
                <Tooltip
                  cursor={{ fill: "#f8fafc" }}
                  contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                />
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
            {opsSplit.length === 0 ? (
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <Package className="h-8 w-8 opacity-20" />
                <p className="text-sm">No operations recorded</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={opsSplit}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {opsSplit.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
            <div className="grid grid-cols-2 gap-4 mt-4 w-full px-4">
              {opsSplit.map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }} />
                  <span className="text-[11px] font-medium text-muted-foreground">{entry.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Stock Movements (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={last7DaysData} margin={{ top: 10, right: 30, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "#888" }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "#888" }}
                />
                <Tooltip
                  contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                />
                <Line
                  type="monotone"
                  dataKey="movements"
                  stroke="hsl(213, 52%, 24%)"
                  strokeWidth={3}
                  dot={{ r: 4, fill: "hsl(213, 52%, 24%)", strokeWidth: 2, stroke: "#fff" }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity Table */}
      <Card className="border-none shadow-sm overflow-hidden">
        <CardHeader className="bg-white border-b border-gray-50 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold">Recent Activity</CardTitle>
          <Button variant="ghost" size="sm" className="text-xs font-medium">View All</Button>
        </CardHeader>
        <CardContent className="p-0">
          {!ledger?.length ? (
            <div className="p-12 flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <Package className="h-10 w-10 opacity-10" />
              <p className="text-sm">No recent activities found</p>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="py-3 text-[11px] uppercase tracking-wider font-semibold">Date/Time</TableHead>
                  <TableHead className="py-3 text-[11px] uppercase tracking-wider font-semibold">Product Name</TableHead>
                  <TableHead className="py-3 text-[11px] uppercase tracking-wider font-semibold">Operation</TableHead>
                  <TableHead className="py-3 text-[11px] uppercase tracking-wider font-semibold">Qty Change</TableHead>
                  <TableHead className="py-3 text-[11px] uppercase tracking-wider font-semibold">Reference</TableHead>
                  <TableHead className="py-3 text-[11px] uppercase tracking-wider font-semibold">Warehouse</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ledger.map((entry) => (
                  <TableRow key={entry.id} className="hover:bg-muted/20 transition-colors border-b border-gray-50 last:border-0">
                    <TableCell className="text-xs text-muted-foreground">
                      {entry.created_at ? format(new Date(entry.created_at), "MMM dd, HH:mm") : "-"}
                    </TableCell>
                    <TableCell className="text-sm font-medium">{entry.products?.name}</TableCell>
                    <TableCell>
                      <OperationBadge type={entry.operation_type} />
                    </TableCell>
                    <TableCell className={`text-sm font-bold ${entry.quantity_change > 0 ? "text-emerald-600" : "text-rose-600"}`}>
                      {entry.quantity_change > 0 ? "+" : ""}{entry.quantity_change}
                    </TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">{entry.reference_no}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{entry.warehouses?.name}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

