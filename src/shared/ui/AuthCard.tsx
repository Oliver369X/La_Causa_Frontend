"use client";

import Link from "next/link";
import { motion } from "framer-motion";

interface AuthCardProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}

export function AuthCard({ title, subtitle, children, footer }: AuthCardProps) {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 transition-colors duration-200"
      style={{ background: "var(--bg)", color: "var(--text)" }}
    >
      {/* Ambient glow */}
      <div
        className="pointer-events-none fixed -top-40 -left-40 w-[600px] h-[600px] rounded-full blur-[120px] -z-10"
        style={{ background: "var(--glow-a)" }}
      />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="w-full max-w-md"
      >
        <Link href="/" className="flex items-center justify-center gap-2 font-semibold mb-10">
          <span className="w-6 h-6 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 inline-block" />
          La Causa AI
        </Link>

        <div
          className="rounded-3xl p-8 sm:p-10"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
          <h1 className="text-2xl font-bold text-center mb-1">{title}</h1>
          <p className="text-sm text-center mb-8" style={{ color: "var(--text-muted)" }}>{subtitle}</p>
          {children}
          <div className="mt-6 text-center text-sm" style={{ color: "var(--text-muted)" }}>
            {footer}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

interface FieldProps {
  label: string;
  children: React.ReactNode;
}

export function Field({ label, children }: FieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>
        {label}
      </label>
      {children}
    </div>
  );
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  "data-testid"?: string;
}

export function Input(props: InputProps) {
  return (
    <input
      {...props}
      className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-colors"
      style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}
    />
  );
}

interface SubmitBtnProps {
  loading: boolean;
  label: string;
  loadingLabel: string;
  "data-testid"?: string;
}

export function SubmitBtn({ loading, label, loadingLabel, ...rest }: SubmitBtnProps) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="w-full py-3 rounded-full font-semibold text-sm transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
      style={{ background: "var(--text)", color: "var(--bg)" }}
      {...rest}
    >
      {loading ? loadingLabel : label}
    </button>
  );
}
