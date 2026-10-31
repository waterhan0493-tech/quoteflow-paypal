import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { INITIAL_PRESETS, type PresetId } from "@/data/industries";
import { createMyBusiness, signIn, signInDemo, signUp } from "@/lib/auth";

type Mode = "signin" | "signup";

const inputClass =
  "w-full rounded-xl border border-line px-3.5 py-2.5 font-semibold bg-white outline-none focus:border-brand focus:shadow-[inset_0_0_0_1px_#0070E0]";

function errorText(err: unknown): string {
  return err instanceof Error ? err.message : "Something went wrong. Please try again.";
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas text-ink flex flex-col items-center px-5 py-10">
      <a href="/" aria-label="QuoteFlow home" className="mb-8">
        <BrandMark />
      </a>
      <div className="w-full max-w-[400px] bg-white border border-line rounded-[18px] p-6 sm:p-7">{children}</div>
    </div>
  );
}

function Field({
  id,
  label,
  hint,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-[13px] font-bold text-muted">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}

function SubmitButton({ busy, children }: { busy: boolean; children: ReactNode }) {
  return (
    <button
      type="submit"
      disabled={busy}
      className="w-full rounded-full bg-brand text-white py-3 font-extrabold hover:bg-brand-dark disabled:opacity-60 flex items-center justify-center gap-2"
    >
      {busy && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  );
}

/** Sign in, create an account with its booking page, or open the shared demo account. */
export function SignIn({ demoAvailable }: { demoAvailable: boolean }) {
  const [mode, setMode] = useState<Mode>("signin");
  const [businessName, setBusinessName] = useState("");
  const [industry, setIndustry] = useState<PresetId>("cleaning");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<"form" | "demo" | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    document.title = (mode === "signin" ? "Sign in" : "Create your booking page") + " · QuoteFlow";
  }, [mode]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy("form");
    setError("");
    try {
      if (mode === "signin") await signIn(email, password);
      else await signUp(email, password, { ...INITIAL_PRESETS[industry], businessName: businessName.trim() });
      // The dashboard takes over when the session changes.
    } catch (err) {
      setError(errorText(err));
      setBusy(null);
    }
  };

  const useDemo = async () => {
    setBusy("demo");
    setError("");
    try {
      await signInDemo();
    } catch (err) {
      setError(errorText(err));
      setBusy(null);
    }
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setError("");
  };

  return (
    <Shell>
      <div className="space-y-1.5 mb-6">
        <h1 className="text-[28px] leading-tight font-black tracking-tight">
          {mode === "signin" ? "Sign in" : "Create your booking page"}
        </h1>
        <p className="text-muted text-[15px]">
          {mode === "signin"
            ? "See your bookings, deposits and prices."
            : "Customers quote themselves from your prices and pay a deposit to book."}
        </p>
      </div>

      <form onSubmit={submit} className="space-y-4">
        {mode === "signup" && (
          <>
            <Field id="su-name" label="Business name">
              <input
                id="su-name"
                required
                minLength={2}
                maxLength={80}
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field id="su-type" label="Type of work" hint="Starts you with typical prices. You can change every one.">
              <select
                id="su-type"
                value={industry}
                onChange={(e) => setIndustry(e.target.value as PresetId)}
                className={inputClass}
              >
                {Object.values(INITIAL_PRESETS).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </Field>
          </>
        )}
        <Field id="auth-email" label="Email">
          <input
            id="auth-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field id="auth-password" label="Password" hint={mode === "signup" ? "At least 8 characters." : undefined}>
          <input
            id="auth-password"
            type="password"
            required
            minLength={mode === "signup" ? 8 : undefined}
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
          />
        </Field>
        {error && (
          <p role="alert" className="rounded-[12px] bg-[#FDECEC] text-[#8A1C1C] text-sm font-semibold px-3.5 py-2.5">
            {error}
          </p>
        )}
        <SubmitButton busy={busy === "form"}>{mode === "signin" ? "Sign in" : "Create my booking page"}</SubmitButton>
      </form>

      <p className="mt-5 text-sm text-center text-muted">
        {mode === "signin" ? "New to QuoteFlow? " : "Already have an account? "}
        <button
          type="button"
          onClick={() => switchMode(mode === "signin" ? "signup" : "signin")}
          className="font-bold text-brand hover:underline"
        >
          {mode === "signin" ? "Create your booking page" : "Sign in"}
        </button>
      </p>

      {demoAvailable && (
        <div className="mt-6 pt-5 border-t border-line space-y-3">
          <p className="text-sm text-muted">Just looking? The demo account runs a sample cleaning business.</p>
          <button
            type="button"
            onClick={useDemo}
            disabled={busy !== null}
            className="w-full rounded-full py-3 font-extrabold shadow-[inset_0_0_0_1.5px_#001435] hover:bg-canvas disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {busy === "demo" && <Loader2 className="w-4 h-4 animate-spin" />}
            Use the demo account
          </button>
        </div>
      )}
    </Shell>
  );
}

/** Shown when an account exists without a business (for example, the demo owner on a fresh database). */
export function CreateBusiness({ demo, onCreated }: { demo: boolean; onCreated: () => void }) {
  const [businessName, setBusinessName] = useState(demo ? INITIAL_PRESETS.cleaning.businessName : "");
  const [industry, setIndustry] = useState<PresetId>("cleaning");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const started = useRef(false);

  const create = async (name: string, type: PresetId) => {
    setBusy(true);
    setError("");
    try {
      await createMyBusiness({ ...INITIAL_PRESETS[type], businessName: name.trim() });
      onCreated();
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  };

  // The demo owner needs no choices: set up the sample business right away.
  useEffect(() => {
    if (demo && !started.current) {
      started.current = true;
      create(INITIAL_PRESETS.cleaning.businessName, "cleaning");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demo]);

  return (
    <Shell>
      <h1 className="text-[28px] leading-tight font-black tracking-tight mb-6">Set up your business</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          create(businessName, industry);
        }}
        className="space-y-4"
      >
        <Field id="cb-name" label="Business name">
          <input
            id="cb-name"
            required
            minLength={2}
            maxLength={80}
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field id="cb-type" label="Type of work">
          <select
            id="cb-type"
            value={industry}
            onChange={(e) => setIndustry(e.target.value as PresetId)}
            className={inputClass}
          >
            {Object.values(INITIAL_PRESETS).map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </Field>
        {error && (
          <p role="alert" className="rounded-[12px] bg-[#FDECEC] text-[#8A1C1C] text-sm font-semibold px-3.5 py-2.5">
            {error}
          </p>
        )}
        <SubmitButton busy={busy}>Create my booking page</SubmitButton>
      </form>
    </Shell>
  );
}
