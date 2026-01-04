import { NextResponse } from "next/server";

export async function GET() {
  // Juste pour tester dans le navigateur (doit répondre OK et non 404)
  return NextResponse.json({ ok: true, message: "paytech-webhook alive" });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Pour l’instant on confirme juste que PayTech nous appelle bien.
    // (On branchera le crédit Socpanel juste après, une fois que ça marche.)
    return NextResponse.json({ ok: true, received: body });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: "invalid_json", details: String(e?.message || e) },
      { status: 400 }
    );
  }
}
