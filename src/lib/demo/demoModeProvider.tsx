import { createContext, useContext, useMemo, useState, type ReactNode } from "react"
import { demoWorkspace } from "./demoDataService"
type DemoContext = { enabled: boolean; workspace: typeof demoWorkspace; enterDemo: () => void; exitDemo: () => void }
const DemoModeContext = createContext<DemoContext | undefined>(undefined)
export function DemoModeProvider({ children }: { children: ReactNode }) { const [enabled, setEnabled] = useState(() => sessionStorage.getItem("studentos-demo") === "true"); const value = useMemo(() => ({ enabled, workspace: demoWorkspace, enterDemo: () => { sessionStorage.setItem("studentos-demo", "true"); setEnabled(true) }, exitDemo: () => { sessionStorage.removeItem("studentos-demo"); setEnabled(false) } }), [enabled]); return <DemoModeContext.Provider value={value}>{children}</DemoModeContext.Provider> }
// Context hooks intentionally share this module with their provider.
// eslint-disable-next-line react-refresh/only-export-components
export function useDemoMode() { const context = useContext(DemoModeContext); if (!context) throw new Error("useDemoMode must be used within DemoModeProvider"); return context }
