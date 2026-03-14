import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { format } from "date-fns";

export default function AdjustmentDetail() {
  const { id } = useParams();
  const { user } = useAuthStore();
  const qc = useQueryClient();

  const { data: adjustment, isLoading } = useQuery({ queryKey: ["adjustment", id], queryFn: async () => { const { data } = await supabase.from("stock_adjustments").select("*").eq("id", id!).single(); return data; } });
  const { data: items } = useQuery({ queryKey: ["adjustment-items", id], queryFn: async () => { const { data } = await supabase.from("adjustment_items").select("*").eq("adjustment_id", id!); return data || []; } });
  const { data: products } = useQuery({ queryKey: ["products"], queryFn: async () => { const { data } = await supabase.from("products").select("*"); return data || []; } });
  const { data: warehouses } = useQuery({ queryKey: ["warehouses"], queryFn: async () => { const { data } = await supabase.from("warehouses").select("*"); return data || []; } });

  const validateMutation = useMutation({
    mutationFn: async () => { const { error } = await supabase.rpc("validate_adjustment", { p_adjustment_id: id!, p_user_id: user?.id }); if (error) throw error; },
    onSuccess: () => { toast.success("Adjustment validated"); qc.invalidateQueries({ queryKey: ["adjustment", id] }); qc.invalidateQueries({ queryKey: ["dashboard-stock"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading) return <Skeleton className="h-64" />;
  if (!adjustment) return <p className="text-muted-foreground">Not found</p>;

  const getProductName = (pid: string) => products?.find(p => p.id === pid)?.name || "Unknown";
  const warehouseName = warehouses?.find(w => w.id === adjustment.warehouse_id)?.name || "-";

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-semibold font-mono">{adjustment.reference_no}</h1><p className="text-sm text-muted-foreground">Adjustment</p></div>
        <StatusBadge status={adjustment.status || "Draft"} />
      </div>
      <Card><CardContent className="p-4 grid grid-cols-2 gap-4 text-sm">
        <div><span className="text-muted-foreground">Warehouse:</span> <span className="font-medium ml-1">{warehouseName}</span></div>
        <div><span className="text-muted-foreground">Reason:</span> <span className="ml-1">{adjustment.reason || "-"}</span></div>
        <div><span className="text-muted-foreground">Created:</span> <span className="ml-1">{adjustment.created_at ? format(new Date(adjustment.created_at), "MMM dd, yyyy HH:mm") : "-"}</span></div>
      </CardContent></Card>
      <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Items</CardTitle></CardHeader><CardContent>
        <Table><TableHeader><TableRow><TableHead className="text-xs">Product</TableHead><TableHead className="text-xs">Recorded</TableHead><TableHead className="text-xs">Actual</TableHead><TableHead className="text-xs">Diff</TableHead></TableRow></TableHeader>
          <TableBody>{items?.map(item => (
            <TableRow key={item.id}>
              <TableCell className="text-sm">{getProductName(item.product_id)}</TableCell>
              <TableCell className="text-sm font-mono">{item.recorded_qty}</TableCell>
              <TableCell className="text-sm font-mono">{item.actual_qty}</TableCell>
              <TableCell className={`text-sm font-mono ${(item.difference || 0) > 0 ? "text-success" : (item.difference || 0) < 0 ? "text-destructive" : ""}`}>{item.difference}</TableCell>
            </TableRow>
          ))}</TableBody></Table>
      </CardContent></Card>
      {adjustment.status !== "Done" && <Button onClick={() => validateMutation.mutate()} disabled={validateMutation.isPending}>Validate</Button>}
    </div>
  );
}
