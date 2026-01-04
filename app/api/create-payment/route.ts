// app/api/create-payment/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Optionnel: si tu veux autoriser CORS (utile pour tests en fetch, mais SocPanel via <form> n'en a pas besoin)
function corsHeaders(origin?: string) {
  const allowed = new Set([
    "https://socpanel.com",
    "https://sosoboost.com",
    "https://www.sosoboost.com",
  ]);
  const o = origin && allowed.has(origin) ? origin : "https://sosoboost.com";
  return {
    "Access-Control-Allow-Origin": o,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export async function OPTIONS(req: Request) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req.headers.get("origin") || undefined) });
}

export async function POST(req: Request) {
  try {
    const origin = req.headers.get("origin") || undefined;

    // 1) Lire les données envoyées par SocPanel (FORM)
    const contentType = req.headers.get("content-type") || "";
    let user_id = "";
    let amount = "";
    let phone = "";

    if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      user_id = String(form.get("user_id") || "");
      amount = String(form.get("amount") || "");
      phone = String(form.get("phone") || "");
    } else {
      const body = await req.json().catch(() => ({}));
      user_id = String(body.user_id || "");
      amount = String(body.amount || "");
      phone = String(body.phone || "");
    }

    const userIdNum = Number(user_id);
    const amountNum = Number(amount);

    if (!Number.isFinite(userIdNum) || userIdNum <= 0) {
      return NextResponse.json({ ok: false, error: "user_id invalide" }, { status: 400, headers: corsHeaders(origin) });
    }
    if (!Number.isFinite(amountNum) || amountNum < 500) {
      return NextResponse.json({ ok: false, error: "Montant minimum = 500 FCFA" }, { status: 400, headers: corsHeaders(origin) });
    }

    // 2) Créer une référence unique (important pour retrouver le user_id au webhook)
    const ref = `SB-${userIdNum}-${Date.now()}`;

    // 3) Appeler PayTech côté serveur (NE PAS mettre les clés dans le HTML)
    // ⚠️ Ici, je mets une structure "type" : tu gardes les bons champs exacts selon la doc PayTech que tu as.
    const PAYTECH_BASE = "https://paytech.sn/api";
    const API_KEY = process.env.PAYTECH_API_KEY!;
    const API_SECRET = process.env.PAYTECH_API_SECRET!;

    // IMPORTANT: success/cancel = ton site
    const success_url = "https://sosoboost.com/pay/success";
    const cancel_url = "https://sosoboost.com/pay/cancel";

    const payload = {
      item_name: "Depot SosoBoost",
      item_price: amountNum,
      currency: "XOF",
      ref_command: ref,
      command_name: `Depot user ${userIdNum}`,
      success_url,
      cancel_url,
      // Très important: stocker user_id pour le webhook
      custom_field: JSON.stringify({ user_id: userIdNum, amount: amountNum, phone }),
    };

    const r = await fetch(`${PAYTECH_BASE}/payment/requestPayment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "API_KEY": API_KEY,
        "API_SECRET": API_SECRET,
      },
      body: JSON.stringify(payload),
    });

    const data = await r.json().catch(() => ({}));

    // PayTech renvoie souvent un lien de paiement ou un token.
    // Adapte la clé selon ta réponse réelle: ex: data.redirect_url / data.payment_url / data.token
    const payUrl =
      data?.redirect_url || data?.payment_url || data?.url;

    if (!payUrl) {
      return NextResponse.json(
        { ok: false, error: "PayTech: lien de paiement introuvable", details: data },
        { status: 500, headers: corsHeaders(origin) }
      );
    }

    // 4) SUPER IMPORTANT pour SocPanel: REDIRECT direct (pas de fetch, pas de CORS)
    const res = NextResponse.redirect(payUrl, 302);
    Object.entries(corsHeaders(origin)).forEach(([k, v]) => res.headers.set(k, v));
    return res;

  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Erreur serveur" }, { status: 500 });
  }
}
