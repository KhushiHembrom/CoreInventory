import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Edit2, Package, History, MapPin, Info, AlertCircle } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const StatusBadge = ({ quantity, reorderLevel }: { quantity: number; reorderLevel: number }) => {
  if (quantity === 0) return <Badge variant="destructive">Out of Stock</Badge>;
  if (quantity < reorderLevel) return <Badge className="bg-amber-500 text-white hover:bg-amber-600 border-none">Low Stock</Badge>;
  return <Badge className="bg-emerald-500 text-white hover:bg-emerald-600 border-none">In Stock</Badge>;
};

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [isEditingReorder, setIsEditingReorder] = useState(false);
  const [newReorderLevel, setNewReorderLevel] = useState("");

  const { data: product, isLoading: productLoading } = useQuery({
    queryKey: ["product", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, categories(*)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      setNewReorderLevel(data.reorder_level?.toString() || "0");
      return data;
    },
  });

  const { data: stockData } = useQuery({
    queryKey: ["product-stock", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("stock")
        .select("*, warehouses(*)")
        .eq("product_id", id!);
      return data || [];
    },
  });

  const { data: ledger } = useQuery({
    queryKey: ["product-ledger", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("stock_ledger")
        .select("*, warehouses(*)")
        .eq("product_id", id!)
        .order("created_at", { ascending: false })
        .limit(20);
      return data || [];
    },
  });

  const updateReorderMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("products")
        .update({ reorder_level: parseInt(newReorderLevel) })
        .eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Reorder level updated");
      qc.invalidateQueries({ queryKey: ["product", id] });
      setIsEditingReorder(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (productLoading) return (
    <div className="space-y-6">
      <Skeleton className="h-20 w-full rounded-xl" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
      <Skeleton className="h-80 rounded-xl" />
    </div>
  );

  if (!product) return (
    <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
      <AlertCircle className="h-12 w-12 text-muted-foreground opacity-20" />
      <p className="text-muted-foreground">Product not found</p>
      <Button variant="outline" onClick={() => navigate("/products")}>Back to Products</Button>
    </div>
  );

  const totalQty = stockData?.reduce((s, st) => s + (st.quantity || 0), 0) || 0;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/products")}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">{product.name}</h1>
              <StatusBadge quantity={totalQty} reorderLevel={product.reorder_level || 0} />
            </div>
            <p className="text-sm text-muted-foreground font-mono">SKU: {product.sku}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Edit2 className="h-4 w-4" />
            Edit Product
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-none shadow-sm bg-indigo-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-indigo-600 uppercase tracking-wider flex items-center gap-2">
              <Package className="h-4 w-4" /> Total Stock
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight">{totalQty}</div>
            <p className="text-xs text-muted-foreground mt-1">Units available across all locations</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-emerald-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-emerald-600 uppercase tracking-wider flex items-center gap-2">
              <Info className="h-4 w-4" /> Product Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Category:</span>
              <Badge variant="secondary" className="text-[10px] uppercase">{product.categories?.name || "Uncategorized"}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Unit:</span>
              <span className="text-sm font-medium">{product.unit_of_measure}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-amber-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-amber-600 uppercase tracking-wider flex items-center gap-2">
              <AlertCircle className="h-4 w-4" /> Reorder Level
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isEditingReorder ? (
              <div className="flex gap-2 mt-1">
                <Input
                  type="number"
                  value={newReorderLevel}
                  onChange={e => setNewReorderLevel(e.target.value)}
                  className="h-9 w-24 bg-white"
                />
                <Button size="sm" onClick={() => updateReorderMutation.mutate()}>Save</Button>
                <Button size="sm" variant="ghost" onClick={() => setIsEditingReorder(false)}>X</Button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold tracking-tight">{product.reorder_level}</div>
                <Button variant="ghost" size="icon" onClick={() => setIsEditingReorder(true)}>
                  <Edit2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Points at which replenishment is triggered</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stock by Location */}
        <Card className="border-none shadow-sm overflow-hidden">
          <CardHeader className="bg-muted/30 border-b">
            <CardTitle className="text-sm font-bold flex items-center gap-2 uppercase tracking-tight">
              <MapPin className="h-4 w-4" /> Stock by Location
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-muted/10">
                <TableRow>
                  <TableHead className="text-[10px] uppercase font-bold">Warehouse</TableHead>
                  <TableHead className="text-[10px] uppercase font-bold text-right">Quantity</TableHead>
                  <TableHead className="text-[10px] uppercase font-bold text-right">Last Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stockData?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="h-32 text-center text-muted-foreground text-xs italic">
                      No stock currently recorded in any warehouse
                    </TableCell>
                  </TableRow>
                ) : (
                  stockData?.map(s => (
                    <TableRow key={s.id} className="hover:bg-muted/5 transition-colors">
                      <TableCell className="text-sm font-medium">{s.warehouses?.name}</TableCell>
                      <TableCell className="text-sm font-bold text-right">{s.quantity}</TableCell>
                      <TableCell className="text-xs text-muted-foreground text-right">
                        {s.updated_at ? format(new Date(s.updated_at), "MMM dd, yyyy") : "-"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Move History */}
        <Card className="border-none shadow-sm overflow-hidden">
          <CardHeader className="bg-muted/30 border-b">
            <CardTitle className="text-sm font-bold flex items-center gap-2 uppercase tracking-tight">
              <History className="h-4 w-4" /> Move History
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-muted/10">
                <TableRow>
                  <TableHead className="text-[10px] uppercase font-bold">Date</TableHead>
                  <TableHead className="text-[10px] uppercase font-bold">Operation</TableHead>
                  <TableHead className="text-[10px] uppercase font-bold text-right">Change</TableHead>
                  <TableHead className="text-[10px] uppercase font-bold">Reference</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ledger?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-32 text-center text-muted-foreground text-xs italic">
                      No transaction history found
                    </TableCell>
                  </TableRow>
                ) : (
                  ledger?.map(e => (
                    <TableRow key={e.id} className="hover:bg-muted/5 transition-colors">
                      <TableCell className="text-[11px] text-muted-foreground whitespace-nowrap">
                        {e.created_at ? format(new Date(e.created_at), "MMM dd, HH:mm") : "-"}
                      </TableCell>
                      <TableCell className="text-xs capitalize font-medium">{e.operation_type.replace("_", " ")}</TableCell>
                      <TableCell className={`text-sm font-bold text-right ${e.quantity_change > 0 ? "text-emerald-600" : "text-rose-600"}`}>
                        {e.quantity_change > 0 ? "+" : ""}{e.quantity_change}
                      </TableCell>
                      <TableCell className="text-[11px] font-mono text-muted-foreground">{e.reference_no}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Description Card */}
      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="text-sm font-bold uppercase tracking-tight">Product Description</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
            {product.description || "No description provided for this product."}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

