import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Wrapify Lab",
  description: "La nueva interfaz de Wrapify, en pruebas",
};

export default function LabLayout({ children }: { children: React.ReactNode }) {
  return children;
}
