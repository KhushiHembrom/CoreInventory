import { useState, useEffect } from "react";
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
import { Plus, Trash2, Save, Send, Package, Warehouse as WarehouseIcon, FileText, AlertCircle } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

interface LineItem { product_id: string; requested_qty: number; delivered_qty: number; }

export default function DeliveryNew() {
  const [customerName, setCustomerName] = useState("");
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

  const { data: stock } = useQuery({
    queryKey: ["stock", warehouseId],
    queryFn: async () => {
      if (!warehouseId) return [];
      const { data } = await supabase.from("stock").select("*").eq("warehouse_id", warehouseId);
      return data || [];
    },
    enabled: !!warehouseId
  });

  const addItem = () => setItems([...items, { product_id: "", requested_qty: 1, delivered_qty: 1 }]);
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: keyof LineItem, value: any) => {
    const updated = [...items];
    (updated[i] as any)[field] = value;
    if (field === "requested_qty" && updated[i].delivered_qty === items[i].requested_qty) {
        updated[i].delivered_qty = value;
    }
    setItems(updated);
  };

  const getAvailableStock = (productId: string) => {
    return stock?.find(s => s.product_id === productId)?.quantity || 0;
  };

  const saveMutation = useMutation({
    mutationFn: async (status: "Draft" | "Done") => {
      if (!warehouseId) throw new Error("Please select the origin warehouse");
      if (items.length === 0) throw new Error("Add at least one item to the delivery");
      if (items.some(i => !i.product_id)) throw new Error("All items must have a product selected");

      // Stock check for "Done"
      if (status === "Done") {
        for (const item of items) {
            const avail = getAvailableStock(item.product_id);
            if (item.delivered_qty > avail) {
                const prodName = products?.find(p => p.id === item.product_id)?.name;
                throw new Error(`Insufficient stock for ${prodName}. Available: ${avail}`);
            }
        }
      }

      // 1. Create Delivery
      const { data: delivery, error: deliveryError } = await supabase.from("deliveries").insert({
        customer_name: customerName,
        warehouse_id: warehouseId,
        status: status === "Done" ? "Ready" : "Draft",
        notes,
        created_by: user?.id,
      }).select().single();
      
      if (deliveryError) throw deliveryError;

      // 2. Create Items
      const deliveryItems = items.map(item => ({
        delivery_id: delivery.id,
        product_id: item.product_id,
        requested_qty: item.requested_qty,
        delivered_qty: item.delivered_qty,
      }));
      
      const { error: itemsError } = await supabase.from("delivery_items").insert(deliveryItems);
      if (itemsError) throw itemsError;

      // 3. If "Done", validate immediately
      if (status === "Done") {
        const { error: validateError } = await supabase.rpc("validate_delivery", {
          p_delivery_id: delivery.id,
          p_user_id: user?.id,
        });
        if (validateError) throw validateError;
      }

      return delivery;
    },
    onSuccess: (_, status) => {
      toast.success(status === "Done" ? "Delivery shipped and stock updated" : "Delivery saved as draft");
      qc.invalidateQueries({ queryKey: ["deliveries"] });
      qc.invalidateQueries({ queryKey: ["stock"] });
      navigate("/deliveries");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">New Shipment Delivery</h1>
          <p className="text-sm text-muted-foreground">Authorize outgoing stock for your customers</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Details */}
        <div className="md:col-span-1 space-y-6">
          <Card className="border-none shadow-sm shadow-rose-100/50">
            <CardHeader className="pb-3 border-b bg-muted/20">
              <CardTitle className="text-xs font-bold uppercase flex items-center gap-2 text-rose-600">
                <FileText className="h-4 w-4" /> Delivery Details
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="customer" className="text-xs font-bold uppercase text-muted-foreground">Customer Name</Label>
                <Input 
                  id="customer"
                  value={customerName} 
                  onChange={e => setCustomerName(e.target.value)} 
                  placeholder="e.g. Acme Corp"
                  className="bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-muted-foreground">Origin Warehouse</Label>
                <Select value={warehouseId} onValueChange={setWarehouseId}>
                  <SelectTrigger className="bg-white border-rose-100 focus:border-rose-300">
                    <SelectValue placeholder="Select warehouse" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses?.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                {!warehouseId && <p className="text-[10px] text-rose-500 font-medium mt-1">Select origin to check stock</p>}
              </div>
              <div className="space-y-2 pt-2">
                <Label htmlFor="notes" className="text-xs font-bold uppercase text-muted-foreground">Shipping Notes</Label>
                <Textarea 
                  id="notes"
                  value={notes} 
                  onChange={e => setNotes(e.target.value)} 
                  placeholder="Carrier info, tracking, address..."
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
                <Package className="h-4 w-4" /> Products to Ship
              </CardTitle>
              <Button size="sm" variant="outline" onClick={addItem} className="h-7 text-[10px] uppercase font-bold gap-1">
                <Plus className="h-3 w-3" /> Add Row
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                  <Package className="h-10 w-10 opacity-10 mb-2" />
                  <p className="text-sm">Add products to this shipment</p>
                </div>
              ) : (
                <Table>
                  <TableHeader className="bg-muted/5">
                    <TableRow className="border-none">
                      <TableHead className="text-[10px] uppercase font-bold">Product</TableHead>
                      <TableHead className="text-[10px] uppercase font-bold w-24 text-right">Requested</TableHead>
                      <TableHead className="text-[10px] uppercase font-bold w-24 text-right">To Ship</TableHead>
                      <TableHead className="text-[10px] uppercase font-bold w-20 text-right">Available</TableHead>
                      <TableHead className="w-10 text-center"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, i) => {
                      const avail = getAvailableStock(item.product_id);
                      const isOverStock = item.delivered_qty > avail;
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
                              className="h-9 text-right font-mono text-sm bg-white border-gray-100" 
                              value={item.requested_qty} 
                              onChange={e => updateItem(i, "requested_qty", Math.max(1, parseInt(e.target.value) || 0))} 
                            />
                          </TableCell>
                          <TableCell className="py-3">
                            <Input 
                              type="number" 
                              min="0"
                              className={`h-9 text-right font-mono text-sm ${isOverStock && warehouseId ? "bg-rose-50 border-rose-200 text-rose-600" : "bg-white border-gray-100"}`} 
                              value={item.delivered_qty} 
                              onChange={e => updateItem(i, "delivered_qty", Math.max(0, parseInt(e.target.value) || 0))} 
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
                onClick={() => navigate("/deliveries")}
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
                className="gap-2 bg-rose-600 hover:bg-rose-700 shadow-lg shadow-rose-200"
                onClick={() => saveMutation.mutate("Done")} 
                disabled={saveMutation.isPending}
            >
                <Send className="h-4 w-4" />
                Validate & Process Shipment
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}


