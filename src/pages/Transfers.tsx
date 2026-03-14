import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, ArrowRightLeft, ChevronRight, Warehouse, Calendar, User, Package } from "lucide-react";
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

export default function Transfers() {
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  const { data: transfers, isLoading } = useQuery({
    queryKey: ["transfers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("internal_transfers")
        .select(`
          *,
          from_warehouse:warehouses!internal_transfers_from_warehouse_id_fkey(name),
          to_warehouse:warehouses!internal_transfers_to_warehouse_id_fkey(name),
          profiles(full_name)
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const filtered = transfers?.filter(t => {
    const matchStatus = activeTab === "all" || t.status === activeTab;
    const matchSearch = t.reference_no.toLowerCase().includes(search.toLowerCase());
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
          <h1 className="text-2xl font-bold tracking-tight">Internal Transfers</h1>
          <p className="text-sm text-muted-foreground">Move stock between your warehouse locations</p>
        </div>
        <Button onClick={() => navigate("/transfers/new")} className="gap-2 shadow-sm bg-indigo-600 hover:bg-indigo-700">
          <Plus className="h-4 w-4" />
          New Transfer
        </Button>
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
            placeholder="Search reference..." 
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
              <TableHead className="text-[10px] uppercase font-bold tracking-wider py-3">Route</TableHead>
              <TableHead className="text-[10px] uppercase font-bold tracking-wider py-3">Created By</TableHead>
              <TableHead className="text-[10px] uppercase font-bold tracking-wider py-3 text-center">Status</TableHead>
              <TableHead className="text-[10px] uppercase font-bold tracking-wider py-3 text-right">Created Date</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-64 text-center">
                  <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                    <ArrowRightLeft className="h-8 w-8 opacity-20" />
                    <p className="text-sm">No transfers found matching your criteria</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map(t => (
                <TableRow 
                  key={t.id} 
                  className="hover:bg-muted/10 transition-colors cursor-pointer group"
                  onClick={() => navigate(`/transfers/${t.id}`)}
                >
                  <TableCell className="font-mono text-xs font-bold text-indigo-600">
                    <div className="flex items-center gap-2">
                      <ArrowRightLeft className="h-3 w-3" />
                      {t.reference_no}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-xs font-medium">
                      <div className="flex flex-col">
                        <span className="text-muted-foreground text-[10px] uppercase">From</span>
                        <span className="flex items-center gap-1"><Warehouse className="h-3 w-3 text-rose-400" /> {t.from_warehouse?.name}</span>
                      </div>
                      <div className="h-8 w-[1px] bg-border mx-2" />
                      <div className="flex flex-col">
                        <span className="text-muted-foreground text-[10px] uppercase">To</span>
                        <span className="flex items-center gap-1"><Warehouse className="h-3 w-3 text-emerald-400" /> {t.to_warehouse?.name}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <User className="h-3 w-3" />
                      {t.profiles?.full_name || "System"}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <StatusBadge status={t.status || "Draft"} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {t.created_at ? format(new Date(t.created_at), "MMM dd, yyyy") : "-"}
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
