"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/admin_ui/ui/card";
import { ChartErrorBoundary } from "@/components/admin_ui/ui/chart-error-boundary";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  tall?: boolean;
};

export function ChartCard({ title, description, children, className, tall }: Props) {
  return (
    <Card className={cn("shadow-sm", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent>
        <ChartErrorBoundary>
          <div className={cn(tall ? "h-[320px]" : "h-[260px]", "w-full")}>{children}</div>
        </ChartErrorBoundary>
      </CardContent>
    </Card>
  );
}
