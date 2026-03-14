import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, AlertTriangle, XCircle, PackageCheck, Truck, ArrowLeftRight } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { format, subDays } from "date-fns";
import { useEffect, useState } from "react";

const CHART_COLORS = ["hsl(213, 52%, 24%)", "hsl(160, 84%, 39%)", "hsl(38, 92%, 50%)", "hsl(217, 91%, 60%)", "hsl(0, 72%, 51%)"];

export default function Dashboard() {
  const [liveIndicator, setLiveIndicator] = useState(false);

  const { data: stock, isLoading: stockLoading } = useQuery({
    queryKey: ["dashboard-stock"],
    queryFn: async () => {
      const { data } = await supabase.from("stock").select("*");
      return data || [];
    },
  });

  const { data: products } = useQuery({
    queryKey: ["dashboard-products"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("*");
      return data || [];
    },
  });

  const { data: receipts } = useQuery({
    queryKey: ["dashboard-receipts"],
    queryFn: async () => {
      const { data } = await supabase.from("receipts").select("*");
      return data || [];
    },
  });

  const { data: deliveries } = useQuery({
    queryKey: ["dashboard-deliveries"],
    queryFn: async () => {
      const { data } = await supabase.from("deliveries").select("*");
      return data || [];
    },
  });

  const { data: transfers } = useQuery({
    queryKey: ["dashboard-transfers"],
    queryFn: async () => {
      const { data } = await supabase.from("internal_transfers").select("*");
      return data || [];
    },
  });

  const { data: ledger } = useQuery({
    queryKey: ["dashboard-ledger"],
    queryFn: async () => {
      const { data } = await supabase.from("stock_ledger").select("*").order("created_at", { ascending: false }).limit(10);
      return data || [];
    },
  });

  const { data: warehouses } = useQuery({
    queryKey: ["warehouses"],
    queryFn: async () => {
      const { data } = await supabase.from("warehouses").select("*");
      return data || [];
    },
  });

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("dashboard-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "stock" }, () => {
        setLiveIndicator(true);
        setTimeout(() => setLiveIndicator(false), 1000);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const totalStock = stock?.reduce((sum, s) => sum + (s.quantity || 0), 0) || 0;
  const lowStockCount = products?.filter(p => {
    const qty = stock?.filter(s => s.product_id === p.id).reduce((sum, s) => sum + (s.quantity || 0), 0) || 0;
    return qty > 0 && qty <= (p.reorder_level || 10);
  }).length || 0;
  const outOfStockCount = products?.filter(p => {
    const qty = stock?.filter(s => s.product_id === p.id).reduce((sum, s) => sum + (s.quantity || 0), 0) || 0;
    return qty === 0;
  }).length || 0;
  const pendingReceipts = receipts?.filter(r => r.status === 'Ready' || r.status === 'Waiting').length || 0;
  const pendingDeliveries = deliveries?.filter(d => d.status === 'Ready' || d.status === 'Waiting').length || 0;
  const scheduledTransfers = transfers?.filter(t => t.status === 'Draft' || t.status === 'Waiting').length || 0;

  // Top 5 products chart data
  const top5Products = products?.slice(0, 5).map(p => ({
    name: p.name.length > 12 ? p.name.substring(0, 12) + '…' : p.name,
    stock: stock?.filter(s => s.product_id === p.id).reduce((sum, s) => sum + (s.quantity || 0), 0) || 0,
  })) || [];

  // Operations breakdown
  const opsData = [
    { name: "Receipts", value: receipts?.filter(r => r.status === 'Done').length || 0 },
    { name: "Deliveries", value: deliveries?.filter(d => d.status === 'Done').length || 0 },
    { name: "Transfers", value: transfers?.filter(t => t.status === 'Done').length || 0 },
  ].filter(d => d.value > 0);

  // Stock movement over 7 days
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), 6 - i);
    const dayStr = format(date, "yyyy-MM-dd");
    const dayEntries = ledger?.filter(e => e.created_at?.startsWith(dayStr)) || [];
    return {
      day: format(date, "EEE"),
      movements: dayEntries.reduce((sum, e) => sum + Math.abs(e.quantity_change), 0),
    };
  });

  const kpis = [
    { label: "Total Stock", value: totalStock, icon: Package, color: "text-primary" },
    { label: "Low Stock", value: lowStockCount, icon: AlertTriangle, color: "text-warning" },
    { label: "Out of Stock", value: outOfStockCount, icon: XCircle, color: "text-destructive" },
    { label: "Pending Receipts", value: pendingReceipts, icon: PackageCheck, color: "text-info" },
    { label: "Pending Deliveries", value: pendingDeliveries, icon: Truck, color: "text-info" },
    { label: "Scheduled Transfers", value: scheduledTransfers, icon: ArrowLeftRight, color: "text-draft" },
  ];

  if (stockLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Skeleton className="h-64 rounded-lg col-span-2" />
          <Skeleton className="h-64 rounded-lg" />
        </div>
      </div>
    );
  }

  const getProductName = (id: string) => products?.find(p => p.id === id)?.name || "Unknown";
  const getWarehouseName = (id: string) => warehouses?.find(w => w.id === id)?.name || "Unknown";

  return (
    <div className="space-y-6">
      {/* Live indicator */}
      <div className="flex items-center gap-2">
        <div className={`h-2 w-2 rounded-full ${liveIndicator ? 'bg-success animate-pulse-subtle' : 'bg-success'}`} />
        <span className="text-xs text-muted-foreground">Live</span>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpis.map(kpi => (
          <Card key={kpi.label} className="border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
              </div>
              <p className="text-2xl font-semibold font-mono">{kpi.value}</p>
              <p className="text-xs text-muted-foreground">{kpi.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="col-span-1">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Stock by Product</CardTitle></CardHeader>
          <CardContent className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={top5Products}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 90%)" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="stock" fill="hsl(213, 52%, 24%)" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Operations Breakdown</CardTitle></CardHeader>
          <CardContent className="h-56">
            {opsData.length === 0 ? (
              <div className="flex items-center justify-center h-full text-sm text-muted-foreground">No completed operations yet</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={opsData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={2}>
                    {opsData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Movement (7 Days)</CardTitle></CardHeader>
          <CardContent className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={last7Days}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 90%)" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="movements" stroke="hsl(160, 84%, 39%)" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Recent Activity</CardTitle></CardHeader>
        <CardContent>
          {!ledger?.length ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No activity yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Date</TableHead>
                  <TableHead className="text-xs">Product</TableHead>
                  <TableHead className="text-xs">Operation</TableHead>
                  <TableHead className="text-xs">Change</TableHead>
                  <TableHead className="text-xs">Reference</TableHead>
                  <TableHead className="text-xs">Warehouse</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ledger.map(entry => (
                  <TableRow key={entry.id} className="hover:bg-row-hover">
                    <TableCell className="text-xs">{entry.created_at ? format(new Date(entry.created_at), "MMM dd, HH:mm") : "-"}</TableCell>
                    <TableCell className="text-xs font-medium">{getProductName(entry.product_id)}</TableCell>
                    <TableCell className="text-xs"><StatusBadge status={entry.operation_type} /></TableCell>
                    <TableCell className={`text-xs font-mono ${entry.quantity_change > 0 ? "text-success" : "text-destructive"}`}>
                      {entry.quantity_change > 0 ? "+" : ""}{entry.quantity_change}
                    </TableCell>
                    <TableCell className="text-xs font-mono">{entry.reference_no}</TableCell>
                    <TableCell className="text-xs">{getWarehouseName(entry.warehouse_id)}</TableCell>
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
