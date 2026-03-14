import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Transfers() {
  const [statusFilter, setStatusFilter] = useState("all");
  const navigate = useNavigate();

  const { data: transfers, isLoading } = useQuery({
    queryKey: ["transfers"],
    queryFn: async () => { const { data } = await supabase.from("internal_transfers").select("*").order("created_at", { ascending: false }); return data || []; },
  });
  const { data: warehouses } = useQuery({ queryKey: ["warehouses"], queryFn: async () => { const { data } = await supabase.from("warehouses").select("*"); return data || []; } });

  const filtered = transfers?.filter(t => statusFilter === "all" || t.status === statusFilter) || [];
  const getWName = (id: string | null) => warehouses?.find(w => w.id === id)?.name || "-";

  if (isLoading) return <Skeleton className="h-64" />;

  return (
    <div>
      <PageHeader title="Internal Transfers" description="Move stock between warehouses" actionLabel="New Transfer" actionTo="/transfers/new" />
      <div className="mb-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Statuses</SelectItem>{["Draft","Waiting","Ready","Done","Canceled"].map(s=><SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
      </div>
      {filtered.length === 0 ? <EmptyState title="No transfers" description="Create a transfer to move stock" actionLabel="New Transfer" onAction={() => navigate("/transfers/new")} /> : (
        <div className="border rounded-lg bg-card overflow-hidden">
          <Table><TableHeader><TableRow>
            <TableHead className="text-xs">Reference</TableHead><TableHead className="text-xs">From</TableHead><TableHead className="text-xs">To</TableHead><TableHead className="text-xs">Status</TableHead><TableHead className="text-xs">Date</TableHead>
          </TableRow></TableHeader>
          <TableBody>{filtered.map(t => (
            <TableRow key={t.id} className="hover:bg-row-hover cursor-pointer" onClick={() => navigate(`/transfers/${t.id}`)}>
              <TableCell className="text-sm font-mono font-medium">{t.reference_no}</TableCell>
              <TableCell className="text-sm">{getWName(t.from_warehouse_id)}</TableCell>
              <TableCell className="text-sm">{getWName(t.to_warehouse_id)}</TableCell>
              <TableCell><StatusBadge status={t.status || "Draft"} /></TableCell>
              <TableCell className="text-sm">{t.created_at ? format(new Date(t.created_at), "MMM dd, yyyy") : "-"}</TableCell>
            </TableRow>
          ))}</TableBody></Table>
        </div>
      )}
    </div>
  );
}
