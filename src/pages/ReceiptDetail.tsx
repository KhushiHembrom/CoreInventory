import { useParams, useNavigate } from "react-router-dom";
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

export default function ReceiptDetail() {
  const { id } = useParams();
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data: receipt, isLoading } = useQuery({
    queryKey: ["receipt", id],
    queryFn: async () => { const { data } = await supabase.from("receipts").select("*").eq("id", id!).single(); return data; },
  });

  const { data: items } = useQuery({
    queryKey: ["receipt-items", id],
    queryFn: async () => { const { data } = await supabase.from("receipt_items").select("*").eq("receipt_id", id!); return data || []; },
  });

  const { data: products } = useQuery({ queryKey: ["products"], queryFn: async () => { const { data } = await supabase.from("products").select("*"); return data || []; } });
  const { data: warehouses } = useQuery({ queryKey: ["warehouses"], queryFn: async () => { const { data } = await supabase.from("warehouses").select("*"); return data || []; } });

  const validateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("validate_receipt", { p_receipt_id: id!, p_user_id: user?.id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Receipt validated");
      qc.invalidateQueries({ queryKey: ["receipt", id] });
      qc.invalidateQueries({ queryKey: ["dashboard-stock"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("receipts").update({ status: "Canceled" }).eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Receipt canceled"); qc.invalidateQueries({ queryKey: ["receipt", id] }); },
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading) return <Skeleton className="h-64" />;
  if (!receipt) return <p className="text-muted-foreground">Receipt not found</p>;

  const getProductName = (pid: string) => products?.find(p => p.id === pid)?.name || "Unknown";
  const warehouseName = warehouses?.find(w => w.id === receipt.warehouse_id)?.name || "-";
  const canValidate = receipt.status !== "Done" && receipt.status !== "Canceled";

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold font-mono">{receipt.reference_no}</h1>
          <p className="text-sm text-muted-foreground">Receipt</p>
        </div>
        <StatusBadge status={receipt.status || "Draft"} />
      </div>

      <Card>
        <CardContent className="p-4 grid grid-cols-2 gap-4 text-sm">
          <div><span className="text-muted-foreground">Supplier:</span> <span className="font-medium ml-1">{receipt.supplier_name || "-"}</span></div>
          <div><span className="text-muted-foreground">Warehouse:</span> <span className="font-medium ml-1">{warehouseName}</span></div>
          <div><span className="text-muted-foreground">Created:</span> <span className="ml-1">{receipt.created_at ? format(new Date(receipt.created_at), "MMM dd, yyyy HH:mm") : "-"}</span></div>
          <div><span className="text-muted-foreground">Notes:</span> <span className="ml-1">{receipt.notes || "-"}</span></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Items</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Product</TableHead>
                <TableHead className="text-xs">Expected</TableHead>
                <TableHead className="text-xs">Received</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items?.map(item => (
                <TableRow key={item.id}>
                  <TableCell className="text-sm">{getProductName(item.product_id)}</TableCell>
                  <TableCell className="text-sm font-mono">{item.expected_qty}</TableCell>
                  <TableCell className="text-sm font-mono">{item.received_qty}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {canValidate && (
        <div className="flex gap-3">
          <Button onClick={() => validateMutation.mutate()} disabled={validateMutation.isPending}>Validate</Button>
          <AlertDialog>
            <AlertDialogTrigger asChild><Button variant="outline" className="text-destructive">Cancel Receipt</Button></AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Cancel this receipt?</AlertDialogTitle>
                <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>No</AlertDialogCancel>
                <AlertDialogAction onClick={() => cancelMutation.mutate()}>Yes, Cancel</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </div>
  );
}
