import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get("content-type") || "";

    // 1) Lire le body en JSON si possible, sinon en texte (form-urlencoded)
    let body: any = {};
    if (contentType.includes("application/json")) {
      body = await req.json();
    } else {
      const text = await req.text(); // ex: "user_id=7&amount=500"
      const params = new URLSearchParams(text);
      body = {
        user_id: params.get("user_id"),
        amount: params.get("amount"),
      };
    }

    // 2) Nettoyer et valider
    const user_id = Number(body.user_id);
    const amount = Number(body.amount);

    if (!Number.isFinite(user_id) || user_id <= 0) {
      return NextResponse.json({ ok: false, error: "user_id invalide" }, { status: 400 });
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ ok: false, error: "amount invalide" }, { status: 400 });
    }

    // 3) Appel PayTech (via ton API existant)
    const apiKey = process.env.PAYTECH_API_KEY!;
    const apiSecret = process.env.PAYTECH_API_SECRET!;
    const paytechBaseUrl = process.env.PAYTECH_BASE_URL || "https://paytech.sn/api";

    if (!apiKey || !apiSecret) {
      return NextResponse.json({ ok: false, error: "PAYTECH keys manquantes" }, { status: 500 });
    }

    const ref = `SB-${user_id}-${Date.now()}`;

    // IMPORTANT: PayTech demande souvent form-urlencoded
    const payload = new URLSearchParams();
    payload.append("item_name", "Recharge SosoBoost");
    payload.append("item_price", String(amount));
    payload.append("command_name", ref);

    const paytechRes = await fetch(`${paytechBaseUrl}/payment/request-payment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "API_KEY": apiKey,
        "API_SECRET": apiSecret,
      },
      body: payload.toString(),
    });

    const paytechData = await paytechRes.json().catch(() => ({}));

    // Selon PayTech, le lien est souvent dans redirect_url / redirectUrl
    const payUrl = paytechData.redirect_url || paytechData.redirectUrl;

    if (!payUrl) {
      return NextResponse.json(
        { ok: false, error: "PayTech: lien de paiement introuvable", details: paytechData },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      pay_url: payUrl,
      token: paytechData.token,
      paytech: paytechData,
      ref,
      user_id,
      amount,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: `Unexpected error: ${e?.message || "unknown"}` },
      { status: 500 }
    );
  }
}
