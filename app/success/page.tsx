export default function SuccessPage() {
  return (
    <main style={{ fontFamily: "Arial, sans-serif", padding: 24, maxWidth: 720, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>✅ Paiement réussi</h1>
      <p style={{ fontSize: 16, lineHeight: 1.5 }}>
        Merci ! Votre paiement a été reçu.
        <br />
        Votre solde sera crédité automatiquement.
      </p>

      <div style={{ marginTop: 20, padding: 12, background: "#f6f7f9", borderRadius: 8 }}>
        <p style={{ margin: 0 }}>
          Vous pouvez maintenant retourner sur SosoBoost et passer votre commande.
        </p>
      </div>
    </main>
  );
}
