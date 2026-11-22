import { useState, type FormEvent } from "react"
import { Link, useLocation, useNavigate } from "react-router"
import { confirmPasswordReset, requestPasswordReset } from "@/api/auth"
import { errorStatus, fieldError } from "@/api/reports"
import { Container } from "@/components/layout/Container"
import { Button } from "@/components/ui/button"
import { authPage, resetPassword as text } from "@/content/reports"
import { useDocumentTitle } from "@/lib/useDocumentTitle"

const input =
  "mt-2 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"

export function ResetPasswordPage() {
  const { hash } = useLocation()
  const token = new URLSearchParams(hash.slice(1)).get("token")
  useDocumentTitle(token ? text.newTitle : text.title)
  return (
    <Container className="flex justify-center py-16 md:py-24">
      <section className="w-full max-w-[400px]">
        <h1 className="font-heading text-3xl font-semibold">{token ? text.newTitle : text.title}</h1>
        {token ? <ConfirmReset key={token} token={token} /> : <RequestReset />}
        <Link to="/login" className="mt-6 inline-block text-sm text-link hover:text-link-hover">{text.back}</Link>
      </section>
    </Container>
  )
}

function RequestReset() {
  const { state } = useLocation() as { state?: { passwordReset?: boolean } }
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "failed">("idle")

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStatus("sending")
    try {
      await requestPasswordReset(email.trim())
      setStatus("sent")
    } catch {
      setStatus("failed")
    }
  }

  if (state?.passwordReset) return <p role="status" className="mt-4 text-fg-secondary">{text.saved}</p>
  if (status === "sent") return <p role="status" className="mt-4 text-fg-secondary">{text.sent}</p>

  return (
    <>
      <p className="mt-4 text-sm text-fg-secondary">{text.lead}</p>
      <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
        <label className="text-sm font-medium">
          {authPage.email}
          <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={input} />
        </label>
        {status === "failed" && <p role="alert" className="text-sm text-destructive">{authPage.failed}</p>}
        <Button type="submit" disabled={status === "sending"} size="lg">{text.send}</Button>
      </form>
    </>
  )
}

function ConfirmReset({ token }: { token: string }) {
  const navigate = useNavigate()
  const [password, setPassword] = useState("")
  const [confirmation, setConfirmation] = useState("")
  const [busy, setBusy] = useState(false)
  const [invalid, setInvalid] = useState(false)
  const [error, setError] = useState("")

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (password !== confirmation) {
      setError(text.mismatch)
      return
    }
    setBusy(true)
    setError("")
    try {
      await confirmPasswordReset(token, password, confirmation)
      // The fragment keeps the token out of HTTP URLs. Remove it after confirmation.
      void navigate("/reset-password", { replace: true, state: { passwordReset: true } })
    } catch (cause) {
      const passwordError = fieldError(cause, "password") ?? fieldError(cause, "passwordConfirm")
      if (!passwordError && errorStatus(cause) === 400) setInvalid(true)
      else setError(passwordError ?? authPage.failed)
    } finally {
      setBusy(false)
    }
  }

  if (invalid) return (
    <div className="mt-4">
      <p role="alert" className="text-sm text-destructive">{text.invalid}</p>
      <Link to="/reset-password" replace className="mt-3 inline-block text-sm text-link hover:text-link-hover">{text.requestAgain}</Link>
    </div>
  )

  return (
    <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
      <label className="text-sm font-medium">
        {authPage.password}
        <input type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} className={input} />
        <span className="mt-1 block text-[13px] font-normal text-muted-foreground">{authPage.passwordHint}</span>
      </label>
      <label className="text-sm font-medium">
        {text.repeat}
        <input type="password" autoComplete="new-password" minLength={8} required value={confirmation} onChange={(e) => setConfirmation(e.target.value)} className={input} />
      </label>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={busy} size="lg">{text.save}</Button>
    </form>
  )
}
