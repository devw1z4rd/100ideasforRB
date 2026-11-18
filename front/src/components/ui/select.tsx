import * as React from "react"
import { CheckIcon } from "lucide-react"
import { Select as SelectPrimitive } from "radix-ui"
import { cn } from "@/lib/utils"

// Выпадающий список на Radix Select — для десктопа (на телефоне фильтры остаются нативными <select>).
// Список открывается под кнопкой (position="popper"), ширина — не уже кнопки.

const Select = SelectPrimitive.Root
const SelectValue = SelectPrimitive.Value
const SelectTrigger = SelectPrimitive.Trigger
const SelectIcon = SelectPrimitive.Icon

function SelectContent({
  className,
  children,
  sideOffset = 6,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        position="popper"
        sideOffset={sideOffset}
        className={cn(
          "relative z-50 max-h-(--radix-select-content-available-height) min-w-(--radix-select-trigger-width) origin-(--radix-select-content-transform-origin) overflow-hidden rounded-xl bg-popover text-popover-foreground shadow-lg ring-1 ring-foreground/10 duration-150 data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
          className,
        )}
        {...props}
      >
        <SelectPrimitive.Viewport className="max-h-[min(420px,var(--radix-select-content-available-height))] p-1">
          {children}
        </SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  )
}

function SelectItem({ className, children, ...props }: React.ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      className={cn(
        "relative flex cursor-pointer items-center gap-2 rounded-lg py-1.5 pr-8 pl-2.5 text-sm outline-hidden select-none data-highlighted:bg-muted data-[state=checked]:font-medium data-disabled:pointer-events-none data-disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {children}
      <span className="absolute right-2.5 flex size-4 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <CheckIcon aria-hidden="true" className="size-4" />
        </SelectPrimitive.ItemIndicator>
      </span>
    </SelectPrimitive.Item>
  )
}

const SelectItemText = SelectPrimitive.ItemText

export { Select, SelectContent, SelectIcon, SelectItem, SelectItemText, SelectTrigger, SelectValue }
