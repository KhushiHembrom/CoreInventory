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

export default function Deliveries() {
  const [statusFilter, setStatusFilter] = useState("all");
  const navigate = useNavigate();

  const { data: deliveries, isLoading } = useQuery({
    queryKey: ["deliveries"],
    queryFn: async () => {
      const { data } = await supabase.from("deliveries").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });
  const { data: warehouses } = useQuery({ queryKey: ["warehouses"], queryFn: async () => { const { data } = await supabase.from("warehouses").select("*"); return data || []; } });

  const filtered = deliveries?.filter(d => statusFilter === "all" || d.status === statusFilter) || [];
  const getWarehouseName = (id: string | null) => warehouses?.find(w => w.id === id)?.name || "-";

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <div>
      <PageHeader title="Deliveries" description="Manage outgoing deliveries" actionLabel="New Delivery" actionTo="/deliveries/new" />
      <div className="mb-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {["Draft", "Waiting", "Ready", "Done", "Canceled"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      {filtered.length === 0 ? (
        <EmptyState title="No deliveries" description="Create your first delivery" actionLabel="New Delivery" onAction={() => navigate("/deliveries/new")} />
      ) : (
        <div className="border rounded-lg bg-card overflow-hidden">
          <Table>
            <TableHeader><TableRow>
              <TableHead className="text-xs">Reference</TableHead>
              <TableHead className="text-xs">Customer</TableHead>
              <TableHead className="text-xs">Warehouse</TableHead>
              <TableHead className="text-xs">Status</TableHead>
              <TableHead className="text-xs">Date</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {filtered.map(d => (
                <TableRow key={d.id} className="hover:bg-row-hover cursor-pointer" onClick={() => navigate(`/deliveries/${d.id}`)}>
                  <TableCell className="text-sm font-mono font-medium">{d.reference_no}</TableCell>
                  <TableCell className="text-sm">{d.customer_name || "-"}</TableCell>
                  <TableCell className="text-sm">{getWarehouseName(d.warehouse_id)}</TableCell>
                  <TableCell><StatusBadge status={d.status || "Draft"} /></TableCell>
                  <TableCell className="text-sm">{d.created_at ? format(new Date(d.created_at), "MMM dd, yyyy") : "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
