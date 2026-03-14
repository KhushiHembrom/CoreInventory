import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Truck, ChevronRight, Warehouse, Calendar, User, Package } from "lucide-react";
import { Input } from "@/components/ui/input";

const StatusBadge = ({ status }: { status: string }) => {
  const styles: Record<string, string> = {
    Draft: "bg-gray-100 text-gray-600 border-gray-200",
    Waiting: "bg-blue-50 text-blue-600 border-blue-100",
    Ready: "bg-indigo-50 text-indigo-600 border-indigo-100",
    Done: "bg-emerald-50 text-emerald-600 border-emerald-100",
    Canceled: "bg-rose-50 text-rose-600 border-rose-100",
  };
  return (
    <Badge variant="outline" className={`${styles[status] || ""} font-medium`}>
      {status}
    </Badge>
  );
};

export default function Deliveries() {
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  const { profile } = useAuthStore();
  const isManager = profile?.role === 'manager';

  const { data: deliveries, isLoading } = useQuery({
    queryKey: ["deliveries"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deliveries")
        .select("*, warehouses(name), profiles(full_name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const filtered = deliveries?.filter(d => {
    const matchStatus = activeTab === "all" || d.status === activeTab;
    const matchSearch = d.reference_no.toLowerCase().includes(search.toLowerCase()) || 
                       (d.customer_name?.toLowerCase() || "").includes(search.toLowerCase());
    return matchStatus && matchSearch;
  }) || [];

  if (isLoading) return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Outgoing Deliveries</h1>
          <p className="text-sm text-muted-foreground">Manage and track stock shipments to customers</p>
        </div>
        {isManager && (
          <Button onClick={() => navigate("/deliveries/new")} className="gap-2 shadow-sm bg-rose-600 hover:bg-rose-700">
            <Plus className="h-4 w-4" />
            New Delivery
          </Button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
          <TabsList className="bg-muted/50 p-1">
            <TabsTrigger value="all" className="text-xs px-4">All</TabsTrigger>
            <TabsTrigger value="Draft" className="text-xs px-4">Draft</TabsTrigger>
            <TabsTrigger value="Ready" className="text-xs px-4">Ready</TabsTrigger>
            <TabsTrigger value="Done" className="text-xs px-4 text-emerald-600">Done</TabsTrigger>
            <TabsTrigger value="Canceled" className="text-xs px-4 text-rose-600">Canceled</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search reference or customer..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm bg-white" 
          />
        </div>
      </div>

      <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead className="text-[10px] uppercase font-bold tracking-wider py-3">Reference</TableHead>
              <TableHead className="text-[10px] uppercase font-bold tracking-wider py-3">Customer</TableHead>
              <TableHead className="text-[10px] uppercase font-bold tracking-wider py-3">Origin</TableHead>
              <TableHead className="text-[10px] uppercase font-bold tracking-wider py-3">Created By</TableHead>
              <TableHead className="text-[10px] uppercase font-bold tracking-wider py-3 text-center">Status</TableHead>
              <TableHead className="text-[10px] uppercase font-bold tracking-wider py-3 text-right">Created Date</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-64 text-center">
                  <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                    <Truck className="h-8 w-8 opacity-20" />
                    <p className="text-sm">No deliveries found matching your criteria</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map(d => (
                <TableRow 
                  key={d.id} 
                  className="hover:bg-muted/10 transition-colors cursor-pointer group"
                  onClick={() => navigate(`/deliveries/${d.id}`)}
                >
                  <TableCell className="font-mono text-xs font-bold text-rose-600">
                    <div className="flex items-center gap-2">
                      <Truck className="h-3 w-3" />
                      {d.reference_no}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm font-medium">{d.customer_name || "N/A"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Warehouse className="h-3 w-3" />
                      {d.warehouses?.name || "Unknown"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <User className="h-3 w-3" />
                      {d.profiles?.full_name || "System"}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <StatusBadge status={d.status || "Draft"} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {d.created_at ? format(new Date(d.created_at), "MMM dd, yyyy") : "-"}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

