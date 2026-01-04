import { NextResponse } from "next/server";

function parseBodySmart(raw: string) {
  // 1) Try JSON
  try {
    return JSON.parse(raw);
  } catch {
    // 2) Try form-urlencoded: user_id=1&amount=500
    const params = new URLSearchParams(raw);
    const obj: Record<string, any> = {};
    for (const [k, v] of params.entries()) obj[k] = v;
    return obj;
  }
}

export async function OPTIONS() {
  // CORS preflight
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

export async function POST(req: Request) {
  try {
    const raw = await req.text();
    const body = raw ? parseBodySmart(raw) : {};

    const user_id = Number(body.user_id ?? body.userId);
    const amount = Number(body.amount);

    if (!user_id || !amount || amount <= 0) {
      return NextResponse.json(
        { ok: false, error: "user_id ou amount invalide" },
        { status: 400 }
      );
    }

    const PAYTECH_API_KEY = process.env.PAYTECH_API_KEY!;
    const PAYTECH_API_SECRET = process.env.PAYTECH_API_SECRET!;
    const PAYTECH_BASE_URL = process.env.PAYTECH_BASE_URL || "https://paytech.sn/api";
    const APP_BASE_URL = process.env.APP_BASE_URL || "https://sosoboost-pay.vercel.app";

    // On met les infos dans ref_command pour que le webhook retrouve user_id + amount
    const ref_command = `SB_${Date.now()}_${user_id}_${amount}`;

    // IMPORTANT: redirections sur Vercel (PAS sur ton ancien hébergeur)
    const success_url = `${APP_BASE_URL}/success`;
    const cancel_url = `${APP_BASE_URL}/cancel`;

    // PayTech (exemple standard)
    const payload = {
      item_name: "Depot SosoBoost",
      item_price: amount,
      currency: "XOF",
      ref_command,
      env: "prod",
      ipn_url: `${APP_BASE_URL}/api/paytech-webhook`,
      success_url,
      cancel_url,
    };

    const r = await fetch(`${PAYTECH_BASE_URL}/payment/request-payment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Selon PayTech, ça peut être API_KEY / API_SECRET en header
        "API_KEY": PAYTECH_API_KEY,
        "API_SECRET": PAYTECH_API_SECRET,
      },
      body: JSON.stringify(payload),
    });

    const data = await r.json().catch(() => ({}));

    if (!data || data.success !== 1 || !data.redirect_url) {
      return NextResponse.json(
        { ok: false, error: "PayTech: lien de paiement introuvable", details: data },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { ok: true, pay_url: data.redirect_url, token: data.token, paytech: data },
      {
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Erreur serveur" },
      { status: 500 }
    );
  }
}
