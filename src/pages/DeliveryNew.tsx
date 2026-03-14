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

interface LineItem { product_id: string; requested_qty: number; delivered_qty: number; }

export default function DeliveryNew() {
  const [customerName, setCustomerName] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<LineItem[]>([]);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuthStore();

  const { data: warehouses } = useQuery({ queryKey: ["warehouses"], queryFn: async () => { const { data } = await supabase.from("warehouses").select("*"); return data || []; } });
  const { data: products } = useQuery({ queryKey: ["products"], queryFn: async () => { const { data } = await supabase.from("products").select("*").order("name"); return data || []; } });

  const addItem = () => setItems([...items, { product_id: "", requested_qty: 0, delivered_qty: 0 }]);
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: keyof LineItem, value: any) => {
    const updated = [...items]; (updated[i] as any)[field] = value; setItems(updated);
  };

  const saveMutation = useMutation({
    mutationFn: async (status: string) => {
      if (!warehouseId) throw new Error("Select a warehouse");
      if (items.length === 0) throw new Error("Add at least one item");
      const { data: delivery, error } = await supabase.from("deliveries").insert({
        reference_no: "", customer_name: customerName, warehouse_id: warehouseId,
        status, notes, created_by: user?.id,
      }).select().single();
      if (error) throw error;
      const deliveryItems = items.map(item => ({ delivery_id: delivery.id, product_id: item.product_id, requested_qty: item.requested_qty, delivered_qty: item.delivered_qty }));
      const { error: itemsError } = await supabase.from("delivery_items").insert(deliveryItems);
      if (itemsError) throw itemsError;
      if (status === "Done") {
        const { error: ve } = await supabase.rpc("validate_delivery", { p_delivery_id: delivery.id, p_user_id: user?.id });
        if (ve) throw ve;
      }
      return delivery;
    },
    onSuccess: () => { toast.success("Delivery created"); qc.invalidateQueries({ queryKey: ["deliveries"] }); qc.invalidateQueries({ queryKey: ["dashboard-stock"] }); navigate("/deliveries"); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold mb-6">New Delivery</h1>
      <Card className="mb-6"><CardContent className="p-4 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div><Label>Customer Name</Label><Input value={customerName} onChange={e => setCustomerName(e.target.value)} /></div>
          <div><Label>Warehouse</Label>
            <Select value={warehouseId} onValueChange={setWarehouseId}><SelectTrigger><SelectValue placeholder="Select warehouse" /></SelectTrigger>
              <SelectContent>{warehouses?.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent></Select>
          </div>
        </div>
        <div><Label>Notes</Label><Input value={notes} onChange={e => setNotes(e.target.value)} /></div>
      </CardContent></Card>

      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm">Items</CardTitle>
          <Button size="sm" variant="outline" onClick={addItem}><Plus className="h-3 w-3 mr-1" />Add Item</Button>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? <p className="text-sm text-muted-foreground text-center py-6">No items added yet</p> : (
            <Table><TableHeader><TableRow>
              <TableHead className="text-xs">Product</TableHead>
              <TableHead className="text-xs">Requested Qty</TableHead>
              <TableHead className="text-xs">Delivered Qty</TableHead>
              <TableHead className="text-xs w-10"></TableHead>
            </TableRow></TableHeader>
            <TableBody>{items.map((item, i) => (
              <TableRow key={i}>
                <TableCell><Select value={item.product_id} onValueChange={v => updateItem(i, "product_id", v)}><SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{products?.map(p => <SelectItem key={p.id} value={p.id}>{p.name} ({p.sku})</SelectItem>)}</SelectContent></Select></TableCell>
                <TableCell><Input type="number" className="h-8 font-mono" value={item.requested_qty} onChange={e => updateItem(i, "requested_qty", parseInt(e.target.value) || 0)} /></TableCell>
                <TableCell><Input type="number" className="h-8 font-mono" value={item.delivered_qty} onChange={e => updateItem(i, "delivered_qty", parseInt(e.target.value) || 0)} /></TableCell>
                <TableCell><Button variant="ghost" size="icon" onClick={() => removeItem(i)}><Trash2 className="h-3 w-3 text-destructive" /></Button></TableCell>
              </TableRow>
            ))}</TableBody></Table>
          )}
        </CardContent>
      </Card>
      <div className="flex gap-3 mt-6">
        <Button variant="outline" onClick={() => saveMutation.mutate("Draft")} disabled={saveMutation.isPending}>Save as Draft</Button>
        <Button onClick={() => saveMutation.mutate("Done")} disabled={saveMutation.isPending}>Validate & Ship</Button>
      </div>
    </div>
  );
}
