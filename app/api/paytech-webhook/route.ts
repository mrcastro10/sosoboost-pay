import { NextResponse } from "next/server";

function parseBodySmart(raw: string) {
  try {
    return JSON.parse(raw);
  } catch {
    const params = new URLSearchParams(raw);
    const obj: Record<string, any> = {};
    for (const [k, v] of params.entries()) obj[k] = v;
    return obj;
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, message: "paytech-webhook alive" });
}

export async function POST(req: Request) {
  try {
    const raw = await req.text();
    const body = raw ? parseBodySmart(raw) : {};

    // PayTech IPN peut envoyer plein de champs.
    // On récupère ref_command qu’on a créé: SB_timestamp_user_amount
    const ref = String(body.ref_command || body.refCommand || "");
    const parts = ref.split("_");

    if (parts.length < 4) {
      return NextResponse.json(
        { ok: false, error: "ref_command manquant ou invalide", received: body },
        { status: 400 }
      );
    }

    const user_id = Number(parts[2]);
    const amount = Number(parts[3]);

    // Selon PayTech: statut succès (ex: success=1, status=completed, etc.)
    // On accepte success=1 si présent, sinon on continue quand même (simple)
    const successFlag = body.success ?? body.status ?? body.payment_status;
    if (successFlag === "0" || successFlag === 0) {
      return NextResponse.json({ ok: true, ignored: true, reason: "payment not success" });
    }

    if (!user_id || !amount) {
      return NextResponse.json(
        { ok: false, error: "user_id/amount invalide depuis ref_command", ref },
        { status: 400 }
      );
    }

    const SOCPANEL_PRIVATE_API_BASE =
      process.env.SOCPANEL_PRIVATE_API_BASE || "https://socpanel.com/privateApi";
    const SOCPANEL_TOKEN = process.env.SOCPANEL_TOKEN;

    if (!SOCPANEL_TOKEN) {
      return NextResponse.json(
        { ok: false, error: "SOCPANEL_TOKEN manquant dans Vercel" },
        { status: 500 }
      );
    }

    // Appel SocPanel: incrementUserBalance
    // (Souvent token dans header. On met aussi en query token en plus -> compatible)
    const url = new URL(`${SOCPANEL_PRIVATE_API_BASE}/incrementUserBalance`);
    url.searchParams.set("user_id", String(user_id));
    url.searchParams.set("amount", String(amount));
    url.searchParams.set("token", SOCPANEL_TOKEN); // fallback si SocPanel le lit en query

    const r = await fetch(url.toString(), {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${SOCPANEL_TOKEN}`,
        "x-api-key": SOCPANEL_TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ user_id, amount }),
    });

    const soc = await r.json().catch(() => ({}));

    if (!soc?.ok && soc?.ok !== true) {
      return NextResponse.json(
        { ok: false, error: "SocPanel credit failed", socpanel: soc },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, credited: true, user_id, amount, socpanel: soc });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Erreur webhook" },
      { status: 500 }
    );
  }
}
