"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle({ label = true }: { label?: boolean }) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <Button variant="outline" size="sm" disabled>
        …
      </Button>
    );
  }

  const current = resolvedTheme ?? theme ?? "light";
  const isDark = current === "dark";

  return (
    <Button
      variant="outline"
      size={label ? "default" : "icon"}
      className={label ? "w-full justify-between" : ""}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {label ? (
        <span>Тема: {isDark ? "темна" : "світла"}</span>
      ) : null}
      {isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
    </Button>
  );
}