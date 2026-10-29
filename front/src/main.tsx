import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "./index.css"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <h1 className="p-10 font-heading text-5xl font-semibold tracking-[-0.04em]">
      Экологический профиль Гомельщины
    </h1>
  </StrictMode>,
)
