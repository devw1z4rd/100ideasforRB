import { useState, type FormEvent } from "react"
import { fieldError, useChangeReportDuplicate, useReports, type ReportWithDistrict } from "@/api/reports"
import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { categoryLabels, duplicateReports as text, statusLabels } from "@/content/reports"
import { formatDateTime } from "./ReportBits"

const reportId = /^[a-z0-9]{15}$/
const candidatesStatuses = ["new", "accepted", "forwarded", "resolved"] as const
const inputClass = "mt-2 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"

function readId(value: string) {
  if (reportId.test(value)) return value
  try {
    const url = new URL(value, location.origin)
    return /^\/reports\/([a-z0-9]{15})\/?$/.exec(url.pathname)?.[1] ?? ""
  } catch {
    return ""
  }
}

export function DuplicateReportDialog({ report, size = "default" }: {
  report: ReportWithDistrict
  size?: "default" | "sm"
}) {
  const [open, setOpen] = useState(false)
  const linked = Boolean(report.duplicate_of)
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size={size}>{linked ? text.unlink : text.link}</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md p-6">
        <DialogTitle className="pr-8 text-lg font-semibold">{linked ? text.unlink : text.title}</DialogTitle>
        <DialogDescription className="mt-2 text-sm text-muted-foreground">{linked ? text.unlinkLead : text.lead}</DialogDescription>
        {open && <DuplicateForm report={report} linked={linked} onSaved={() => setOpen(false)} />}
      </DialogContent>
    </Dialog>
  )
}

function DuplicateForm({ report, linked, onSaved }: { report: ReportWithDistrict; linked: boolean; onSaved: () => void }) {
  const [picked, setPicked] = useState("")
  const [address, setAddress] = useState("")
  const manual = address.trim()
  const target = manual ? readId(manual) : picked
  const valid = Boolean(target && target !== report.id)
  const change = useChangeReportDuplicate()
  const suggested = useReports({ district: report.district, duplicates: "exclude", status: candidatesStatuses }, !linked)
  const candidates = (suggested.data ?? []).filter((item) => item.id !== report.id)

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (change.isPending || (!linked && !valid)) return
    change.mutate({ id: report.id, parentId: linked ? "" : target }, { onSuccess: onSaved })
  }

  return (
    <form className="mt-4" onSubmit={submit}>
      {!linked && (
        <>
          <label className="block text-sm font-medium">
            {text.candidates}
            <select value={picked} className={inputClass} disabled={change.isPending} onChange={(e) => {
              setPicked(e.target.value)
              setAddress("")
            }}>
              <option value="">{text.choose}</option>
              {candidates.map((item) => (
                <option key={item.id} value={item.id}>
                  {categoryLabels[item.category]} · {statusLabels[item.status]} · {formatDateTime(item.created)}{item.description ? ` · ${item.description.slice(0, 60)}` : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="mt-4 block text-sm font-medium">
            {text.address}
            <input value={address} disabled={change.isPending} className={inputClass} onChange={(e) => {
              setAddress(e.target.value)
              setPicked("")
            }} />
          </label>
          {manual && !valid && <p role="alert" className="mt-2 text-sm text-destructive">{text.invalid}</p>}
        </>
      )}
      {change.error && <p role="alert" className="mt-2 text-sm text-destructive">{fieldError(change.error, "duplicate_of") ?? text.failed}</p>}
      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <DialogClose asChild><Button type="button" variant="outline">{text.cancel}</Button></DialogClose>
        <Button type="submit" disabled={change.isPending || (!linked && !valid)}>{linked ? text.unlink : text.link}</Button>
      </div>
    </form>
  )
}
