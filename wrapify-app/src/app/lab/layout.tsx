import type { Metadata } from "next";
import { Bricolage_Grotesque, Fraunces, Outfit } from "next/font/google";
import "@/lab/lab.css";

const bricolage = Bricolage_Grotesque({ variable: "--font-bricolage", subsets: ["latin"] });
const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"], style: ["normal", "italic"] });
const outfit = Outfit({ variable: "--font-outfit", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Wrapify Lab",
  description: "Tres propuestas de interfaz para Wrapify",
};

export default function LabLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${bricolage.variable} ${fraunces.variable} ${outfit.variable}`}>{children}</div>;
}
