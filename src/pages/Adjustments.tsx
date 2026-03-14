import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

export default function Adjustments() {
  const navigate = useNavigate();
  const { data: adjustments, isLoading } = useQuery({
    queryKey: ["adjustments"],
    queryFn: async () => { const { data } = await supabase.from("stock_adjustments").select("*").order("created_at", { ascending: false }); return data || []; },
  });
  const { data: warehouses } = useQuery({ queryKey: ["warehouses"], queryFn: async () => { const { data } = await supabase.from("warehouses").select("*"); return data || []; } });

  const getWName = (id: string | null) => warehouses?.find(w => w.id === id)?.name || "-";
  if (isLoading) return <Skeleton className="h-64" />;

  return (
    <div>
      <PageHeader title="Stock Adjustments" description="Correct stock discrepancies" actionLabel="New Adjustment" actionTo="/adjustments/new" />
      {!adjustments?.length ? <EmptyState title="No adjustments" description="Create a stock adjustment" actionLabel="New Adjustment" onAction={() => navigate("/adjustments/new")} /> : (
        <div className="border rounded-lg bg-card overflow-hidden">
          <Table><TableHeader><TableRow>
            <TableHead className="text-xs">Reference</TableHead><TableHead className="text-xs">Warehouse</TableHead><TableHead className="text-xs">Reason</TableHead><TableHead className="text-xs">Status</TableHead><TableHead className="text-xs">Date</TableHead>
          </TableRow></TableHeader>
          <TableBody>{adjustments.map(a => (
            <TableRow key={a.id} className="hover:bg-row-hover cursor-pointer" onClick={() => navigate(`/adjustments/${a.id}`)}>
              <TableCell className="text-sm font-mono font-medium">{a.reference_no}</TableCell>
              <TableCell className="text-sm">{getWName(a.warehouse_id)}</TableCell>
              <TableCell className="text-sm">{a.reason || "-"}</TableCell>
              <TableCell><StatusBadge status={a.status || "Draft"} /></TableCell>
              <TableCell className="text-sm">{a.created_at ? format(new Date(a.created_at), "MMM dd, yyyy") : "-"}</TableCell>
            </TableRow>
          ))}</TableBody></Table>
        </div>
      )}
    </div>
  );
}
