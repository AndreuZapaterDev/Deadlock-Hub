"use client";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

/** Copia un texto al portapapeles. `text` puede ser una función (se evalúa al pulsar, p. ej. para leer la URL actual). */
export function CopyButton({ text, label = "Copiar", variant = "secondary" }: { text: string | (() => string); label?: string; variant?: "primary" | "secondary" | "ghost" }) {
  const [state, setState] = useState<"idle" | "ok" | "error">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  async function copy() {
    const value = typeof text === "function" ? text() : text;
    try {
      await navigator.clipboard.writeText(value);
      setState("ok");
    } catch {
      // Sin permiso o sin HTTPS: se prueba el método antiguo con un textarea temporal
      try {
        const ta = document.createElement("textarea");
        ta.value = value;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand("copy");
        ta.remove();
        setState(ok ? "ok" : "error");
      } catch {
        setState("error");
      }
    }
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setState("idle"), 2200);
  }

  return (
    <Button variant={variant} onClick={copy} aria-live="polite">
      {state === "ok" ? "Copiado ✓" : state === "error" ? "No se pudo copiar" : label}
    </Button>
  );
}
