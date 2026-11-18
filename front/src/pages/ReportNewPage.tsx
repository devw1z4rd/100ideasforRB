import { Camera, Check, LocateFixed, X } from "lucide-react"
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react"
import { Link, useNavigate } from "react-router"
import { useAuth } from "@/api/auth"
import type { GeoPoint, ReportsCategoryOptions } from "@/api/pocketbase-types"
import { errorStatus, fieldError, useCreateReport } from "@/api/reports"
import { Container } from "@/components/layout/Container"
import { ReportIcon } from "@/components/map/ReportIcon"
import { PointPicker } from "@/components/reports/PointPicker"
import { Button } from "@/components/ui/button"
import { categoryLabels, reportForm as text } from "@/content/reports"
import { compressPhoto } from "@/lib/photo"
import { clearDraft, loadDraft, loadPhotos, saveDraft, savePhotos } from "@/lib/reportDraft"
import { useDocumentTitle } from "@/lib/useDocumentTitle"
import { cn } from "@/lib/utils"

const MAX_PHOTOS = 5
const MAX_PHOTO_BYTES = 8 * 1024 * 1024
const MAX_DESCRIPTION = 1000
const categories = Object.keys(categoryLabels) as ReportsCategoryOptions[]

type Locating = "idle" | "busy" | "failed"

