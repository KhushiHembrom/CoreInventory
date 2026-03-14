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
import { Plus, Trash2, Save, ArrowRightLeft, Package, Warehouse as WarehouseIcon, FileText, MoveHorizontal } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

interface LineItem { product_id: string; quantity: number; }

export default function TransferNew() {
  const [fromWarehouseId, setFromWarehouseId] = useState("");
  const [toWarehouseId, setToWarehouseId] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<LineItem[]>([]);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuthStore();

  const { data: warehouses } = useQuery({ 
    queryKey: ["warehouses"], 
    queryFn: async () => { 
      const { data } = await supabase.from("warehouses").select("*").order("name"); 
      return data || []; 
    } 
  });

  const { data: products } = useQuery({ 
    queryKey: ["products"], 
    queryFn: async () => { 
      const { data } = await supabase.from("products").select("*").order("name"); 
      return data || []; 
    } 
  });

  const { data: stock } = useQuery({
    queryKey: ["stock", fromWarehouseId],
    queryFn: async () => {
      if (!fromWarehouseId) return [];
      const { data } = await supabase.from("stock").select("*").eq("warehouse_id", fromWarehouseId);
      return data || [];
    },
    enabled: !!fromWarehouseId
  });

  const addItem = () => setItems([...items, { product_id: "", quantity: 1 }]);
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: keyof LineItem, value: any) => {
    const updated = [...items];
    (updated[i] as any)[field] = value;
    setItems(updated);
  };

  const getAvailableStock = (productId: string) => {
    return stock?.find(s => s.product_id === productId)?.quantity || 0;
  };

  const saveMutation = useMutation({
    mutationFn: async (status: "Draft" | "Done") => {
      if (!fromWarehouseId || !toWarehouseId) throw new Error("Please select both warehouses");
      if (fromWarehouseId === toWarehouseId) throw new Error("Source and destination must be different");
      if (items.length === 0) throw new Error("Add at least one item to the transfer");
      if (items.some(i => !i.product_id)) throw new Error("All items must have a product selected");

      // Stock check for "Done"
      if (status === "Done") {
        for (const item of items) {
            const avail = getAvailableStock(item.product_id);
            if (item.quantity > avail) {
                const prodName = products?.find(p => p.id === item.product_id)?.name;
                throw new Error(`Insufficient stock for ${prodName} in source warehouse. Available: ${avail}`);
            }
        }
      }

      // 1. Create Transfer
      const { data: transfer, error: transferError } = await supabase.from("internal_transfers").insert({
        from_warehouse_id: fromWarehouseId,
        to_warehouse_id: toWarehouseId,
        status: status === "Done" ? "Ready" : "Draft",
        notes,
        created_by: user?.id,
      }).select().single();
      
      if (transferError) throw transferError;

      // 2. Create Items
      const { error: itemsError } = await supabase.from("transfer_items").insert(
        items.map(item => ({
          transfer_id: transfer.id,
          product_id: item.product_id,
          quantity: item.quantity,
        }))
      );
      if (itemsError) throw itemsError;

      // 3. If "Done", validate immediately
      if (status === "Done") {
        const { error: validateError } = await supabase.rpc("validate_transfer", {
          p_transfer_id: transfer.id,
          p_user_id: user?.id,
        });
        if (validateError) throw validateError;
      }

      return transfer;
    },
    onSuccess: (_, status) => {
      toast.success(status === "Done" ? "Transfer completed successfully" : "Transfer saved as draft");
      qc.invalidateQueries({ queryKey: ["transfers"] });
      qc.invalidateQueries({ queryKey: ["stock"] });
      navigate("/transfers");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">New Internal Transfer</h1>
          <p className="text-sm text-muted-foreground">Relocate stock between your warehouse locations</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Details */}
        <div className="md:col-span-1 space-y-6">
          <Card className="border-none shadow-sm shadow-indigo-100/50">
            <CardHeader className="pb-3 border-b bg-muted/20">
              <CardTitle className="text-xs font-bold uppercase flex items-center gap-2">
                <FileText className="h-4 w-4" /> Transfer Details
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-muted-foreground">Source Warehouse</Label>
                <Select value={fromWarehouseId} onValueChange={setFromWarehouseId}>
                  <SelectTrigger className="bg-white border-rose-100 focus:border-rose-300">
                    <SelectValue placeholder="Move from..." />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses?.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-center py-1">
                <div className="bg-muted/50 p-2 rounded-full">
                  <MoveHorizontal className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-muted-foreground">Destination Warehouse</Label>
                <Select value={toWarehouseId} onValueChange={setToWarehouseId}>
                  <SelectTrigger className="bg-white border-emerald-100 focus:border-emerald-300">
                    <SelectValue placeholder="Move to..." />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses?.map(w => (
                        <SelectItem key={w.id} value={w.id} disabled={w.id === fromWarehouseId}>
                            {w.name}
                        </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 pt-2">
                <Label htmlFor="notes" className="text-xs font-bold uppercase text-muted-foreground">Internal Notes</Label>
                <Textarea 
                  id="notes"
                  value={notes} 
                  onChange={e => setNotes(e.target.value)} 
                  placeholder="Reason for transfer, person in charge..."
                  className="bg-white resize-none h-24 text-sm"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Items */}
        <div className="md:col-span-2 space-y-6">
          <Card className="border-none shadow-sm">
            <CardHeader className="pb-3 border-b flex flex-row items-center justify-between bg-muted/20">
              <CardTitle className="text-xs font-bold uppercase flex items-center gap-2">
                <Package className="h-4 w-4" /> Items to Transfer
              </CardTitle>
              <Button size="sm" variant="outline" onClick={addItem} className="h-7 text-[10px] uppercase font-bold gap-1">
                <Plus className="h-3 w-3" /> Add Row
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                  <ArrowRightLeft className="h-10 w-10 opacity-10 mb-2" />
                  <p className="text-sm">Select products and quantities to move</p>
                </div>
              ) : (
                <Table>
                  <TableHeader className="bg-muted/5">
                    <TableRow className="border-none">
                      <TableHead className="text-[10px] uppercase font-bold">Product</TableHead>
                      <TableHead className="text-[10px] uppercase font-bold w-32 text-right">Transfer Qty</TableHead>
                      <TableHead className="text-[10px] uppercase font-bold w-24 text-right">Available</TableHead>
                      <TableHead className="w-10 text-center"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, i) => {
                      const avail = getAvailableStock(item.product_id);
                      const isOverStock = item.quantity > avail;
                      return (
                        <TableRow key={i} className="hover:bg-muted/5 transition-colors border-b last:border-none">
                          <TableCell className="py-3">
                            <Select value={item.product_id} onValueChange={v => updateItem(i, "product_id", v)}>
                              <SelectTrigger className="h-9 text-xs bg-white border-none shadow-none focus:ring-0">
                                <SelectValue placeholder="Select Product" />
                              </SelectTrigger>
                              <SelectContent>
                                {products?.map(p => (
                                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="py-3">
                            <Input 
                              type="number" 
                              min="1"
                              className={`h-9 text-right font-mono text-sm ${isOverStock && fromWarehouseId ? "bg-rose-50 border-rose-200 text-rose-600 font-bold" : "bg-white border-gray-100"}`} 
                              value={item.quantity} 
                              onChange={e => updateItem(i, "quantity", parseInt(e.target.value) || 0)} 
                            />
                          </TableCell>
                          <TableCell className="py-3 text-right">
                            <span className={`text-xs font-bold ${avail === 0 ? "text-muted-foreground" : "text-emerald-600"}`}>
                                {avail}
                            </span>
                          </TableCell>
                          <TableCell className="py-3 text-center">
                            <Button variant="ghost" size="icon" onClick={() => removeItem(i)} className="h-8 w-8 text-muted-foreground hover:text-rose-600">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Action Bar */}
          <div className="flex flex-col sm:flex-row gap-4 justify-end pt-4">
            <Button 
                variant="ghost" 
                onClick={() => navigate("/transfers")}
                disabled={saveMutation.isPending}
            >
                Cancel
            </Button>
            <Button 
                variant="outline" 
                className="gap-2"
                onClick={() => saveMutation.mutate("Draft")} 
                disabled={saveMutation.isPending}
            >
                <Save className="h-4 w-4" />
                Save as Draft
            </Button>
            <Button 
                className="gap-2 bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200"
                onClick={() => saveMutation.mutate("Done")} 
                disabled={saveMutation.isPending}
            >
                <ArrowRightLeft className="h-4 w-4" />
                Process Transfer
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

