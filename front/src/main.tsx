import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "./index.css"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <h1 className="p-10 text-3xl font-semibold">Экологический профиль Гомельщины</h1>
  </StrictMode>,
)
