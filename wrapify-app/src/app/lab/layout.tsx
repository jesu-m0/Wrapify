import type { Metadata } from "next";
import { Bricolage_Grotesque } from "next/font/google";
import "@/lab/lab.css";

const bricolage = Bricolage_Grotesque({ variable: "--font-bricolage", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Wrapify Lab",
  description: "La nueva interfaz de Wrapify, en pruebas",
};

export default function LabLayout({ children }: { children: React.ReactNode }) {
  return <div className={bricolage.variable}>{children}</div>;
}
