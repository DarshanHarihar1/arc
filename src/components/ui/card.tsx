import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[20px] border border-line bg-card p-5 text-card-foreground shadow-card",
        className,
      )}
      {...props}
    />
  );
}
