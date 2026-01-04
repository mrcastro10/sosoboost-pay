export default function FailedPage() {
  return (
    <main style={{ maxWidth: 520, margin: "40px auto", fontFamily: "Arial", padding: 16 }}>
      <h2>Paiement échoué ❌</h2>
      <p>Veuillez réessayer.</p>
      <a href="/pay">Revenir au dépôt</a>
    </main>
  );
}
