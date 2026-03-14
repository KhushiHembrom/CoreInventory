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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export default function TransferDetail() {
  const { id } = useParams();
  const { user } = useAuthStore();
  const qc = useQueryClient();

  const { data: transfer, isLoading } = useQuery({ queryKey: ["transfer", id], queryFn: async () => { const { data } = await supabase.from("internal_transfers").select("*").eq("id", id!).single(); return data; } });
  const { data: items } = useQuery({ queryKey: ["transfer-items", id], queryFn: async () => { const { data } = await supabase.from("transfer_items").select("*").eq("transfer_id", id!); return data || []; } });
  const { data: products } = useQuery({ queryKey: ["products"], queryFn: async () => { const { data } = await supabase.from("products").select("*"); return data || []; } });
  const { data: warehouses } = useQuery({ queryKey: ["warehouses"], queryFn: async () => { const { data } = await supabase.from("warehouses").select("*"); return data || []; } });

  const validateMutation = useMutation({
    mutationFn: async () => { const { error } = await supabase.rpc("validate_transfer", { p_transfer_id: id!, p_user_id: user?.id }); if (error) throw error; },
    onSuccess: () => { toast.success("Transfer validated"); qc.invalidateQueries({ queryKey: ["transfer", id] }); qc.invalidateQueries({ queryKey: ["dashboard-stock"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const cancelMutation = useMutation({
    mutationFn: async () => { const { error } = await supabase.from("internal_transfers").update({ status: "Canceled" }).eq("id", id!); if (error) throw error; },
    onSuccess: () => { toast.success("Transfer canceled"); qc.invalidateQueries({ queryKey: ["transfer", id] }); },
  });

  if (isLoading) return <Skeleton className="h-64" />;
  if (!transfer) return <p className="text-muted-foreground">Not found</p>;

  const getProductName = (pid: string) => products?.find(p => p.id === pid)?.name || "Unknown";
  const getWName = (wid: string | null) => warehouses?.find(w => w.id === wid)?.name || "-";
  const canValidate = transfer.status !== "Done" && transfer.status !== "Canceled";

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-semibold font-mono">{transfer.reference_no}</h1><p className="text-sm text-muted-foreground">Transfer</p></div>
        <StatusBadge status={transfer.status || "Draft"} />
      </div>
      <Card><CardContent className="p-4 grid grid-cols-2 gap-4 text-sm">
        <div><span className="text-muted-foreground">From:</span> <span className="font-medium ml-1">{getWName(transfer.from_warehouse_id)}</span></div>
        <div><span className="text-muted-foreground">To:</span> <span className="font-medium ml-1">{getWName(transfer.to_warehouse_id)}</span></div>
        <div><span className="text-muted-foreground">Created:</span> <span className="ml-1">{transfer.created_at ? format(new Date(transfer.created_at), "MMM dd, yyyy HH:mm") : "-"}</span></div>
        <div><span className="text-muted-foreground">Notes:</span> <span className="ml-1">{transfer.notes || "-"}</span></div>
      </CardContent></Card>
      <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Items</CardTitle></CardHeader><CardContent>
        <Table><TableHeader><TableRow><TableHead className="text-xs">Product</TableHead><TableHead className="text-xs">Quantity</TableHead></TableRow></TableHeader>
          <TableBody>{items?.map(item => (
            <TableRow key={item.id}><TableCell className="text-sm">{getProductName(item.product_id)}</TableCell><TableCell className="text-sm font-mono">{item.quantity}</TableCell></TableRow>
          ))}</TableBody></Table>
      </CardContent></Card>
      {canValidate && <div className="flex gap-3">
        <Button onClick={() => validateMutation.mutate()} disabled={validateMutation.isPending}>Validate</Button>
        <AlertDialog><AlertDialogTrigger asChild><Button variant="outline" className="text-destructive">Cancel</Button></AlertDialogTrigger>
          <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Cancel transfer?</AlertDialogTitle><AlertDialogDescription>This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter><AlertDialogCancel>No</AlertDialogCancel><AlertDialogAction onClick={() => cancelMutation.mutate()}>Yes</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
      </div>}
    </div>
  );
}
