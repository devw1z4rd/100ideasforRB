import * as React from "react"
import { Tooltip as TooltipPrimitive } from "radix-ui"
import { useFinePointer } from "@/lib/useMediaQuery"
import { cn } from "@/lib/utils"

/**
 * With a mouse — Radix tooltip (hover and keyboard focus); on touch devices — a native title on the element.
 */
function Tooltip({
  content,
  text,
  children,
  side = "bottom",
  delayDuration = 250,
}: {
  content: React.ReactNode
  text?: string
  children: React.ReactElement<{ title?: string }>
  side?: React.ComponentProps<typeof TooltipPrimitive.Content>["side"]
  delayDuration?: number
}) {
  const fine = useFinePointer()
  const native = text ?? (typeof content === "string" ? content : undefined)

  if (!fine) return native ? React.cloneElement(children, { title: native }) : children
  if (content == null || content === "") return children

  return (
    <TooltipPrimitive.Provider delayDuration={delayDuration}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            side={side}
            sideOffset={6}
            collisionPadding={8}
            className={cn(
              "z-50 max-w-72 origin-(--radix-tooltip-content-transform-origin) rounded-md bg-foreground px-2.5 py-1.5 text-[12px] leading-snug text-background shadow-md ring-1 ring-background/20",
              "duration-150 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0 data-[state=delayed-open]:zoom-in-95 data-[state=instant-open]:animate-in data-[state=instant-open]:fade-in-0",
            )}
          >
            {content}
            <TooltipPrimitive.Arrow className="fill-foreground" width={10} height={5} />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  )
}

export { Tooltip }
