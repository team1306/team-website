"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { createClient } from "../../../utils/supabase/client"

const DEFAULT_THEME_COLOR = "#c12323"
const THEME_COLORS = [
  { name: "Team red", value: "#c12323", preview: "#c12323" },
  { name: "Blue", value: "#2563eb", preview: "#2563eb" },
  { name: "Green", value: "#15803d", preview: "#15803d" },
  { name: "Amber", value: "#b45309", preview: "#b45309" },
  { name: "Teal", value: "#0f766e", preview: "#0f766e" },
  { name: "Violet", value: "#6d28d9", preview: "#6d28d9" },
] as const

type ColorMode = "light" | "dark"

function isValidThemeColor(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value)
}

function getAccentForeground(color: string) {
  const channels = [1, 3, 5].map((offset) => {
    const channel = parseInt(color.slice(offset, offset + 2), 16) / 255
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  })
  const luminance = channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
  return luminance > 0.179 ? "#000000" : "#ffffff"
}

function applyTheme(themeColor: string, colorMode: ColorMode) {
  const root = document.documentElement
  root.classList.toggle("dark", colorMode === "dark")
  root.style.colorScheme = colorMode

  const accentColor = isValidThemeColor(themeColor) ? themeColor : DEFAULT_THEME_COLOR
  const hoverColor = "#" + [1, 3, 5].map(offset =>
    Math.round(parseInt(accentColor.slice(offset, offset + 2), 16) * 0.85).toString(16).padStart(2, "0")
  ).join("")
  root.setAttribute("data-theme", "vega")
  root.style.setProperty("--primary", accentColor)
  root.style.setProperty("--primary-foreground", getAccentForeground(accentColor))
  root.style.setProperty("--primary-hover", hoverColor)
  root.style.setProperty("--primary-hover-foreground", getAccentForeground(hoverColor))
  root.style.removeProperty("--ring")
  root.style.setProperty("--chart-1", accentColor)
  try {
    window.localStorage.setItem("purchasing-app-accent-color", themeColor)
    window.localStorage.setItem("purchasing-app-color-mode", colorMode)
  } catch { /* Browser storage may be disabled. */ }
}

