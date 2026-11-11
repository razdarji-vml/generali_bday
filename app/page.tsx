import type { Metadata } from "next";
import { Experience } from "@/components/Experience";

function readName(raw: string | string[] | undefined) {
  const v = Array.isArray(raw) ? raw[0] : raw;
  return (v ?? "").trim().slice(0, 32);
}

export async function generateMetadata({ searchParams }: PageProps<"/">): Promise<Metadata> {
  const name = readName((await searchParams).name);
  return {
    title: name ? `Happy birthday, ${name} — from Generali` : "A birthday surprise from Generali",
  };
}

/** Personalise with ?name=Maria. Add &debug=1 to see live mic levels. */
export default async function Page({ searchParams }: PageProps<"/">) {
  const sp = await searchParams;
  return <Experience name={readName(sp.name)} debug={sp.debug === "1"} />;
}
