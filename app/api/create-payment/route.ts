import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    // Juste pour valider le déploiement (on branchera PayTech après)
    return NextResponse.json({
      ok: true,
      message: "create-payment endpoint is working",
      received: body,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