export function ThemeSettings({ userId }: { userId: string }) {
  const supabase = useMemo(() => createClient(), [])
  const [open, setOpen] = useState(false)
  const [themeColor, setThemeColor] = useState<string>(DEFAULT_THEME_COLOR)
  const [custom, setCustom] = useState(false)
  const [customHex, setCustomHex] = useState<string>(DEFAULT_THEME_COLOR)
  const invalidCustom = custom && !isValidThemeColor(customHex)
  const [colorMode, setColorMode] = useState<ColorMode>("dark")
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    let color: string = DEFAULT_THEME_COLOR
    let mode: ColorMode = "dark"
    try {
      const storedColor = window.localStorage.getItem("purchasing-app-accent-color")
      if (isValidThemeColor(storedColor)) color = storedColor
      if (window.localStorage.getItem("purchasing-app-color-mode") === "light") mode = "light"
    } catch { /* Use the default theme when browser storage is unavailable. */ }
    applyTheme(color, mode)
  }, [])

  useEffect(() => {
    if (loaded) applyTheme(themeColor, colorMode)
  }, [themeColor, colorMode, loaded])

  const loadPreferences = useCallback(async () => {
    setError("")
    try {
      const { data, error: loadError } = await supabase.auth.getUser()
      if (loadError || data.user?.id !== userId) {
        throw new Error("Unable to load your appearance settings.")
      }

      const preferences = data.user.user_metadata?.purchasing_preferences
      let localColor: string | null = null
      let localMode: string | null = null
      try {
        localColor = window.localStorage.getItem("purchasing-app-accent-color")
        localMode = window.localStorage.getItem("purchasing-app-color-mode")
      } catch { /* Account preferences still work without browser storage. */ }
      const savedColor = preferences?.themeColor ?? localColor
      const savedMode = preferences?.colorMode ?? localMode
      const nextColor = isValidThemeColor(savedColor) ? savedColor : DEFAULT_THEME_COLOR
      const nextMode: ColorMode = savedMode === "light" || savedMode === "dark"
        ? savedMode
        : document.documentElement.classList.contains("dark") ? "dark" : "light"
      setThemeColor(nextColor)
      setCustomHex(nextColor)
      setCustom(!THEME_COLORS.some(theme => theme.value === nextColor))
      setColorMode(nextMode)
      applyTheme(nextColor, nextMode)
    } catch {
      setError("Unable to load your appearance settings.")
    } finally {
      setLoaded(true)
    }
  }, [supabase, userId])

  useEffect(() => {
    if (!userId) return
    const timer = window.setTimeout(() => { void loadPreferences() }, 0)
    return () => window.clearTimeout(timer)
  }, [loadPreferences, userId])

  async function savePreferences() {
    setSaving(true)
    setError("")
    setSaved(false)

    try {
      const { data: currentUser, error: currentUserError } = await supabase.auth.getUser()
      if (currentUserError || currentUser.user?.id !== userId) {
        throw new Error("Your session changed. Reopen settings and try again.")
      }

      const { data, error: authError } = await supabase.auth.updateUser({
        data: { purchasing_preferences: { themeColor, colorMode } },
      })
      if (authError || data.user?.id !== userId) {
        throw new Error(authError?.message ?? "Unable to save your appearance settings.")
      }

      applyTheme(themeColor, colorMode)
      setSaved(true)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save your appearance settings.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => {
      setOpen(nextOpen)
      if (nextOpen && !loaded) void loadPreferences()
    }}>
      <DialogTrigger render={<Button variant="outline" size="icon" className="border-2" disabled={!userId} aria-label="Appearance settings" title="Appearance settings" />}>
        <Settings aria-hidden="true" />
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Appearance</DialogTitle>
          <DialogDescription>Choose a color theme and display mode for your account.</DialogDescription>
        </DialogHeader>

        <fieldset className="grid gap-3" disabled={!loaded || saving}>
          <legend className="text-sm font-medium">Theme color</legend>
          <div className="grid grid-cols-2 gap-2">
            {THEME_COLORS.map((theme) => (
              <label key={theme.value} className="flex cursor-pointer items-center gap-2 rounded-md border p-2 text-sm has-[:checked]:border-primary">
                <input
                  type="radio"
                  name="theme-color"
                  value={theme.value}
                  checked={!custom && themeColor === theme.value}
                  onChange={() => {
                    setCustom(false)
                    setThemeColor(theme.value)
                    applyTheme(theme.value, colorMode)
                    setSaved(false)
                  }}
                  className="accent-primary"
                />
                <span aria-hidden="true" className="size-4 shrink-0 rounded-full border" style={{ backgroundColor: theme.preview }} />
                {theme.name}
              </label>
            ))}
            <label className="flex cursor-pointer items-center gap-2 rounded-md border p-2 text-sm has-[:checked]:border-primary">
              <input type="radio" name="theme-color" value="custom" checked={custom} onChange={() => {
                setCustom(true)
                setCustomHex(themeColor)
                setSaved(false)
              }} />
              Custom
            </label>
          </div>
          {custom && <div className="flex flex-wrap items-start gap-3">
            <label className="grid gap-1 text-sm">Pick a color
              <input type="color" value={themeColor} onChange={event => {
                const color = event.target.value
                setCustomHex(color)
                setThemeColor(color)
                setSaved(false)
              }} className="h-10 w-16 cursor-pointer rounded border border-input" />
            </label>
            <label className="grid gap-1 text-sm">Hex color
              <input type="text" value={customHex} maxLength={7} spellCheck={false} autoComplete="off"
                placeholder="#c12323" aria-invalid={invalidCustom} aria-describedby={invalidCustom ? "custom-color-error" : undefined}
                onChange={event => {
                  const color = event.target.value
                  setCustomHex(color)
                  if (isValidThemeColor(color)) setThemeColor(color.toLowerCase())
                  setSaved(false)
                }} className="h-10 w-32 rounded border border-input bg-card px-3 text-foreground" />
              {invalidCustom && <span id="custom-color-error" role="alert">Use # followed by six hex digits.</span>}
            </label>
          </div>}
        </fieldset>

        <fieldset className="grid grid-cols-2 gap-2" disabled={!loaded || saving}>
          <legend className="col-span-2 text-sm font-medium">Color mode</legend>
          {(["light", "dark"] as const).map((mode) => (
            <label key={mode} className="flex cursor-pointer items-center gap-2 rounded-md border p-2 text-sm capitalize has-[:checked]:border-primary">
              <input
                type="radio"
                name="color-mode"
                value={mode}
                checked={colorMode === mode}
                onChange={() => {
                  setColorMode(mode)
                  applyTheme(themeColor, mode)
                  setSaved(false)
                }}
              />
              {mode}
            </label>
          ))}
        </fieldset>

        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        {saved && <p role="status" className="text-sm text-muted-foreground">Appearance saved.</p>}
        <DialogFooter>
          <Button onClick={savePreferences} disabled={!loaded || saving || invalidCustom} aria-busy={saving}>
            {saving ? "Saving…" : "Save appearance"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
