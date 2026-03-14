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
import { Plus, Trash2, Save, Scale, Package, Warehouse as WarehouseIcon, FileText, AlertTriangle } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

interface LineItem { product_id: string; recorded_qty: number; actual_qty: number; }

export default function AdjustmentNew() {
  const [warehouseId, setWarehouseId] = useState("");
  const [reason, setReason] = useState("");
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

  const { data: stockLevels } = useQuery({
    queryKey: ["stock-levels", warehouseId],
    queryFn: async () => {
      if (!warehouseId) return [];
      const { data } = await supabase.from("stock").select("product_id, quantity").eq("warehouse_id", warehouseId);
      return data || [];
    },
    enabled: !!warehouseId
  });

  const addItem = () => setItems([...items, { product_id: "", recorded_qty: 0, actual_qty: 0 }]);
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: keyof LineItem, value: any) => {
    const updated = [...items];
    (updated[i] as any)[field] = value;
    
    if (field === "product_id" && warehouseId) {
        const found = stockLevels?.find(s => s.product_id === value);
        updated[i].recorded_qty = found?.quantity || 0;
        updated[i].actual_qty = found?.quantity || 0; // Default to recorded
    }
    
    setItems(updated);
  };

  const saveMutation = useMutation({
    mutationFn: async (status: "Draft" | "Done") => {
      if (!warehouseId) throw new Error("Please select the warehouse to adjust");
      if (items.length === 0) throw new Error("Add at least one item to adjust");
      if (items.some(i => !i.product_id)) throw new Error("All items must have a product selected");

      // 1. Create Adjustment
      const { data: adj, error: adjError } = await supabase.from("stock_adjustments").insert({
        warehouse_id: warehouseId,
        status: "Draft", // Always start as Draft
        reason,
        created_by: user?.id,
      }).select().single();
      
      if (adjError) throw adjError;

      // 2. Create Items
      const { error: itemsError } = await supabase.from("adjustment_items").insert(
        items.map(item => ({
          adjustment_id: adj.id,
          product_id: item.product_id,
          recorded_qty: item.recorded_qty,
          actual_qty: item.actual_qty,
        }))
      );
      if (itemsError) throw itemsError;

      // 3. If "Done", validate immediately
      if (status === "Done") {
        const { error: validateError } = await supabase.rpc("validate_adjustment", {
          p_adjustment_id: adj.id,
          p_user_id: user?.id,
        });
        if (validateError) throw validateError;
      }

      return adj;
    },
    onSuccess: (_, status) => {
      toast.success(status === "Done" ? "Stock adjusted successfully" : "Adjustment saved as draft");
      qc.invalidateQueries({ queryKey: ["adjustments"] });
      qc.invalidateQueries({ queryKey: ["stock"] });
      navigate("/adjustments");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Manual Stock Adjustment</h1>
          <p className="text-sm text-muted-foreground">Correct stock counts for breakage, loss, or manual audits</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Details */}
        <div className="md:col-span-1 space-y-6">
          <Card className="border-none shadow-sm shadow-slate-100/50">
            <CardHeader className="pb-3 border-b bg-muted/20">
              <CardTitle className="text-xs font-bold uppercase flex items-center gap-2">
                <FileText className="h-4 w-4" /> Adjustment Header
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-muted-foreground">Warehouse to Audit</Label>
                <Select value={warehouseId} onValueChange={setWarehouseId}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Select warehouse..." />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses?.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 pt-2">
                <Label htmlFor="reason" className="text-xs font-bold uppercase text-muted-foreground">Adjustment Reason</Label>
                <Textarea 
                  id="reason"
                  value={reason} 
                  onChange={e => setReason(e.target.value)} 
                  placeholder="e.g. Annual physical count, breakage during transport..."
                  className="bg-white resize-none h-32 text-sm"
                />
              </div>

              <div className="bg-amber-50 border border-amber-100 p-3 rounded-lg flex gap-3 text-amber-700">
                <AlertTriangle className="h-5 w-5 shrink-0" />
                <p className="text-[10px] leading-relaxed">
                    <strong>Note:</strong> Validating an adjustment will permanently overwrite the current stock values for the selected products in this warehouse.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Items */}
        <div className="md:col-span-2 space-y-6">
          <Card className="border-none shadow-sm">
            <CardHeader className="pb-3 border-b flex flex-row items-center justify-between bg-muted/20">
              <CardTitle className="text-xs font-bold uppercase flex items-center gap-2">
                <Package className="h-4 w-4" /> Stock Discrepancies
              </CardTitle>
              <Button size="sm" variant="outline" onClick={addItem} className="h-7 text-[10px] uppercase font-bold gap-1">
                <Plus className="h-3 w-3" /> Add Row
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                  <Scale className="h-10 w-10 opacity-10 mb-2" />
                  <p className="text-sm">Select products to perform count corrections</p>
                </div>
              ) : (
                <Table>
                  <TableHeader className="bg-muted/5">
                    <TableRow className="border-none">
                      <TableHead className="text-[10px] uppercase font-bold">Product</TableHead>
                      <TableHead className="text-[10px] uppercase font-bold w-24 text-right">System Qty</TableHead>
                      <TableHead className="text-[10px] uppercase font-bold w-24 text-right">Actual Qty</TableHead>
                      <TableHead className="text-[10px] uppercase font-bold w-20 text-right">Diff</TableHead>
                      <TableHead className="w-10 text-center"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, i) => {
                      const diff = item.actual_qty - item.recorded_qty;
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
                          <TableCell className="py-3 text-right">
                             <div className="h-9 flex items-center justify-end px-3 text-sm font-mono text-muted-foreground">
                                {item.recorded_qty}
                             </div>
                          </TableCell>
                          <TableCell className="py-3">
                            <Input 
                              type="number" 
                              className="h-9 text-right font-mono text-sm bg-white border-gray-100" 
                              value={item.actual_qty} 
                              onChange={e => updateItem(i, "actual_qty", parseInt(e.target.value) || 0)} 
                            />
                          </TableCell>
                          <TableCell className="py-3 text-right">
                            <span className={`text-xs font-bold font-mono ${diff > 0 ? "text-emerald-600" : diff < 0 ? "text-rose-600" : "text-muted-foreground"}`}>
                                {diff > 0 ? "+" : ""}{diff}
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
                onClick={() => navigate("/adjustments")}
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
                className="gap-2 bg-slate-700 hover:bg-slate-800 shadow-lg shadow-slate-200"
                onClick={() => saveMutation.mutate("Done")} 
                disabled={saveMutation.isPending}
            >
                <Scale className="h-4 w-4" />
                Finalize Adjustment
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

