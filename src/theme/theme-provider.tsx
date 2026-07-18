import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"

export type Theme = "light" | "dark" | "system"
type ThemeContextValue = { theme: Theme; setTheme: (theme: Theme) => void; resolvedTheme: "light" | "dark" }
const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)
const storageKey = "studentos-theme"

function resolveTheme(theme: Theme) { return theme === "system" ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : theme }

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem(storageKey) as Theme | null) ?? "dark")
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">(() => resolveTheme(theme))
  useEffect(() => { const apply = () => { const resolved = resolveTheme(theme); document.documentElement.classList.toggle("dark", resolved === "dark"); document.documentElement.style.colorScheme = resolved; setResolvedTheme(resolved) }; apply(); localStorage.setItem(storageKey, theme); if (theme !== "system") return; const media = window.matchMedia("(prefers-color-scheme: dark)"); media.addEventListener("change", apply); return () => media.removeEventListener("change", apply) }, [theme])
  const value = useMemo(() => ({ theme, setTheme, resolvedTheme }), [resolvedTheme, theme])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

// Context hooks intentionally share this module with their provider.
// eslint-disable-next-line react-refresh/only-export-components
export function useTheme() { const context = useContext(ThemeContext); if (!context) throw new Error("useTheme must be used within ThemeProvider"); return context }
