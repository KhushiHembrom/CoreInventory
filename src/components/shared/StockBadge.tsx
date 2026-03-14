import { Badge } from "@/components/ui/badge";

interface StockBadgeProps {
  quantity: number;
  reorderLevel: number;
}

export function StockBadge({ quantity, reorderLevel }: StockBadgeProps) {
  if (quantity === 0) {
    return <Badge className="bg-destructive text-destructive-foreground text-xs">Out of Stock</Badge>;
  }
  if (quantity <= reorderLevel) {
    return <Badge className="bg-warning text-warning-foreground text-xs">Low Stock</Badge>;
  }
  return <Badge className="bg-success text-success-foreground text-xs">In Stock</Badge>;
}
