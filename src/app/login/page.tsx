import { login, signup } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;

  return (
    <>
      <section>
        <h1>Logi sisse</h1>
        <p className="muted">Uus kasutaja? Täida väljad ja vajuta „Loo konto“.</p>
      </section>

      {error && <p className="alert alert-error">{error}</p>}
      {message && <p className="alert">{message}</p>}

      <form className="card form">
        <label>
          E-post
          <input name="email" type="email" required autoComplete="email" />
        </label>
        <label>
          Parool
          <input name="password" type="password" required minLength={6} autoComplete="current-password" />
        </label>
        <label>
          Nimi <span className="muted">(ainult uuele kontole, valikuline)</span>
          <input name="display_name" type="text" maxLength={50} autoComplete="given-name" />
        </label>
        <div className="row">
          <button formAction={login} className="btn btn-primary">
            Logi sisse
          </button>
          <button formAction={signup} className="btn">
            Loo konto
          </button>
        </div>
      </form>
    </>
  );
}
