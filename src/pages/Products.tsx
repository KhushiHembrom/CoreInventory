import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Plus, Filter, Package, MoreHorizontal, ChevronLeft, ChevronRight, Eye, Edit } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";

const UNITS = ["kg", "pcs", "liters", "meters", "boxes"];

const StatusBadge = ({ quantity, reorderLevel }: { quantity: number; reorderLevel: number }) => {
  if (quantity === 0) return <Badge variant="destructive">Out of Stock</Badge>;
  if (quantity < reorderLevel) return <Badge className="bg-amber-500 hover:bg-amber-600 text-white border-none">Low Stock</Badge>;
  return <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white border-none">In Stock</Badge>;
};

export default function Products() {
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // New product form state
  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    categoryId: "",
    unit: "pcs",
    reorderLevel: "10",
    description: "",
  });

  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("*, categories(*)").order("name");
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
      const finalSku = formData.sku || `SKU-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
      const { error } = await supabase.from("products").insert({
        name: formData.name,
        sku: finalSku,
        category_id: formData.categoryId || null,
        unit_of_measure: formData.unit,
        reorder_level: parseInt(formData.reorderLevel) || 10,
        description: formData.description || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Product added successfully");
      qc.invalidateQueries({ queryKey: ["products"] });
      setOpen(false);
      setFormData({ name: "", sku: "", categoryId: "", unit: "pcs", reorderLevel: "10", description: "" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    return products?.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase());
      const matchCat = catFilter === "all" || p.category_id === catFilter;
      return matchSearch && matchCat;
    }) || [];
  }, [products, search, catFilter]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginatedProducts = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getTotalStock = (productId: string) => stock?.filter(s => s.product_id === productId).reduce((sum, s) => sum + (s.quantity || 0), 0) || 0;

  const handleSuggestSku = () => {
    const suggested = `SKU-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    setFormData(prev => ({ ...prev, sku: suggested }));
  };

  if (productsLoading) return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Products Catalog</h1>
          <p className="text-sm text-muted-foreground">Manage your inventory products and stock levels</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 shadow-sm">
              <Plus className="h-4 w-4" />
              Add Product
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Product</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); addMutation.mutate(); }} className="space-y-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Product Name*</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={e => setFormData(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Wireless Mouse"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="sku">SKU*</Label>
                <div className="flex gap-2">
                  <Input
                    id="sku"
                    value={formData.sku}
                    onChange={e => setFormData(f => ({ ...f, sku: e.target.value }))}
                    placeholder="Enter or suggest SKU"
                    className="font-mono"
                  />
                  <Button type="button" variant="outline" size="sm" onClick={handleSuggestSku}>Suggest</Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Category</Label>
                  <Select value={formData.categoryId} onValueChange={v => setFormData(f => ({ ...f, categoryId: v }))}>
                    <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
                    <SelectContent>
                      {categories?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Unit of Measure</Label>
                  <Select value={formData.unit} onValueChange={v => setFormData(f => ({ ...f, unit: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="reorder">Reorder Level</Label>
                <Input
                  id="reorder"
                  type="number"
                  value={formData.reorderLevel}
                  onChange={e => setFormData(f => ({ ...f, reorderLevel: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="desc">Description</Label>
                <Textarea
                  id="desc"
                  value={formData.description}
                  onChange={e => setFormData(f => ({ ...f, description: e.target.value }))}
                  placeholder="Optional product description..."
                />
              </div>
              <DialogFooter className="pt-4">
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={addMutation.isPending}>
                  {addMutation.isPending ? "Saving..." : "Create Product"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or SKU..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 bg-white"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={catFilter} onValueChange={setCatFilter}>
            <SelectTrigger className="w-[180px] bg-white text-xs">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead className="w-[300px] text-xs font-semibold uppercase tracking-wider">Product Name</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider">SKU</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider">Category</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider">UoM</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-right">Total Stock</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-right">Reorder Level</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider">Status</TableHead>
              <TableHead className="w-[80px] text-center text-xs font-semibold uppercase tracking-wider">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedProducts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-64 text-center">
                  <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                    <Package className="h-8 w-8 opacity-20" />
                    <p>No products found</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              paginatedProducts.map(p => {
                const totalQty = getTotalStock(p.id);
                const reorderLvl = p.reorder_level || 10;
                return (
                  <TableRow key={p.id} className="hover:bg-muted/20 transition-colors group">
                    <TableCell className="font-medium">
                      <div className="flex flex-col">
                        <span>{p.name}</span>
                        <span className="text-[10px] text-muted-foreground font-normal sm:hidden">{p.sku}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs hidden sm:table-cell">{p.sku}</TableCell>
                    <TableCell className="text-xs">
                      <Badge variant="outline" className="font-normal text-muted-foreground border-gray-100">
                        {p.categories?.name || "-"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{p.unit_of_measure}</TableCell>
                    <TableCell className="text-right font-bold text-sm">{totalQty}</TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">{reorderLvl}</TableCell>
                    <TableCell>
                      <StatusBadge quantity={totalQty} reorderLevel={reorderLvl} />
                    </TableCell>
                    <TableCell className="text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => navigate(`/products/${p.id}`)} className="gap-2">
                            <Eye size={14} /> View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2">
                            <Edit size={14} /> Edit Product
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-4 bg-muted/10 border-t">
          <p className="text-xs text-muted-foreground">
            Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-medium">{Math.min(currentPage * itemsPerPage, filtered.length)}</span> of <span className="font-medium">{filtered.length}</span> products
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => p - 1)}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages || totalPages === 0}
              onClick={() => setCurrentPage(p => p + 1)}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

