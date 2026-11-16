export default function HomePage() {
  return (
    <>
      <section>
        <h1>Söö esimesena</h1>
        <p className="muted">Tooted, mis aeguvad kõige varem, on nimekirjas eespool.</p>
      </section>

      <section className="card empty">
        <p>Külmkapp on veel tühi.</p>
        <p className="muted">Toodete lisamine tuleb järgmises etapis.</p>
      </section>
    </>
  );
}
