import { useState, type FormEvent } from "react"
import { Link, Navigate, useNavigate, useSearchParams } from "react-router"
import { login, register, useAuth } from "@/api/auth"
import { errorStatus, fieldError } from "@/api/reports"
import { Container } from "@/components/layout/Container"
import { Button } from "@/components/ui/button"
import { authPage as text } from "@/content/reports"
import { useDocumentTitle } from "@/lib/useDocumentTitle"
import { cn } from "@/lib/utils"

const input =
  "mt-2 h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"

export function LoginPage() {
  const [mode, setMode] = useState<"login" | "register">("login")
  useDocumentTitle(mode === "login" ? text.login : text.register)
  const { user } = useAuth()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const asked = params.get("next")?.startsWith("/") ? params.get("next")! : null
  const home = (role?: string) => asked ?? (role === "moderator" || role === "admin" ? "/moderation" : "/me")

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (user) return <Navigate to={home(user.role)} replace />

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const auth =
        mode === "login"
          ? await login(email, password)
          : await register({ email, password, name: name.trim() || undefined })
      navigate(home(auth.record.role), { replace: true })
    } catch (err) {
      const taken = fieldError(err, "email")
      setError(
        mode === "login" && errorStatus(err) === 400
          ? text.wrong
          : taken
            ? text.taken
            : (fieldError(err, "password") ?? text.failed),
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <Container className="flex justify-center py-16 md:py-24">
      <div className="w-full max-w-[400px]">
        <div role="tablist" className="flex gap-1 rounded-xl bg-muted p-1">
          {(["login", "register"] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              onClick={() => {
                setMode(m)
                setError(null)
              }}
              className={cn(
                "h-9 flex-1 rounded-lg text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
                mode === m
                  ? "bg-background text-foreground shadow-sm dark:bg-input"
                  : "text-muted-foreground",
              )}
            >
              {m === "login" ? text.login : text.register}
            </button>
          ))}
        </div>
        <p className="mt-6 text-sm text-fg-secondary">{text.lead}</p>

        <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
          {mode === "register" && (
            <label className="text-sm font-medium">
              {text.name}
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                className={input}
              />
            </label>
          )}
          <label className="text-sm font-medium">
            {text.email}
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className={input}
            />
          </label>
          <label className="text-sm font-medium">
            {text.password}
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              className={input}
            />
            {mode === "register" && (
              <span className="mt-1 block text-[13px] font-normal text-muted-foreground">
                {text.passwordHint}
              </span>
            )}
          </label>
          {mode === "login" && (
            <Link to="/reset-password" className="self-start text-sm text-link hover:text-link-hover">
              {text.forgotPassword}
            </Link>
          )}
          {error && (
            <p role="alert" className="text-[13px] text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" size="lg" disabled={busy} className="mt-2">
            {mode === "login" ? text.submitLogin : text.submitRegister}
          </Button>
        </form>
      </div>
    </Container>
  )
}
