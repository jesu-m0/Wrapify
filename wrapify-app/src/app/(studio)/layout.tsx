import { Bricolage_Grotesque } from "next/font/google";
import "@/lab/lab.css";

/* Shared shell for the Studio UI: the home page (/) and the lab pages (/lab/*). */

const bricolage = Bricolage_Grotesque({ variable: "--font-bricolage", subsets: ["latin"] });

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return <div className={bricolage.variable}>{children}</div>;
}
