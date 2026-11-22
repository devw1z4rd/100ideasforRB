import { useId, useState } from "react"
import { fieldError, useChangeReportStatus } from "@/api/reports"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { rejectionDialog as text, statusActions } from "@/content/reports"

export function RejectionReasonDialog({
  id,
  initialReason = "",
  size = "default",
  disabled,
  onRejected,
}: {
  id: string
  initialReason?: string
  size?: "default" | "sm"
  disabled?: boolean
  onRejected?: () => void
}) {
  const inputId = useId()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState("")
  const change = useChangeReportStatus()
  const comment = reason.trim()

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (change.isPending) return
        if (next) {
          change.reset()
          setReason(initialReason)
        }
        setOpen(next)
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size={size} disabled={disabled}>
          {statusActions.rejected}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md p-6">
        <DialogTitle className="pr-8 text-lg font-semibold">{text.title}</DialogTitle>
        <DialogDescription className="mt-2 text-sm text-muted-foreground">{text.description}</DialogDescription>
        <form
          className="mt-4"
          onSubmit={(e) => {
            e.preventDefault()
            if (!comment || change.isPending) return
            change.mutate(
              { id, status: "rejected", comment },
              {
                onSuccess: () => {
                  setOpen(false)
                  onRejected?.()
                },
              },
            )
          }}
        >
          <label htmlFor={inputId} className="text-sm font-medium">
            {text.reason}
          </label>
          <textarea
            id={inputId}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={change.isPending}
            required
            maxLength={1000}
            rows={3}
            className="mt-2 w-full resize-y rounded-lg border border-border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          {change.error && (
            <p role="alert" className="mt-2 text-[13px] text-destructive">
              {fieldError(change.error, "moderator_comment") ?? text.failed}
            </p>
          )}
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={change.isPending}>
                {text.cancel}
              </Button>
            </DialogClose>
            <Button type="submit" variant="destructive" disabled={!comment || change.isPending}>
              {statusActions.rejected}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
