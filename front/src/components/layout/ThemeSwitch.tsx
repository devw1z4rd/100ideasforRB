import { Monitor, Moon, Sun } from "lucide-react"
import { footer } from "@/content/nav"
import { useTheme, type ThemePref } from "@/lib/theme"
import { cn } from "@/lib/utils"
import { Tooltip } from "@/components/ui/tooltip"

const options: ReadonlyArray<{ value: ThemePref; icon: typeof Sun }> = [
  { value: "light", icon: Sun },
  { value: "dark", icon: Moon },
  { value: "system", icon: Monitor },
]

export function ThemeSwitch({ className }: { className?: string }) {
  const [pref, choose] = useTheme()
  const text = footer.theme

  return (
    <div role="group" aria-label={text.label} className={cn("flex items-center gap-2", className)}>
      <span aria-hidden="true">{text.label}</span>
      <div className="flex rounded-lg bg-muted p-0.5">
        {options.map(({ value, icon: Icon }) => {
          const active = pref === value
          return (
            <Tooltip key={value} content={text.options[value]} side="top">
              <button
                type="button"
                aria-pressed={active}
                aria-label={text.options[value]}
                onClick={() => choose(value)}
                className={cn(
                  "grid size-7 cursor-pointer place-items-center rounded-md transition-colors",
                  active
                    ? "bg-background text-foreground shadow-sm dark:bg-input"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon aria-hidden="true" className="size-3.5" />
              </button>
            </Tooltip>
          )
        })}
      </div>
    </div>
  )
}
