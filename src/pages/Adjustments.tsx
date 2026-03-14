import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Scale, ChevronRight, Warehouse, Calendar, User, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";

const StatusBadge = ({ status }: { status: string }) => {
  const styles: Record<string, string> = {
    Draft: "bg-gray-100 text-gray-600 border-gray-200",
    Done: "bg-emerald-50 text-emerald-600 border-emerald-100",
  };
  return (
    <Badge variant="outline" className={`${styles[status] || ""} font-medium`}>
      {status}
    </Badge>
  );
};

export default function Adjustments() {
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  const { data: adjustments, isLoading } = useQuery({
    queryKey: ["adjustments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stock_adjustments")
        .select("*, warehouses(name), profiles(full_name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const filtered = adjustments?.filter(a => {
    return a.reference_no.toLowerCase().includes(search.toLowerCase());
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
          <h1 className="text-2xl font-bold tracking-tight">Stock Adjustments</h1>
          <p className="text-sm text-muted-foreground">Manual corrections for inventory discrepancies</p>
        </div>
        <Button onClick={() => navigate("/adjustments/new")} className="gap-2 shadow-sm bg-slate-700 hover:bg-slate-800">
          <Plus className="h-4 w-4" />
          New Adjustment
        </Button>
      </div>

      <div className="flex justify-end items-center gap-4">
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
              <TableHead className="text-[10px] uppercase font-bold tracking-wider py-3">Warehouse</TableHead>
              <TableHead className="text-[10px] uppercase font-bold tracking-wider py-3">Reason</TableHead>
              <TableHead className="text-[10px] uppercase font-bold tracking-wider py-3">Created By</TableHead>
              <TableHead className="text-[10px] uppercase font-bold tracking-wider py-3 text-center">Status</TableHead>
              <TableHead className="text-[10px] uppercase font-bold tracking-wider py-3 text-right">Date</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-64 text-center">
                  <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                    <Scale className="h-8 w-8 opacity-20" />
                    <p className="text-sm">No adjustments found</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map(a => (
                <TableRow 
                  key={a.id} 
                  className="hover:bg-muted/10 transition-colors cursor-pointer group"
                  onClick={() => navigate(`/adjustments/${a.id}`)}
                >
                  <TableCell className="font-mono text-xs font-bold text-slate-600">
                    <div className="flex items-center gap-2">
                      <FileText className="h-3 w-3" />
                      {a.reference_no}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm font-medium">
                    <div className="flex items-center gap-1.5">
                        <Warehouse className="h-3 w-3 text-muted-foreground" />
                        {a.warehouses?.name}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground italic">
                    {a.reason || "No reason provided"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <User className="h-3 w-3" />
                      {a.profiles?.full_name || "System"}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <StatusBadge status={a.status || "Draft"} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {a.created_at ? format(new Date(a.created_at), "MMM dd, yyyy") : "-"}
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

