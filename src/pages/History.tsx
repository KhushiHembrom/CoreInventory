import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { useState } from "react";
import { Download, History as HistoryIcon, Search, Package, Warehouse, Calendar, ArrowRightLeft, User, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";

const OperationBadge = ({ type }: { type: string }) => {
  const styles: Record<string, string> = {
    receipt: "bg-emerald-50 text-emerald-600 border-emerald-100",
    delivery: "bg-rose-50 text-rose-600 border-rose-100",
    transfer_in: "bg-indigo-50 text-indigo-600 border-indigo-100",
    transfer_out: "bg-amber-50 text-amber-600 border-amber-100",
    adjustment: "bg-slate-50 text-slate-600 border-slate-100",
  };
  return (
    <Badge variant="outline" className={`${styles[type] || ""} font-medium capitalize px-2 py-0 h-5 text-[10px]`}>
      {type.replace('_', ' ')}
    </Badge>
  );
};

export default function History() {
  const [opFilter, setOpFilter] = useState("all");
  const [search, setSearch] = useState("");

  const { data: ledger, isLoading } = useQuery({
    queryKey: ["ledger"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stock_ledger")
        .select(`
          *,
          products(name, sku),
          warehouses(name)
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const filtered = ledger?.filter(e => {
    const matchOp = opFilter === "all" || e.operation_type === opFilter;
    const matchSearch = e.reference_no?.toLowerCase().includes(search.toLowerCase()) || 
                      e.products?.name?.toLowerCase().includes(search.toLowerCase());
    return matchOp && matchSearch;
  }) || [];

  const exportCSV = () => {
    const headers = "Date,Product,SKU,Operation,Change,Before,After,Reference,Warehouse\n";
    const rows = filtered.map(e =>
      `${e.created_at},"${e.products?.name}","${e.products?.sku}",${e.operation_type},${e.quantity_change},${e.quantity_before},${e.quantity_after},"${e.reference_no || ''}","${e.warehouses?.name}"`
    ).join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); 
    a.href = url; 
    a.download = `stock_history_${format(new Date(), "yyyy-MM-dd")}.csv`; 
    a.click();
  };

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
          <h1 className="text-2xl font-bold tracking-tight">Audit Trail</h1>
          <p className="text-sm text-muted-foreground mt-1">Full history of stock movements and corrections</p>
        </div>
        <Button variant="outline" size="sm" onClick={exportCSV} className="gap-2 bg-white">
          <Download className="h-4 w-4" />
          Export to CSV
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Select value={opFilter} onValueChange={setOpFilter}>
            <SelectTrigger className="w-full sm:w-[180px] bg-white text-xs h-9">
              <SelectValue placeholder="All Operations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Operations</SelectItem>
              {["receipt","delivery","transfer_in","transfer_out","adjustment"].map(o=>(
                <SelectItem key={o} value={o} className="capitalize">{o.replace('_', ' ')}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search reference or product..." 
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
              <TableHead className="text-[10px] uppercase font-bold tracking-wider py-3">Timestamp</TableHead>
              <TableHead className="text-[10px] uppercase font-bold tracking-wider py-3">Product</TableHead>
              <TableHead className="text-[10px] uppercase font-bold tracking-wider py-3">Warehouse</TableHead>
              <TableHead className="text-[10px] uppercase font-bold tracking-wider py-3">Type</TableHead>
              <TableHead className="text-[10px] uppercase font-bold tracking-wider py-3 text-right">Change</TableHead>
              <TableHead className="text-[10px] uppercase font-bold tracking-wider py-3 text-right">Result</TableHead>
              <TableHead className="text-[10px] uppercase font-bold tracking-wider py-3 text-right">Reference</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-64 text-center">
                  <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                    <HistoryIcon className="h-8 w-8 opacity-20" />
                    <p className="text-sm">No ledger entries found</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map(e => (
                <TableRow key={e.id} className="hover:bg-muted/5 transition-colors">
                  <TableCell className="py-3">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {e.created_at ? format(new Date(e.created_at), "MMM dd, HH:mm") : "-"}
                    </div>
                  </TableCell>
                  <TableCell className="py-3">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold">{e.products?.name}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">{e.products?.sku}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-3">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Warehouse className="h-3 w-3" />
                      {e.warehouses?.name}
                    </div>
                  </TableCell>
                  <TableCell className="py-3">
                    <OperationBadge type={e.operation_type} />
                  </TableCell>
                  <TableCell className="py-3 text-right">
                    <span className={`text-xs font-mono font-bold ${e.quantity_change > 0 ? "text-emerald-600" : "text-rose-600"}`}>
                      {e.quantity_change > 0 ? "+" : ""}{e.quantity_change}
                    </span>
                  </TableCell>
                  <TableCell className="py-3 text-right">
                    <div className="flex flex-col items-end">
                      <span className="text-xs font-bold font-mono">{e.quantity_after}</span>
                      <span className="text-[10px] text-muted-foreground">was {e.quantity_before}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-3 text-right">
                    <span className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                      {e.reference_no || "MANUAL"}
                    </span>
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

