import { NextResponse } from "next/server";
import { getHeroes } from "@/lib/lookup";
import { slugify } from "@/lib/slug";

export const dynamic = "force-dynamic";

/** Redirige a la ficha de un héroe jugable al azar. */
export async function GET(req: Request) {
  const heroes = await getHeroes();
  const pick = heroes[Math.floor(Math.random() * heroes.length)];
  return NextResponse.redirect(new URL(pick ? `/heroes/${slugify(pick.name)}` : "/heroes", req.url), 307);
}
