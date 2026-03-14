import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface PageHeaderProps {
  title: string;
  description?: string;
  actionLabel?: string;
  actionTo?: string;
  onAction?: () => void;
}

export function PageHeader({ title, description, actionLabel, actionTo, onAction }: PageHeaderProps) {
  const navigate = useNavigate();
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
        {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
      </div>
      {actionLabel && (
        <Button onClick={actionTo ? () => navigate(actionTo) : onAction} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
