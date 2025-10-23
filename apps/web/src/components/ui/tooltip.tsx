"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface TooltipContextType {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const TooltipContext = React.createContext<TooltipContextType | undefined>(undefined);

export function TooltipProvider({ children, delayDuration = 0 }: { children: React.ReactNode; delayDuration?: number }) {
  return <>{children}</>;
}

export function Tooltip({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  
  return (
    <TooltipContext.Provider value={{ open, setOpen }}>
      {children}
    </TooltipContext.Provider>
  );
}

export const TooltipTrigger = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  const context = React.useContext(TooltipContext);
  
  return (
    <div
      ref={ref}
      className={cn("inline-block", className)}
      onMouseEnter={() => context?.setOpen(true)}
      onMouseLeave={() => context?.setOpen(false)}
      {...props}
    >
      {children}
    </div>
  );
});
TooltipTrigger.displayName = "TooltipTrigger";

export const TooltipContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    side?: 'top' | 'right' | 'bottom' | 'left';
    sideOffset?: number;
  }
>(({ className, children, side = 'top', sideOffset = 4, ...props }, ref) => {
  const context = React.useContext(TooltipContext);
  
  if (!context?.open) return null;
  
  return (
    <div
      ref={ref}
      className={cn(
        "absolute z-50 overflow-hidden rounded-md border bg-gray-900 px-3 py-1.5 text-sm text-white shadow-md animate-in fade-in-0 zoom-in-95",
        "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        className
      )}
      style={{
        position: 'absolute',
        top: side === 'bottom' ? '100%' : side === 'top' ? 'auto' : '50%',
        bottom: side === 'top' ? '100%' : 'auto',
        left: side === 'right' ? '100%' : side === 'left' ? 'auto' : '50%',
        right: side === 'left' ? '100%' : 'auto',
        transform:
          side === 'top' || side === 'bottom' ? 'translateX(-50%)' :
          side === 'left' || side === 'right' ? 'translateY(-50%)' : 'none',
        marginTop: side === 'bottom' ? sideOffset : side === 'top' ? -sideOffset : 0,
        marginLeft: side === 'right' ? sideOffset : side === 'left' ? -sideOffset : 0,
      }}
      {...props}
    >
      {children}
    </div>
  );
});
TooltipContent.displayName = "TooltipContent";