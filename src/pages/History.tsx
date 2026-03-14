import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { useState } from "react";
import { Download } from "lucide-react";

export default function History() {
  const [opFilter, setOpFilter] = useState("all");

  const { data: ledger, isLoading } = useQuery({
    queryKey: ["ledger"],
    queryFn: async () => { const { data } = await supabase.from("stock_ledger").select("*").order("created_at", { ascending: false }); return data || []; },
  });
  const { data: products } = useQuery({ queryKey: ["products"], queryFn: async () => { const { data } = await supabase.from("products").select("*"); return data || []; } });
  const { data: warehouses } = useQuery({ queryKey: ["warehouses"], queryFn: async () => { const { data } = await supabase.from("warehouses").select("*"); return data || []; } });

  const filtered = ledger?.filter(e => opFilter === "all" || e.operation_type === opFilter) || [];
  const getProductName = (id: string) => products?.find(p => p.id === id)?.name || "Unknown";
  const getWarehouseName = (id: string) => warehouses?.find(w => w.id === id)?.name || "Unknown";

  const exportCSV = () => {
    const headers = "Date,Product,Operation,Change,Before,After,Reference,Warehouse\n";
    const rows = filtered.map(e =>
      `${e.created_at},${getProductName(e.product_id)},${e.operation_type},${e.quantity_change},${e.quantity_before},${e.quantity_after},${e.reference_no},${getWarehouseName(e.warehouse_id)}`
    ).join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "stock_history.csv"; a.click();
  };

  if (isLoading) return <Skeleton className="h-64" />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-semibold">Move History</h1><p className="text-sm text-muted-foreground mt-1">Complete stock ledger</p></div>
        <Button variant="outline" size="sm" onClick={exportCSV}><Download className="h-4 w-4 mr-1" />Export CSV</Button>
      </div>
      <div className="mb-4">
        <Select value={opFilter} onValueChange={setOpFilter}><SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Operations</SelectItem>
            {["receipt","delivery","transfer_in","transfer_out","adjustment"].map(o=><SelectItem key={o} value={o}>{o}</SelectItem>)}
          </SelectContent></Select>
      </div>
      {filtered.length === 0 ? <EmptyState title="No history" description="Stock movements will appear here" /> : (
        <div className="border rounded-lg bg-card overflow-hidden">
          <Table><TableHeader><TableRow>
            <TableHead className="text-xs">Date</TableHead><TableHead className="text-xs">Product</TableHead><TableHead className="text-xs">Operation</TableHead>
            <TableHead className="text-xs">Change</TableHead><TableHead className="text-xs">Before</TableHead><TableHead className="text-xs">After</TableHead>
            <TableHead className="text-xs">Reference</TableHead><TableHead className="text-xs">Warehouse</TableHead>
          </TableRow></TableHeader>
          <TableBody>{filtered.map(e => (
            <TableRow key={e.id} className="hover:bg-row-hover">
              <TableCell className="text-xs">{e.created_at ? format(new Date(e.created_at), "MMM dd, HH:mm") : "-"}</TableCell>
              <TableCell className="text-xs font-medium">{getProductName(e.product_id)}</TableCell>
              <TableCell className="text-xs">{e.operation_type}</TableCell>
              <TableCell className={`text-xs font-mono ${e.quantity_change > 0 ? "text-success" : "text-destructive"}`}>{e.quantity_change > 0 ? "+" : ""}{e.quantity_change}</TableCell>
              <TableCell className="text-xs font-mono">{e.quantity_before}</TableCell>
              <TableCell className="text-xs font-mono">{e.quantity_after}</TableCell>
              <TableCell className="text-xs font-mono">{e.reference_no}</TableCell>
              <TableCell className="text-xs">{getWarehouseName(e.warehouse_id)}</TableCell>
            </TableRow>
          ))}</TableBody></Table>
        </div>
      )}
    </div>
  );
}
