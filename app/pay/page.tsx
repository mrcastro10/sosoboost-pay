export default function PayPage() {
  return (
    <main style={{ maxWidth: 520, margin: "40px auto", fontFamily: "Arial", padding: 16 }}>
      <h2>Déposer avec PayTech</h2>

      <form method="POST" action="/api/create-payment" style={{ display: "grid", gap: 10 }}>
        <label>
          Login Socpanel
          <input name="login" required style={{ width: "100%", padding: 10 }} />
        </label>

        <label>
          Montant (FCFA)
          <input name="amount_fcfa" type="number" min={1} required style={{ width: "100%", padding: 10 }} />
        </label>

        <button type="submit" style={{ padding: 12, fontWeight: 700 }}>
          Payer maintenant
        </button>
      </form>
    </main>
  );
}
