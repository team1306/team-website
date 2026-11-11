"use client"

import { useMemo, useState } from "react"
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

const ORIGINAL_THEME = "original"
const DEFAULT_THEME_COLOR = ORIGINAL_THEME
const THEME_COLORS = [
  { name: "Original", value: ORIGINAL_THEME, preview: "#2563eb" },
  { name: "Team red", value: "#c12323", preview: "#c12323" },
  { name: "Blue", value: "#2563eb", preview: "#2563eb" },
  { name: "Green", value: "#15803d", preview: "#15803d" },
  { name: "Amber", value: "#b45309", preview: "#b45309" },
  { name: "Teal", value: "#0f766e", preview: "#0f766e" },
  { name: "Violet", value: "#6d28d9", preview: "#6d28d9" },
] as const

type ColorMode = "light" | "dark"

function isValidThemeColor(value: unknown): value is string {
  return value === ORIGINAL_THEME ||
    (typeof value === "string" && THEME_COLORS.some((theme) => theme.value === value))
}

function getAccentForeground(color: string) {
  const channels = [1, 3, 5].map((offset) => {
    const channel = parseInt(color.slice(offset, offset + 2), 16) / 255
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  })
  const luminance = channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
  return luminance > 0.179 ? "#111111" : "#ffffff"
}

function applyTheme(themeColor: string, colorMode: ColorMode) {
  const root = document.documentElement
  root.classList.toggle("dark", colorMode === "dark")
  root.style.colorScheme = colorMode

  if (themeColor === ORIGINAL_THEME) {
    root.removeAttribute("data-theme")
    root.style.removeProperty("--primary")
    root.style.removeProperty("--primary-foreground")
    return
  }

  root.setAttribute("data-theme", "vega")
  root.style.setProperty("--primary", themeColor)
  root.style.setProperty("--primary-foreground", getAccentForeground(themeColor))
}

export function ThemeSettings({ userId }: { userId: string }) {
  const supabase = useMemo(() => createClient(), [])
  const [open, setOpen] = useState(false)
  const [themeColor, setThemeColor] = useState<string>(DEFAULT_THEME_COLOR)
  const [colorMode, setColorMode] = useState<ColorMode>("dark")
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [saved, setSaved] = useState(false)

  async function loadPreferences() {
    setError("")
    try {
      const { data, error: loadError } = await supabase.auth.getUser()
      if (loadError || data.user?.id !== userId) {
        throw new Error("Unable to load your appearance settings.")
      }

      const preferences = data.user.user_metadata?.purchasing_preferences
      const savedColor = preferences?.themeColor
      const savedMode = preferences?.colorMode
      const nextColor = isValidThemeColor(savedColor) ? savedColor : DEFAULT_THEME_COLOR
      const nextMode = savedMode === "light" ? "light" : "dark"
      setThemeColor(nextColor)
      setColorMode(nextMode)
      applyTheme(nextColor, nextMode)
    } catch {
      setError("Unable to load your appearance settings.")
    } finally {
      setLoaded(true)
    }
  }

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
      <DialogTrigger render={<Button variant="ghost" size="icon" disabled={!userId} aria-label="Appearance settings" title="Appearance settings" />}>
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
                  checked={themeColor === theme.value}
                  onChange={() => { setThemeColor(theme.value); setSaved(false) }}
                  className="sr-only"
                />
                <span aria-hidden="true" className="size-4 shrink-0 rounded-full border" style={{ backgroundColor: theme.preview }} />
                {theme.name}
              </label>
            ))}
          </div>
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
                onChange={() => { setColorMode(mode); setSaved(false) }}
              />
              {mode}
            </label>
          ))}
        </fieldset>

        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        {saved && <p role="status" className="text-sm text-muted-foreground">Appearance saved.</p>}
        <DialogFooter>
          <Button onClick={savePreferences} disabled={!loaded || saving} aria-busy={saving}>
            {saving ? "Saving…" : "Save appearance"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
