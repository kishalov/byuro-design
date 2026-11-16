import { notFound } from "next/navigation";

// Любой неизвестный путь внутри языка → локализованная 404
export default function CatchAll() {
  notFound();
}
