import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // 1) Lire le montant
    const amount = Number(body.amount);
    if (!amount || amount < 1) {
      return NextResponse.json(
        { ok: false, error: "Montant invalide" },
        { status: 400 }
      );
    }

    // 2) Vérifier que les clés PayTech existent dans Vercel
    const API_KEY = process.env.PAYTECH_API_KEY || "";
    const API_SECRET = process.env.PAYTECH_API_SECRET || "";
    if (!API_KEY || !API_SECRET) {
      return NextResponse.json(
        { ok: false, error: "Clés PayTech manquantes dans Vercel (PAYTECH_API_KEY / PAYTECH_API_SECRET)" },
        { status: 500 }
      );
    }

    // 3) Appel PayTech (demande de paiement)
    // NOTE: si ton endpoint PayTech est différent dans ton compte, dis-moi,
    // mais d’après ta capture, PayTech renvoie bien token + redirect_url.
    const paytechRes = await fetch("https://paytech.sn/api/payment/request-payment", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "API_KEY": API_KEY,
        "API_SECRET": API_SECRET,
      },
      body: JSON.stringify({
        item_name: "Depot SosoBoost",
        item_price: amount,
        currency: "XOF",
        ref_command: `DEPOT_${Date.now()}`,
      }),
    });

    const data = await paytechRes.json();

    // 4) IMPORTANT: PayTech renvoie redirect_url / redirectUrl (pas payment_url)
    const payUrl = data.redirect_url || data.redirectUrl;
    if (!payUrl) {
      return NextResponse.json(
        { ok: false, error: "PayTech: lien de paiement introuvable", details: data },
        { status: 500 }
      );
    }

    // 5) Réponse OK
    return NextResponse.json({
      ok: true,
      pay_url: payUrl,
      token: data.token || null,
      paytech: data,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Erreur serveur" },
      { status: 500 }
    );
  }
}
