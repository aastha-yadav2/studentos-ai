import React from "react"
import ReactDOM from "react-dom/client"
import { RouterProvider } from "react-router-dom"
import { router } from "@/app/routes"
import { AuthProvider } from "@/auth/auth-provider"
import { ThemeProvider } from "@/theme/theme-provider"
import { DemoModeProvider } from "@/lib/demo/demoModeProvider"
import "./styles.css"

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider>
      <DemoModeProvider><AuthProvider><RouterProvider router={router} /></AuthProvider></DemoModeProvider>
    </ThemeProvider>
  </React.StrictMode>,
)
