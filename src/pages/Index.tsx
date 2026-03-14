import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Package, 
  AlertCircle, 
  ArrowUpRight, 
  ArrowDownRight, 
  History, 
  Box,
  Truck,
  Receipt,
  ArrowRight,
  Warehouse,
  Plus,
  ArrowRightLeft
} from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const StatCard = ({ title, value, icon: Icon, description, trend, trendValue, color }: any) => (
  <Card className="border-none shadow-sm overflow-hidden group">
    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
      <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      <div className={`p-2 rounded-lg ${color} bg-opacity-10 text-opacity-90`}>
        <Icon className="h-4 w-4" />
      </div>
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      <div className="flex items-center gap-1 mt-1">
        {trend && (
            <span className={`text-[10px] font-bold flex items-center ${trend === 'up' ? 'text-emerald-600' : 'text-rose-600'}`}>
                {trend === 'up' ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {trendValue}
            </span>
        )}
        <p className="text-[10px] text-muted-foreground">{description}</p>
      </div>
    </CardContent>
    <div className={`h-1 w-full ${color} opacity-20`} />
  </Card>
);

export default function Dashboard() {
  const navigate = useNavigate();

  const { data: products, isLoading: prodLoading } = useQuery({
    queryKey: ["dashboard-products"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("id, name");
      return data || [];
    }
  });

  const { data: stock, isLoading: stockLoading } = useQuery({
    queryKey: ["dashboard-stock"],
    queryFn: async () => {
      const { data } = await supabase.from("stock").select("quantity, product_id");
      return data || [];
    }
  });

  const { data: receipts, isLoading: recLoading } = useQuery({
    queryKey: ["recent-receipts"],
    queryFn: async () => {
      const { data } = await supabase.from("receipts").select("*, warehouses(name)").order("created_at", { ascending: false }).limit(3);
      return data || [];
    }
  });

  const { data: deliveries, isLoading: delLoading } = useQuery({
    queryKey: ["recent-deliveries"],
    queryFn: async () => {
      const { data } = await supabase.from("deliveries").select("*, warehouses(name)").order("created_at", { ascending: false }).limit(3);
      return data || [];
    }
  });

  const isLoading = prodLoading || stockLoading || recLoading || delLoading;

  // Calculate stats
  const totalStock = stock?.reduce((acc, curr) => acc + curr.quantity, 0) || 0;
  const totalSKUs = products?.length || 0;
  
  const lowStockThreshold = 10;
  const lowStockCount = stock?.filter(s => s.quantity < lowStockThreshold).length || 0;

  if (isLoading) return (
    <div className="space-y-8 animate-pulse p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1,2,3,4].map(i => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    </div>
  );

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-800">Inventory Overview</h1>
          <p className="text-muted-foreground">Real-time pulse of your warehouse operations</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" className="bg-white" onClick={() => navigate("/history")}>
            <History className="h-4 w-4 mr-2" /> View Audit Trail
          </Button>
          <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-100" onClick={() => navigate("/products")}>
            <Package className="h-4 w-4 mr-2" /> Manage Stock
          </Button>
        </div>
      </div>

      {/* KPI Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Stock Units" 
          value={totalStock.toLocaleString()} 
          icon={Box} 
          description="Units across all locations"
          color="bg-blue-500"
        />
        <StatCard 
          title="Active SKUs" 
          value={totalSKUs} 
          icon={Package} 
          description="Unique products registered"
          color="bg-indigo-500"
        />
        <StatCard 
          title="Low Stock SKUs" 
          value={lowStockCount} 
          icon={AlertCircle} 
          description="Requires replenishment"
          color={lowStockCount > 0 ? "bg-rose-500" : "bg-emerald-500"}
          trend={lowStockCount > 5 ? "up" : "down"}
          trendValue={lowStockCount > 5 ? "Critical" : "Healthy"}
        />
        <StatCard 
          title="Recent Movement" 
          value={(receipts?.length || 0) + (deliveries?.length || 0)} 
          icon={History} 
          description="Transactions in last 7 days"
          color="bg-slate-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Receipts */}
        <Card className="border-none shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Recent Receipts</CardTitle>
              <CardDescription>Latest incoming shipments</CardDescription>
            </div>
            <Receipt className="h-5 w-5 text-muted-foreground opacity-50" />
          </CardHeader>
          <CardContent className="space-y-4">
            {receipts?.length === 0 ? (
                <p className="text-sm text-center py-10 text-muted-foreground">No recent receipts</p>
            ) : (
                receipts.map((r: any) => (
                    <div 
                        key={r.id} 
                        className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group"
                        onClick={() => navigate(`/receipts`)}
                    >
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded bg-emerald-50 flex items-center justify-center text-emerald-600">
                                <ArrowDownRight className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-sm font-bold font-mono">{r.reference_no}</p>
                                <p className="text-[10px] text-muted-foreground uppercase flex items-center gap-1">
                                    <Warehouse className="h-3 w-3" /> {r.warehouses?.name}
                                </p>
                            </div>
                        </div>
                        <div className="text-right">
                           <p className="text-xs font-medium">{format(new Date(r.created_at), "MMM dd")}</p>
                           <p className={`text-[10px] font-bold ${r.status === 'Done' ? 'text-emerald-500' : 'text-amber-500'}`}>{r.status}</p>
                        </div>
                    </div>
                ))
            )}
            <Button variant="ghost" className="w-full text-xs text-muted-foreground mt-2" onClick={() => navigate("/receipts")}>
                View all receipts <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </CardContent>
        </Card>

        {/* Recent Deliveries */}
        <Card className="border-none shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Recent Deliveries</CardTitle>
              <CardDescription>Latest outgoing shipments</CardDescription>
            </div>
            <Truck className="h-5 w-5 text-muted-foreground opacity-50" />
          </CardHeader>
          <CardContent className="space-y-4">
            {deliveries?.length === 0 ? (
                <p className="text-sm text-center py-10 text-muted-foreground">No recent deliveries</p>
            ) : (
                deliveries.map((d: any) => (
                    <div 
                        key={d.id} 
                        className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group"
                        onClick={() => navigate(`/deliveries`)}
                    >
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded bg-rose-50 flex items-center justify-center text-rose-600">
                                <ArrowUpRight className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-sm font-bold font-mono">{d.reference_no}</p>
                                <p className="text-[10px] text-muted-foreground uppercase flex items-center gap-1">
                                    <Warehouse className="h-3 w-3" /> {d.warehouses?.name}
                                </p>
                            </div>
                        </div>
                        <div className="text-right">
                           <p className="text-xs font-medium">{format(new Date(d.created_at), "MMM dd")}</p>
                           <p className={`text-[10px] font-bold ${d.status === 'Ready' ? 'text-blue-500' : d.status === 'Done' ? 'text-emerald-500' : 'text-amber-500'}`}>{d.status}</p>
                        </div>
                    </div>
                ))
            )}
            <Button variant="ghost" className="w-full text-xs text-muted-foreground mt-2" onClick={() => navigate("/deliveries")}>
                View all deliveries <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pb-10">
          {[
              { label: "New Product", icon: Plus, to: "/products", color: "text-blue-600 border-blue-100 bg-blue-50" },
              { label: "Add Receipt", icon: Receipt, to: "/receipts/new", color: "text-emerald-600 border-emerald-100 bg-emerald-50" },
              { label: "Ship Items", icon: Truck, to: "/deliveries/new", color: "text-rose-600 border-rose-100 bg-rose-50" },
              { label: "Transfer Stock", icon: ArrowRightLeft, to: "/transfers/new", color: "text-indigo-600 border-indigo-100 bg-indigo-50" },
          ].map((action, i) => (
              <button 
                key={i}
                onClick={() => navigate(action.to)}
                className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all hover:shadow-md hover:-translate-y-1 ${action.color}`}
              >
                  <action.icon className="h-6 w-6 mb-2" />
                  <span className="text-xs font-bold uppercase tracking-wider">{action.label}</span>
              </button>
          ))}
      </div>
    </div>
  );
}
