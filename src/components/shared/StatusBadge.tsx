import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { DocumentStatus } from "@/types";

const statusStyles: Record<DocumentStatus, string> = {
  Draft: "bg-draft text-draft-foreground",
  Waiting: "bg-warning text-warning-foreground",
  Ready: "bg-info text-info-foreground",
  Done: "bg-success text-success-foreground",
  Canceled: "bg-destructive text-destructive-foreground",
};

export function StatusBadge({ status }: { status: string }) {
  const style = statusStyles[status as DocumentStatus] || "bg-muted text-muted-foreground";
  return (
    <Badge className={cn("font-medium text-xs px-2 py-0.5 rounded", style)}>
      {status}
    </Badge>
  );
}