export function ReportNewPage() {
  useDocumentTitle(text.title)
  const { user } = useAuth()
  const navigate = useNavigate()
  const create = useCreateReport()

  const [draft] = useState(loadDraft)
  const [photos, setPhotos] = useState<File[]>([])
  const [processing, setProcessing] = useState(0)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [point, setPoint] = useState<GeoPoint | null>(draft.point)
  const [focus, setFocus] = useState<GeoPoint | null>(draft.point)
  const [locating, setLocating] = useState<Locating>("idle")
  const [category, setCategory] = useState<ReportsCategoryOptions | null>(draft.category)
  const [description, setDescription] = useState(draft.description)
  useEffect(() => saveDraft({ point, category, description }), [point, category, description])
  // Draft photos load asynchronously; start saving only after that, or an empty list would overwrite them.
  const photosLoaded = useRef(false)
  useEffect(() => {
    void loadPhotos().then((saved) => {
      if (saved.length) setPhotos((current) => (current.length ? current : saved))
      photosLoaded.current = true
    })
  }, [])
  useEffect(() => {
    if (photosLoaded.current) void savePhotos(photos)
  }, [photos])
  const [tried, setTried] = useState(false)

  const previews = useMemo(() => photos.map((f) => URL.createObjectURL(f)), [photos])
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews])

  const locate = () => {
    if (!navigator.geolocation) return setLocating("failed")
    setLocating("busy")
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const p = { lon: coords.longitude, lat: coords.latitude }
        setPoint(p)
        setFocus(p)
        setLocating("idle")
        create.reset()
      },
      () => setLocating("failed"),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    )
  }
  // Auto-locate only if geolocation is already granted (no surprise permission prompt on open).
  useEffect(() => {
    navigator.permissions
      ?.query({ name: "geolocation" })
      .then((s) => s.state === "granted" && !draft.point && locate())
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const addPhotos = async (files: FileList | null) => {
    if (!files) return
    const picked = [...files].slice(0, Math.max(0, MAX_PHOTOS - photos.length - processing))
    setPhotoError(files.length > picked.length ? text.photosTooMany : null)
    if (!point && locating === "idle") locate()
    setProcessing((n) => n + picked.length)
    let problem: string | null = null
    // One at a time: decoding several 12+ MP shots at once can run a phone out of memory.
    for (const file of picked) {
      const photo = await compressPhoto(file)
      setProcessing((n) => n - 1)
      if (!photo) problem ??= text.photoUnreadable(file.name)
      else if (photo.size > MAX_PHOTO_BYTES) problem ??= text.photoTooBig(file.name)
      else setPhotos((current) => [...current, photo].slice(0, MAX_PHOTOS))
    }
    if (problem) setPhotoError(problem)
  }

  const serverPointError = create.error ? fieldError(create.error, "location") : null
  const descriptionError = create.error ? fieldError(create.error, "description") : null
  const missing = [!point && text.missingPoint, !category && text.missingCategory].filter(Boolean)
  const submitError =
    create.error && !serverPointError && !descriptionError
      ? errorStatus(create.error) === 429
        ? text.tooMany
        : (fieldError(create.error, "photos") ?? text.failed)
      : null

  const submit = (e: FormEvent) => {
    e.preventDefault()
    setTried(true)
    if (!point || !category || processing) return
    create.mutate(
      { location: point, category, description: description.trim(), photos },
      {
        onSuccess: ({ id, key }) => {
          clearDraft()
          navigate(key ? `/reports/${id}?key=${key}` : `/reports/${id}`, { state: { created: true } })
        },
      },
    )
  }

  return (
    <Container className="max-w-[760px] pt-8 md:pt-14">
      <h1 className="font-heading text-[clamp(30px,4vw,44px)] leading-[1.05] font-semibold tracking-[-0.03em]">
        {text.title}
      </h1>
      <p className="mt-3 text-fg-secondary">{text.lead}</p>

      <form onSubmit={submit} noValidate className="mt-8 flex flex-col gap-9">
        <Step n={1} title={text.photos} hint={text.photosHint}>
          {photos.length === 0 && processing === 0 ? (
            <label className="flex h-36 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-input text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground has-focus-visible:ring-2 has-focus-visible:ring-ring">
              <Camera className="size-8" />
              <span className="text-sm font-medium">{text.addPhoto}</span>
              <PhotoInput onFiles={addPhotos} />
            </label>
          ) : (
            <div className="flex flex-wrap gap-2">
              {previews.map((url, i) => (
                <div key={url} className="relative">
                  <img src={url} alt="" className="size-24 rounded-xl object-cover" />
                  <button
                    type="button"
                    aria-label={`${text.removePhoto} ${i + 1}`}
                    onClick={() => setPhotos(photos.filter((_, j) => j !== i))}
                    className="absolute -top-2 -right-2 grid size-7 place-items-center rounded-full bg-foreground text-background outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ))}
              {Array.from({ length: processing }, (_, i) => (
                <div
                  key={`processing-${i}`}
                  aria-hidden="true"
                  className="size-24 animate-pulse rounded-xl bg-muted"
                />
              ))}
              {photos.length + processing < MAX_PHOTOS && (
                <label className="grid size-24 cursor-pointer place-items-center rounded-xl border-2 border-dashed border-input text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground has-focus-visible:ring-2 has-focus-visible:ring-ring">
                  <Camera className="size-6" />
                  <span className="sr-only">{text.addPhoto}</span>
                  <PhotoInput onFiles={addPhotos} />
                </label>
              )}
            </div>
          )}
          {photoError && <p className="mt-2 text-[13px] text-destructive">{photoError}</p>}
        </Step>

        <Step n={2} title={text.point} done={Boolean(point)}>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <Button
              type="button"
              variant={point ? "outline" : "default"}
              size="lg"
              onClick={locate}
              disabled={locating === "busy"}
            >
              <LocateFixed />
              {locating === "busy" ? text.locating : point ? text.locateAgain : text.locate}
            </Button>
            <span className="text-[13px] text-muted-foreground">
              {point ? text.pointSet : locating === "failed" ? text.locateFailed : text.pointHint}
            </span>
          </div>
          <PointPicker
            value={point}
            onChange={(p) => {
              setPoint(p)
              create.reset()
            }}
            focus={focus}
            className={cn(
              "mt-3 h-[260px] overflow-hidden rounded-2xl border md:h-[340px]",
              (tried && !point) || serverPointError ? "border-destructive" : "border-border",
            )}
          />
          {serverPointError && <p className="mt-2 text-[13px] text-destructive">{text.outside}</p>}
        </Step>

        <Step n={3} title={text.category} done={Boolean(category)}>
          <div role="radiogroup" aria-label={text.category} className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {categories.map((c) => (
              <label
                key={c}
                className={cn(
                  "flex h-16 cursor-pointer items-center gap-3 rounded-xl border px-4 text-sm font-medium transition-colors has-focus-visible:ring-2 has-focus-visible:ring-ring",
                  category === c
                    ? "border-foreground bg-foreground text-background"
                    : "border-input hover:border-foreground/40",
                  tried && !category && "border-destructive",
                )}
              >
                <input
                  type="radio"
                  name="category"
                  value={c}
                  checked={category === c}
                  onChange={() => setCategory(c)}
                  className="sr-only"
                />
                <ReportIcon category={c} className="size-5 shrink-0" />
                {categoryLabels[c]}
              </label>
            ))}
          </div>
        </Step>

        <Step n={4} title={text.description} hint={text.optional}>
          <textarea
            value={description}
            onChange={(e) => {
              setDescription(e.target.value.slice(0, MAX_DESCRIPTION))
              if (descriptionError) create.reset()
            }}
            aria-invalid={Boolean(descriptionError)}
            placeholder={text.descriptionPlaceholder}
            aria-label={text.description}
            rows={3}
            className="w-full resize-y rounded-xl border border-input bg-background px-3.5 py-3 text-base outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring aria-invalid:border-destructive md:text-sm"
          />
          {descriptionError && <p className="mt-2 text-[13px] text-destructive">{descriptionError}</p>}
        </Step>

        <p className="text-[13px] text-muted-foreground">
          {user ? (
            text.asUser(user.name || user.email)
          ) : (
            <>
              {text.anonymous}{" "}
              <Link to="/login?next=/reports/new" className="text-link hover:text-link-hover">
                {text.loginOptional}
              </Link>
            </>
          )}
        </p>

        <div className="sticky bottom-0 z-10 -mx-4 border-t border-border bg-background px-4 py-3 md:mx-0 md:rounded-t-2xl md:px-0">
          {submitError && (
            <p role="alert" className="mb-2 text-[13px] text-destructive">
              {submitError}
            </p>
          )}
          <div className="flex items-center gap-4">
            <p className="min-w-0 flex-1 text-[13px] text-muted-foreground" aria-live="polite">
              {processing
                ? text.photosProcessing
                : missing.length
                  ? `${text.remaining}: ${missing.join(", ")}`
                  : text.ready}
            </p>
            <Button
              type="submit"
              size="lg"
              disabled={create.isPending || processing > 0}
              className="h-11 px-6"
            >
              {create.isPending ? text.submitting : text.submit}
            </Button>
          </div>
        </div>
      </form>
    </Container>
  )
}

function Step({
  n,
  title,
  hint,
  done = false,
  children,
}: {
  n: number
  title: string
  hint?: string
  done?: boolean
  children: React.ReactNode
}) {
  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2.5 text-base font-medium">
        <span
          aria-hidden="true"
          className={cn(
            "grid size-6 place-items-center rounded-full text-xs tabular-nums",
            done ? "bg-success text-background" : "bg-muted text-muted-foreground",
          )}
        >
          {done ? <Check className="size-3.5" /> : n}
        </span>
        {title}
        {hint && <span className="text-[13px] font-normal text-muted-foreground">{hint}</span>}
      </h2>
      {children}
    </section>
  )
}

function PhotoInput({ onFiles }: { onFiles: (files: FileList | null) => void }) {
  return (
    <input
      type="file"
      accept="image/*"
      multiple
      className="sr-only"
      onChange={(e) => {
        onFiles(e.target.files)
        e.target.value = ""
      }}
    />
  )
}
