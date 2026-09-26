import { type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type StatCardProps = {
  icon: LucideIcon;
  label: string;
  value: string | number;
  hint?: string;
  accent?: "monad" | "flame" | "amber" | "violet";
  className?: string;
};

const accentMap: Record<NonNullable<StatCardProps["accent"]>, string> = {
  monad: "from-monad/20 to-monad/5 border-monad/30 text-monad",
  flame: "from-flame/20 to-flame/5 border-flame/30 text-flame",
  amber: "from-amber-500/20 to-amber-500/5 border-amber-500/30 text-amber-400",
  violet: "from-violet-500/20 to-violet-500/5 border-violet-500/30 text-violet-400",
};

export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  accent = "monad",
  className,
}: StatCardProps) {
  return (
    <Card
      className={cn(
        "relative overflow-hidden border bg-gradient-to-br transition-transform hover:scale-[1.02]",
        accentMap[accent],
        className
      )}
    >
      <CardContent className="flex items-center gap-4 p-5">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-foreground/5">
          <Icon className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p className="truncate text-2xl font-bold text-foreground">{value}</p>
          {hint && <p className="truncate text-xs text-muted-foreground">{hint}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
