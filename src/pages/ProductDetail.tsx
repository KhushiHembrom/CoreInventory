import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { StockBadge } from "@/components/shared/StockBadge";
import { format } from "date-fns";

export default function ProductDetail() {
  const { id } = useParams();

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", id],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("*").eq("id", id!).single();
      return data;
    },
  });

  const { data: stockData } = useQuery({
    queryKey: ["product-stock", id],
    queryFn: async () => {
      const { data } = await supabase.from("stock").select("*").eq("product_id", id!);
      return data || [];
    },
  });

  const { data: warehouses } = useQuery({
    queryKey: ["warehouses"],
    queryFn: async () => {
      const { data } = await supabase.from("warehouses").select("*");
      return data || [];
    },
  });

  const { data: ledger } = useQuery({
    queryKey: ["product-ledger", id],
    queryFn: async () => {
      const { data } = await supabase.from("stock_ledger").select("*").eq("product_id", id!).order("created_at", { ascending: false }).limit(20);
      return data || [];
    },
  });

  const { data: category } = useQuery({
    queryKey: ["category", product?.category_id],
    queryFn: async () => {
      if (!product?.category_id) return null;
      const { data } = await supabase.from("categories").select("*").eq("id", product.category_id).single();
      return data;
    },
    enabled: !!product?.category_id,
  });

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (!product) return <p className="text-muted-foreground">Product not found</p>;

  const totalQty = stockData?.reduce((s, st) => s + (st.quantity || 0), 0) || 0;
  const getWarehouseName = (wid: string) => warehouses?.find(w => w.id === wid)?.name || "Unknown";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{product.name}</h1>
        <p className="text-sm text-muted-foreground font-mono">{product.sku}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 space-y-2">
            <p className="text-xs text-muted-foreground">Category</p>
            <p className="text-sm font-medium">{category?.name || "-"}</p>
            <p className="text-xs text-muted-foreground mt-3">Unit</p>
            <p className="text-sm font-medium">{product.unit_of_measure}</p>
            <p className="text-xs text-muted-foreground mt-3">Reorder Level</p>
            <p className="text-sm font-medium font-mono">{product.reorder_level}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Stock</p>
            <p className="text-3xl font-semibold font-mono mt-1">{totalQty}</p>
            <div className="mt-2"><StockBadge quantity={totalQty} reorderLevel={product.reorder_level || 10} /></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Description</p>
            <p className="text-sm mt-1">{product.description || "No description"}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Stock by Warehouse</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Warehouse</TableHead>
                <TableHead className="text-xs">Quantity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stockData?.map(s => (
                <TableRow key={s.id}>
                  <TableCell className="text-sm">{getWarehouseName(s.warehouse_id)}</TableCell>
                  <TableCell className="text-sm font-mono">{s.quantity}</TableCell>
                </TableRow>
              ))}
              {!stockData?.length && <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground text-sm">No stock records</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Move History</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Date</TableHead>
                <TableHead className="text-xs">Operation</TableHead>
                <TableHead className="text-xs">Change</TableHead>
                <TableHead className="text-xs">Reference</TableHead>
                <TableHead className="text-xs">Warehouse</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ledger?.map(e => (
                <TableRow key={e.id}>
                  <TableCell className="text-xs">{e.created_at ? format(new Date(e.created_at), "MMM dd, HH:mm") : "-"}</TableCell>
                  <TableCell className="text-xs">{e.operation_type}</TableCell>
                  <TableCell className={`text-xs font-mono ${e.quantity_change > 0 ? "text-success" : "text-destructive"}`}>
                    {e.quantity_change > 0 ? "+" : ""}{e.quantity_change}
                  </TableCell>
                  <TableCell className="text-xs font-mono">{e.reference_no}</TableCell>
                  <TableCell className="text-xs">{getWarehouseName(e.warehouse_id)}</TableCell>
                </TableRow>
              ))}
              {!ledger?.length && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground text-sm">No history</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
