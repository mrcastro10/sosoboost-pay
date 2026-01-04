// app/api/paytech-webhook/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    // ⚠️ Ici aussi: adapte selon le JSON réel envoyé par PayTech
    const status = body?.status; // ex: "success"
    const customFieldRaw = body?.custom_field || body?.customField;

    let custom: any = {};
    try { custom = typeof customFieldRaw === "string" ? JSON.parse(customFieldRaw) : (customFieldRaw || {}); } catch {}

    const user_id = Number(custom?.user_id);
    const amount = Number(custom?.amount);

    if (status !== "success") {
      return NextResponse.json({ ok: true, ignored: true }); // on ignore si pas payé
    }
    if (!Number.isFinite(user_id) || !Number.isFinite(amount)) {
      return NextResponse.json({ ok: false, error: "custom_field invalide" }, { status: 400 });
    }

    // Créditer SocPanel
    const SOCPANEL_BASE = process.env.SOCPANEL_PRIVATE_API_URL || "https://socpanel.com/privateApi";
    const SOCPANEL_TOKEN = process.env.SOCPANEL_ADMIN_TOKEN!;

    const url = `${SOCPANEL_BASE}/incrementUserBalance?user_id=${encodeURIComponent(
      String(user_id)
    )}&amount=${encodeURIComponent(String(amount))}&token=${encodeURIComponent(SOCPANEL_TOKEN)}`;

    const r = await fetch(url, { method: "GET" });
    const data = await r.json().catch(() => ({}));

    return NextResponse.json({ ok: true, socpanel: data });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Erreur webhook" }, { status: 500 });
  }
}
