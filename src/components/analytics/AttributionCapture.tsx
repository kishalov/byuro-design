"use client";
import { useEffect } from "react";
import { captureAttribution } from "@/lib/attribution";

/** Запоминает UTM-метки и источник при первой загрузке (до SPA-переходов, которые их теряют) */
export function AttributionCapture() {
  useEffect(() => captureAttribution(), []);
  return null;
}
