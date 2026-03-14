import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/shared/PageHeader";
import { StockBadge } from "@/components/shared/StockBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Products() {
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [unit, setUnit] = useState("pcs");
  const [reorder, setReorder] = useState("10");
  const [description, setDescription] = useState("");
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data: products, isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("*").order("name");
      return data || [];
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("*").order("name");
      return data || [];
    },
  });

  const { data: stock } = useQuery({
    queryKey: ["stock"],
    queryFn: async () => {
      const { data } = await supabase.from("stock").select("*");
      return data || [];
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("products").insert({
        name, sku, category_id: categoryId || null, unit_of_measure: unit,
        reorder_level: parseInt(reorder) || 10, description: description || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Product added");
      qc.invalidateQueries({ queryKey: ["products"] });
      setOpen(false);
      setName(""); setSku(""); setCategoryId(""); setUnit("pcs"); setReorder("10"); setDescription("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = products?.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase());
    const matchCat = catFilter === "all" || p.category_id === catFilter;
    return matchSearch && matchCat;
  }) || [];

  const getTotalStock = (productId: string) => stock?.filter(s => s.product_id === productId).reduce((sum, s) => sum + (s.quantity || 0), 0) || 0;
  const getCategoryName = (id: string | null) => categories?.find(c => c.id === id)?.name || "-";

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-64 w-full" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Products</h1>
          <p className="text-sm text-muted-foreground mt-1">{products?.length || 0} products total</p>
        </div>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button size="sm">Add Product</Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader><SheetTitle>New Product</SheetTitle></SheetHeader>
            <form onSubmit={(e) => { e.preventDefault(); addMutation.mutate(); }} className="space-y-4 mt-4">
              <div><Label>Name</Label><Input value={name} onChange={e => setName(e.target.value)} required /></div>
              <div><Label>SKU</Label><Input value={sku} onChange={e => setSku(e.target.value)} required className="font-mono" /></div>
              <div><Label>Category</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>{categories?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Unit</Label><Input value={unit} onChange={e => setUnit(e.target.value)} /></div>
              <div><Label>Reorder Level</Label><Input type="number" value={reorder} onChange={e => setReorder(e.target.value)} /></div>
              <div><Label>Description</Label><Input value={description} onChange={e => setDescription(e.target.value)} /></div>
              <Button type="submit" className="w-full" disabled={addMutation.isPending}>Save Product</Button>
            </form>
          </SheetContent>
        </Sheet>
      </div>

      <div className="flex gap-3 mb-4">
        <Input placeholder="Search by name or SKU..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-xs" />
        <Select value={catFilter} onValueChange={setCatFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Categories" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No products found" description="Add your first product to get started" actionLabel="Add Product" onAction={() => setOpen(true)} />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Name</TableHead>
                <TableHead className="text-xs">SKU</TableHead>
                <TableHead className="text-xs">Category</TableHead>
                <TableHead className="text-xs">Unit</TableHead>
                <TableHead className="text-xs">Total Stock</TableHead>
                <TableHead className="text-xs">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(p => {
                const totalQty = getTotalStock(p.id);
                return (
                  <TableRow key={p.id} className="hover:bg-row-hover cursor-pointer" onClick={() => navigate(`/products/${p.id}`)}>
                    <TableCell className="text-sm font-medium">{p.name}</TableCell>
                    <TableCell className="text-sm font-mono">{p.sku}</TableCell>
                    <TableCell className="text-sm">{getCategoryName(p.category_id)}</TableCell>
                    <TableCell className="text-sm">{p.unit_of_measure}</TableCell>
                    <TableCell className="text-sm font-mono">{totalQty}</TableCell>
                    <TableCell><StockBadge quantity={totalQty} reorderLevel={p.reorder_level || 10} /></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="border rounded-lg bg-card overflow-hidden">{children}</div>;
}
