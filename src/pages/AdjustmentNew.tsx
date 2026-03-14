import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

interface LineItem { product_id: string; recorded_qty: number; actual_qty: number; }

export default function AdjustmentNew() {
  const [warehouseId, setWarehouseId] = useState("");
  const [reason, setReason] = useState("");
  const [items, setItems] = useState<LineItem[]>([]);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuthStore();

  const { data: warehouses } = useQuery({ queryKey: ["warehouses"], queryFn: async () => { const { data } = await supabase.from("warehouses").select("*"); return data || []; } });
  const { data: products } = useQuery({ queryKey: ["products"], queryFn: async () => { const { data } = await supabase.from("products").select("*").order("name"); return data || []; } });
  const { data: stock } = useQuery({ queryKey: ["stock"], queryFn: async () => { const { data } = await supabase.from("stock").select("*"); return data || []; } });

  const addItem = () => setItems([...items, { product_id: "", recorded_qty: 0, actual_qty: 0 }]);
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: keyof LineItem, value: any) => {
    const u = [...items]; (u[i] as any)[field] = value;
    if (field === "product_id" && warehouseId) {
      const currentStock = stock?.find(s => s.product_id === value && s.warehouse_id === warehouseId);
      u[i].recorded_qty = currentStock?.quantity || 0;
    }
    setItems(u);
  };

  const saveMutation = useMutation({
    mutationFn: async (status: string) => {
      if (!warehouseId) throw new Error("Select a warehouse");
      if (items.length === 0) throw new Error("Add at least one item");
      const { data: adj, error } = await supabase.from("stock_adjustments").insert({
        reference_no: "", warehouse_id: warehouseId, status: "Draft", reason, created_by: user?.id,
      }).select().single();
      if (error) throw error;
      const { error: ie } = await supabase.from("adjustment_items").insert(items.map(item => ({
        adjustment_id: adj.id, product_id: item.product_id, recorded_qty: item.recorded_qty, actual_qty: item.actual_qty,
      })));
      if (ie) throw ie;
      if (status === "Done") {
        const { error: ve } = await supabase.rpc("validate_adjustment", { p_adjustment_id: adj.id, p_user_id: user?.id });
        if (ve) throw ve;
      }
    },
    onSuccess: () => { toast.success("Adjustment created"); qc.invalidateQueries({ queryKey: ["adjustments"] }); qc.invalidateQueries({ queryKey: ["dashboard-stock"] }); navigate("/adjustments"); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold mb-6">New Adjustment</h1>
      <Card className="mb-6"><CardContent className="p-4 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div><Label>Warehouse</Label><Select value={warehouseId} onValueChange={setWarehouseId}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{warehouses?.map(w=><SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent></Select></div>
          <div><Label>Reason</Label><Input value={reason} onChange={e => setReason(e.target.value)} /></div>
        </div>
      </CardContent></Card>
      <Card><CardHeader className="pb-2 flex flex-row items-center justify-between"><CardTitle className="text-sm">Items</CardTitle><Button size="sm" variant="outline" onClick={addItem}><Plus className="h-3 w-3 mr-1"/>Add</Button></CardHeader>
        <CardContent>{items.length===0?<p className="text-sm text-muted-foreground text-center py-6">No items</p>:(
          <Table><TableHeader><TableRow><TableHead className="text-xs">Product</TableHead><TableHead className="text-xs">Recorded Qty</TableHead><TableHead className="text-xs">Actual Qty</TableHead><TableHead className="text-xs">Diff</TableHead><TableHead className="text-xs w-10"></TableHead></TableRow></TableHeader>
            <TableBody>{items.map((item,i)=>(
              <TableRow key={i}>
                <TableCell><Select value={item.product_id} onValueChange={v=>updateItem(i,"product_id",v)}><SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select"/></SelectTrigger><SelectContent>{products?.map(p=><SelectItem key={p.id} value={p.id}>{p.name} ({p.sku})</SelectItem>)}</SelectContent></Select></TableCell>
                <TableCell><Input type="number" className="h-8 font-mono" value={item.recorded_qty} readOnly /></TableCell>
                <TableCell><Input type="number" className="h-8 font-mono" value={item.actual_qty} onChange={e=>updateItem(i,"actual_qty",parseInt(e.target.value)||0)} /></TableCell>
                <TableCell className={`text-sm font-mono ${item.actual_qty - item.recorded_qty > 0 ? "text-success" : item.actual_qty - item.recorded_qty < 0 ? "text-destructive" : ""}`}>{item.actual_qty - item.recorded_qty}</TableCell>
                <TableCell><Button variant="ghost" size="icon" onClick={()=>removeItem(i)}><Trash2 className="h-3 w-3 text-destructive"/></Button></TableCell>
              </TableRow>
            ))}</TableBody></Table>
        )}</CardContent></Card>
      <div className="flex gap-3 mt-6">
        <Button variant="outline" onClick={()=>saveMutation.mutate("Draft")} disabled={saveMutation.isPending}>Save as Draft</Button>
        <Button onClick={()=>saveMutation.mutate("Done")} disabled={saveMutation.isPending}>Validate Adjustment</Button>
      </div>
    </div>
  );
}
