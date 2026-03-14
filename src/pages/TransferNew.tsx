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

interface LineItem { product_id: string; quantity: number; }

export default function TransferNew() {
  const [fromWarehouseId, setFromWarehouseId] = useState("");
  const [toWarehouseId, setToWarehouseId] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<LineItem[]>([]);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuthStore();

  const { data: warehouses } = useQuery({ queryKey: ["warehouses"], queryFn: async () => { const { data } = await supabase.from("warehouses").select("*"); return data || []; } });
  const { data: products } = useQuery({ queryKey: ["products"], queryFn: async () => { const { data } = await supabase.from("products").select("*").order("name"); return data || []; } });

  const addItem = () => setItems([...items, { product_id: "", quantity: 0 }]);
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: keyof LineItem, value: any) => { const u = [...items]; (u[i] as any)[field] = value; setItems(u); };

  const saveMutation = useMutation({
    mutationFn: async (status: string) => {
      if (!fromWarehouseId || !toWarehouseId) throw new Error("Select both warehouses");
      if (fromWarehouseId === toWarehouseId) throw new Error("Warehouses must be different");
      if (items.length === 0) throw new Error("Add at least one item");
      const { data: transfer, error } = await supabase.from("internal_transfers").insert({
        reference_no: "", from_warehouse_id: fromWarehouseId, to_warehouse_id: toWarehouseId, status, notes, created_by: user?.id,
      }).select().single();
      if (error) throw error;
      const { error: ie } = await supabase.from("transfer_items").insert(items.map(item => ({ transfer_id: transfer.id, product_id: item.product_id, quantity: item.quantity })));
      if (ie) throw ie;
      if (status === "Done") {
        const { error: ve } = await supabase.rpc("validate_transfer", { p_transfer_id: transfer.id, p_user_id: user?.id });
        if (ve) throw ve;
      }
    },
    onSuccess: () => { toast.success("Transfer created"); qc.invalidateQueries({ queryKey: ["transfers"] }); qc.invalidateQueries({ queryKey: ["dashboard-stock"] }); navigate("/transfers"); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold mb-6">New Transfer</h1>
      <Card className="mb-6"><CardContent className="p-4 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div><Label>From Warehouse</Label><Select value={fromWarehouseId} onValueChange={setFromWarehouseId}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{warehouses?.map(w=><SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent></Select></div>
          <div><Label>To Warehouse</Label><Select value={toWarehouseId} onValueChange={setToWarehouseId}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{warehouses?.map(w=><SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent></Select></div>
        </div>
        <div><Label>Notes</Label><Input value={notes} onChange={e => setNotes(e.target.value)} /></div>
      </CardContent></Card>
      <Card><CardHeader className="pb-2 flex flex-row items-center justify-between"><CardTitle className="text-sm">Items</CardTitle><Button size="sm" variant="outline" onClick={addItem}><Plus className="h-3 w-3 mr-1"/>Add</Button></CardHeader>
        <CardContent>{items.length===0?<p className="text-sm text-muted-foreground text-center py-6">No items</p>:(
          <Table><TableHeader><TableRow><TableHead className="text-xs">Product</TableHead><TableHead className="text-xs">Quantity</TableHead><TableHead className="text-xs w-10"></TableHead></TableRow></TableHeader>
            <TableBody>{items.map((item,i)=>(
              <TableRow key={i}><TableCell><Select value={item.product_id} onValueChange={v=>updateItem(i,"product_id",v)}><SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select"/></SelectTrigger><SelectContent>{products?.map(p=><SelectItem key={p.id} value={p.id}>{p.name} ({p.sku})</SelectItem>)}</SelectContent></Select></TableCell>
                <TableCell><Input type="number" className="h-8 font-mono" value={item.quantity} onChange={e=>updateItem(i,"quantity",parseInt(e.target.value)||0)}/></TableCell>
                <TableCell><Button variant="ghost" size="icon" onClick={()=>removeItem(i)}><Trash2 className="h-3 w-3 text-destructive"/></Button></TableCell></TableRow>
            ))}</TableBody></Table>
        )}</CardContent></Card>
      <div className="flex gap-3 mt-6">
        <Button variant="outline" onClick={()=>saveMutation.mutate("Draft")} disabled={saveMutation.isPending}>Save as Draft</Button>
        <Button onClick={()=>saveMutation.mutate("Done")} disabled={saveMutation.isPending}>Validate & Transfer</Button>
      </div>
    </div>
  );
}
