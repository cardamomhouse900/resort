"use client";

import { createContext, useActionState, useContext, useEffect, useRef, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { initialFormState, type FormState } from "@/lib/form";

/**
 * Admin form primitives. <AdminForm> wires a Server Action through
 * useActionState and shares field errors with the inputs below it, so each
 * field shows its own message without prop drilling.
 */

const ErrorsContext = createContext<Record<string, string>>({});

type Action = (state: FormState, form: FormData) => Promise<FormState>;

export function AdminForm({
  action,
  children,
  className = "",
  resetOnSuccess = false,
}: {
  action: Action;
  children: ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
}) {
  const [state, formAction] = useActionState(action, initialFormState);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok && resetOnSuccess) ref.current?.reset();
  }, [state, resetOnSuccess]);

  return (
    <form ref={ref} action={formAction} className={className} noValidate>
      <ErrorsContext.Provider value={state.errors ?? {}}>
        {state.message && (
          <p
            role={state.ok ? "status" : "alert"}
            className={`mb-5 rounded-lg px-4 py-3 text-sm ${state.ok ? "bg-forest/10 text-forest" : "bg-earth/10 text-earth"}`}
          >
            {state.message}
          </p>
        )}
        {children}
      </ErrorsContext.Provider>
    </form>
  );
}

export function useFieldError(name: string) {
  return useContext(ErrorsContext)[name];
}

const inputBase =
  "mt-1.5 block w-full rounded-lg border bg-white px-3 py-2.5 text-[0.9375rem] text-ink focus:border-forest focus:ring-2 focus:ring-forest/15 focus:outline-none";

function Wrapper({
  name,
  label,
  hint,
  children,
  className = "",
}: {
  name: string;
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  const error = useFieldError(name);
  return (
    <label className={`block ${className}`}>
      <span className="text-forest text-sm font-semibold">{label}</span>
      {children}
      {error ? (
        <span className="text-earth mt-1 block text-sm">{error}</span>
      ) : (
        hint && <span className="text-ink-muted mt-1 block text-xs">{hint}</span>
      )}
    </label>
  );
}

type InputProps = {
  name: string;
  label: string;
  hint?: string;
  className?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "name">;

export function TextField({ name, label, hint, className, ...rest }: InputProps) {
  const error = useFieldError(name);
  return (
    <Wrapper name={name} label={label} hint={hint} className={className}>
      <input
        name={name}
        aria-invalid={!!error}
        className={`${inputBase} ${error ? "border-earth" : "border-line"}`}
        {...rest}
      />
    </Wrapper>
  );
}

export function TextArea({
  name,
  label,
  hint,
  className,
  ...rest
}: { name: string; label: string; hint?: string; className?: string } & Omit<
  React.TextareaHTMLAttributes<HTMLTextAreaElement>,
  "name"
>) {
  const error = useFieldError(name);
  return (
    <Wrapper name={name} label={label} hint={hint} className={className}>
      <textarea
        name={name}
        aria-invalid={!!error}
        className={`${inputBase} ${error ? "border-earth" : "border-line"}`}
        {...rest}
      />
    </Wrapper>
  );
}

export function SelectField({
  name,
  label,
  hint,
  className,
  options,
  ...rest
}: {
  name: string;
  label: string;
  hint?: string;
  className?: string;
  options: { value: string; label: string }[];
} & Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "name">) {
  const error = useFieldError(name);
  return (
    <Wrapper name={name} label={label} hint={hint} className={className}>
      <select
        name={name}
        aria-invalid={!!error}
        className={`${inputBase} ${error ? "border-earth" : "border-line"}`}
        {...rest}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Wrapper>
  );
}

export function Checkbox({
  name,
  label,
  defaultChecked,
  hint,
}: {
  name: string;
  label: string;
  defaultChecked?: boolean;
  hint?: string;
}) {
  return (
    <label className="flex items-start gap-3 text-[0.9375rem]">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="accent-forest mt-0.5 size-5 shrink-0"
      />
      <span>
        <span className="text-forest font-semibold">{label}</span>
        {hint && <span className="text-ink-muted block text-xs">{hint}</span>}
      </span>
    </label>
  );
}

export function SubmitButton({
  children,
  variant = "primary",
  confirm,
  pendingText = "Saving…",
}: {
  children: ReactNode;
  variant?: "primary" | "danger" | "secondary";
  confirm?: string;
  pendingText?: string;
}) {
  const { pending } = useFormStatus();
  const styles = {
    primary: "bg-forest text-cream hover:bg-mountain",
    secondary: "text-forest ring-1 ring-forest/30 hover:bg-beige",
    danger: "bg-earth text-white hover:bg-earth/90",
  }[variant];
  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
      className={`inline-flex min-h-11 items-center justify-center rounded-full px-6 text-sm font-semibold transition-colors disabled:opacity-60 ${styles}`}
    >
      {pending ? pendingText : children}
    </button>
  );
}

export function FormError({ name }: { name: string }) {
  const error = useFieldError(name);
  return error ? <p className="text-earth mt-1 text-sm">{error}</p> : null;
}
