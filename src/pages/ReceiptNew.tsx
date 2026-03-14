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
import { Plus, Trash2, Save, CheckCircle2, Package, Warehouse as WarehouseIcon, FileText, User } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

interface LineItem { product_id: string; expected_qty: number; received_qty: number; }

export default function ReceiptNew() {
  const [supplierName, setSupplierName] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
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

  const addItem = () => setItems([...items, { product_id: "", expected_qty: 1, received_qty: 1 }]);
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: keyof LineItem, value: any) => {
    const updated = [...items];
    (updated[i] as any)[field] = value;
    // Auto-sync received to expected if expected changes and they were equal
    if (field === "expected_qty" && updated[i].received_qty === items[i].expected_qty) {
        updated[i].received_qty = value;
    }
    setItems(updated);
  };

  const saveMutation = useMutation({
    mutationFn: async (status: "Draft" | "Done") => {
      if (!warehouseId) throw new Error("Please select a destination warehouse");
      if (items.length === 0) throw new Error("Add at least one item to the receipt");
      if (items.some(i => !i.product_id)) throw new Error("All items must have a product selected");

      // 1. Create Receipt
      const { data: receipt, error: receiptError } = await supabase.from("receipts").insert({
        supplier_name: supplierName,
        warehouse_id: warehouseId,
        status: status === "Done" ? "Ready" : "Draft", // Start as Ready then validate if Done
        notes,
        created_by: user?.id,
      }).select().single();
      
      if (receiptError) throw receiptError;

      // 2. Create Items
      const receiptItems = items.map(item => ({
        receipt_id: receipt.id,
        product_id: item.product_id,
        expected_qty: item.expected_qty,
        received_qty: item.received_qty,
      }));
      
      const { error: itemsError } = await supabase.from("receipt_items").insert(receiptItems);
      if (itemsError) throw itemsError;

      // 3. If "Done", validate immediately
      if (status === "Done") {
        const { error: validateError } = await supabase.rpc("validate_receipt", {
          p_receipt_id: receipt.id,
          p_user_id: user?.id,
        });
        if (validateError) throw validateError;
      }

      return receipt;
    },
    onSuccess: (_, status) => {
      toast.success(status === "Done" ? "Receipt validated and stock updated" : "Receipt saved as draft");
      qc.invalidateQueries({ queryKey: ["receipts"] });
      qc.invalidateQueries({ queryKey: ["stock"] });
      navigate("/receipts");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">New Purchase Receipt</h1>
          <p className="text-sm text-muted-foreground">Register incoming stock from your suppliers</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Details */}
        <div className="md:col-span-1 space-y-6">
          <Card className="border-none shadow-sm shadow-indigo-100/50">
            <CardHeader className="pb-3 border-b bg-muted/20">
              <CardTitle className="text-xs font-bold uppercase flex items-center gap-2">
                <FileText className="h-4 w-4" /> Receipt Details
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="supplier" className="text-xs font-bold uppercase text-muted-foreground">Supplier Name</Label>
                <Input 
                  id="supplier"
                  value={supplierName} 
                  onChange={e => setSupplierName(e.target.value)} 
                  placeholder="e.g. Globex Corp"
                  className="bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-muted-foreground">Destination Warehouse</Label>
                <Select value={warehouseId} onValueChange={setWarehouseId}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Select warehouse" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses?.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 pt-2">
                <Label htmlFor="notes" className="text-xs font-bold uppercase text-muted-foreground">Notes / Internal Info</Label>
                <Textarea 
                  id="notes"
                  value={notes} 
                  onChange={e => setNotes(e.target.value)} 
                  placeholder="Reference numbers, delivery notes..."
                  className="bg-white resize-none h-24"
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
                <Package className="h-4 w-4" /> Received Items
              </CardTitle>
              <Button size="sm" variant="outline" onClick={addItem} className="h-7 text-[10px] uppercase font-bold gap-1">
                <Plus className="h-3 w-3" /> Add Row
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                  <Package className="h-10 w-10 opacity-10 mb-2" />
                  <p className="text-sm">Click "Add Row" to start adding products</p>
                </div>
              ) : (
                <Table>
                  <TableHeader className="bg-muted/5">
                    <TableRow className="border-none">
                      <TableHead className="text-[10px] uppercase font-bold">Product</TableHead>
                      <TableHead className="text-[10px] uppercase font-bold w-32 text-right">Expected</TableHead>
                      <TableHead className="text-[10px] uppercase font-bold w-32 text-right">Received</TableHead>
                      <TableHead className="w-12 text-center"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, i) => (
                      <TableRow key={i} className="hover:bg-muted/5 transition-colors border-b last:border-none">
                        <TableCell className="py-3">
                          <Select value={item.product_id} onValueChange={v => updateItem(i, "product_id", v)}>
                            <SelectTrigger className="h-9 text-xs bg-white border-none shadow-none focus:ring-0">
                              <SelectValue placeholder="Select Product" />
                            </SelectTrigger>
                            <SelectContent>
                              {products?.map(p => (
                                <SelectItem key={p.id} value={p.id}>
                                  <div className="flex flex-col py-0.5">
                                    <span className="font-medium">{p.name}</span>
                                    <span className="text-[10px] text-muted-foreground font-mono">{p.sku}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="py-3">
                          <Input 
                            type="number" 
                            min="1"
                            className="h-9 text-right font-mono text-sm bg-white border-gray-100" 
                            value={item.expected_qty} 
                            onChange={e => updateItem(i, "expected_qty", Math.max(1, parseInt(e.target.value) || 0))} 
                          />
                        </TableCell>
                        <TableCell className="py-3">
                          <Input 
                            type="number" 
                            min="0"
                            className="h-9 text-right font-mono text-sm bg-indigo-50/50 border-indigo-100/50 focus:bg-white" 
                            value={item.received_qty} 
                            onChange={e => updateItem(i, "received_qty", Math.max(0, parseInt(e.target.value) || 0))} 
                          />
                        </TableCell>
                        <TableCell className="py-3 text-center">
                          <Button variant="ghost" size="icon" onClick={() => removeItem(i)} className="h-8 w-8 text-rose-400 hover:text-rose-600 hover:bg-rose-50">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Action Bar */}
          <div className="flex flex-col sm:flex-row gap-4 justify-end pt-4">
            <Button 
                variant="ghost" 
                onClick={() => navigate("/receipts")}
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
                <CheckCircle2 className="h-4 w-4" />
                Validate & Receive Stock
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

