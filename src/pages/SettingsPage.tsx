import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export default function SettingsPage() {
  const qc = useQueryClient();

  // Warehouses
  const { data: warehouses } = useQuery({ queryKey: ["warehouses"], queryFn: async () => { const { data } = await supabase.from("warehouses").select("*").order("name"); return data || []; } });
  const [wName, setWName] = useState(""); const [wLocation, setWLocation] = useState(""); const [wOpen, setWOpen] = useState(false);
  const addWarehouse = useMutation({
    mutationFn: async () => { const { error } = await supabase.from("warehouses").insert({ name: wName, location: wLocation || null }); if (error) throw error; },
    onSuccess: () => { toast.success("Warehouse added"); qc.invalidateQueries({ queryKey: ["warehouses"] }); setWOpen(false); setWName(""); setWLocation(""); },
    onError: (e: any) => toast.error(e.message),
  });
  const deleteWarehouse = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("warehouses").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Warehouse deleted"); qc.invalidateQueries({ queryKey: ["warehouses"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  // Categories
  const { data: categories } = useQuery({ queryKey: ["categories"], queryFn: async () => { const { data } = await supabase.from("categories").select("*").order("name"); return data || []; } });
  const [cName, setCName] = useState(""); const [cDesc, setCDesc] = useState(""); const [cOpen, setCOpen] = useState(false);
  const addCategory = useMutation({
    mutationFn: async () => { const { error } = await supabase.from("categories").insert({ name: cName, description: cDesc || null }); if (error) throw error; },
    onSuccess: () => { toast.success("Category added"); qc.invalidateQueries({ queryKey: ["categories"] }); setCOpen(false); setCName(""); setCDesc(""); },
    onError: (e: any) => toast.error(e.message),
  });
  const deleteCategory = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("categories").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Category deleted"); qc.invalidateQueries({ queryKey: ["categories"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Settings</h1>
      <Tabs defaultValue="warehouses">
        <TabsList><TabsTrigger value="warehouses">Warehouses</TabsTrigger><TabsTrigger value="categories">Categories</TabsTrigger></TabsList>
        <TabsContent value="warehouses" className="mt-4">
          <div className="flex justify-end mb-4">
            <Sheet open={wOpen} onOpenChange={setWOpen}><SheetTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1"/>Add Warehouse</Button></SheetTrigger>
              <SheetContent><SheetHeader><SheetTitle>New Warehouse</SheetTitle></SheetHeader>
                <form onSubmit={e => { e.preventDefault(); addWarehouse.mutate(); }} className="space-y-4 mt-4">
                  <div><Label>Name</Label><Input value={wName} onChange={e => setWName(e.target.value)} required /></div>
                  <div><Label>Location</Label><Input value={wLocation} onChange={e => setWLocation(e.target.value)} /></div>
                  <Button type="submit" className="w-full">Save</Button>
                </form></SheetContent></Sheet>
          </div>
          <div className="border rounded-lg bg-card overflow-hidden">
            <Table><TableHeader><TableRow><TableHead className="text-xs">Name</TableHead><TableHead className="text-xs">Location</TableHead><TableHead className="text-xs w-16"></TableHead></TableRow></TableHeader>
              <TableBody>{warehouses?.map(w => (
                <TableRow key={w.id}><TableCell className="text-sm font-medium">{w.name}</TableCell><TableCell className="text-sm">{w.location || "-"}</TableCell>
                  <TableCell>
                    <AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="icon"><Trash2 className="h-3 w-3 text-destructive" /></Button></AlertDialogTrigger>
                      <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete warehouse?</AlertDialogTitle><AlertDialogDescription>This will remove the warehouse permanently.</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteWarehouse.mutate(w.id)}>Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
                  </TableCell></TableRow>
              ))}</TableBody></Table>
          </div>
        </TabsContent>
        <TabsContent value="categories" className="mt-4">
          <div className="flex justify-end mb-4">
            <Sheet open={cOpen} onOpenChange={setCOpen}><SheetTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1"/>Add Category</Button></SheetTrigger>
              <SheetContent><SheetHeader><SheetTitle>New Category</SheetTitle></SheetHeader>
                <form onSubmit={e => { e.preventDefault(); addCategory.mutate(); }} className="space-y-4 mt-4">
                  <div><Label>Name</Label><Input value={cName} onChange={e => setCName(e.target.value)} required /></div>
                  <div><Label>Description</Label><Input value={cDesc} onChange={e => setCDesc(e.target.value)} /></div>
                  <Button type="submit" className="w-full">Save</Button>
                </form></SheetContent></Sheet>
          </div>
          <div className="border rounded-lg bg-card overflow-hidden">
            <Table><TableHeader><TableRow><TableHead className="text-xs">Name</TableHead><TableHead className="text-xs">Description</TableHead><TableHead className="text-xs w-16"></TableHead></TableRow></TableHeader>
              <TableBody>{categories?.map(c => (
                <TableRow key={c.id}><TableCell className="text-sm font-medium">{c.name}</TableCell><TableCell className="text-sm">{c.description || "-"}</TableCell>
                  <TableCell>
                    <AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="icon"><Trash2 className="h-3 w-3 text-destructive" /></Button></AlertDialogTrigger>
                      <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete category?</AlertDialogTitle><AlertDialogDescription>This will remove the category.</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteCategory.mutate(c.id)}>Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
                  </TableCell></TableRow>
              ))}</TableBody></Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
