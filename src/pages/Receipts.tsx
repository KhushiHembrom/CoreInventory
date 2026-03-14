import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Receipts() {
  const [statusFilter, setStatusFilter] = useState("all");
  const navigate = useNavigate();

  const { data: receipts, isLoading } = useQuery({
    queryKey: ["receipts"],
    queryFn: async () => {
      const { data } = await supabase.from("receipts").select("*").order("created_at", { ascending: false });
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

  const filtered = receipts?.filter(r => statusFilter === "all" || r.status === statusFilter) || [];
  const getWarehouseName = (id: string | null) => warehouses?.find(w => w.id === id)?.name || "-";

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <div>
      <PageHeader title="Receipts" description="Manage incoming stock receipts" actionLabel="New Receipt" actionTo="/receipts/new" />
      <div className="mb-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="All Statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {["Draft", "Waiting", "Ready", "Done", "Canceled"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      {filtered.length === 0 ? (
        <EmptyState title="No receipts" description="Create your first receipt to start receiving stock" actionLabel="New Receipt" onAction={() => navigate("/receipts/new")} />
      ) : (
        <div className="border rounded-lg bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Reference</TableHead>
                <TableHead className="text-xs">Supplier</TableHead>
                <TableHead className="text-xs">Warehouse</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(r => (
                <TableRow key={r.id} className="hover:bg-row-hover cursor-pointer" onClick={() => navigate(`/receipts/${r.id}`)}>
                  <TableCell className="text-sm font-mono font-medium">{r.reference_no}</TableCell>
                  <TableCell className="text-sm">{r.supplier_name || "-"}</TableCell>
                  <TableCell className="text-sm">{getWarehouseName(r.warehouse_id)}</TableCell>
                  <TableCell><StatusBadge status={r.status || "Draft"} /></TableCell>
                  <TableCell className="text-sm">{r.created_at ? format(new Date(r.created_at), "MMM dd, yyyy") : "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
