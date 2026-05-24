"use client";

import { type Variants, motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight, Bot, Zap, Shield, BarChart, Users,
  Sun, Moon, Menu, X, Check,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useTheme } from "@/shared/store/themeStore";
import { LANDING_PRICING_PLANS } from "@/shared/config/pricingPlans";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.55, ease: "easeOut", delay: i * 0.08 },
  }),
};

const features = [
  { icon: Bot,      title: "Matching IA",          desc: "Asigna automáticamente el voluntario ideal basándose en habilidades, disponibilidad y historial." },
  { icon: Zap,      title: "Predicción de Demanda", desc: "Anticipa cuántos recursos necesitarás con modelos de Machine Learning entrenados en tus datos." },
  { icon: Shield,   title: "Validación Automática", desc: "Verifica asistencia y cumplimiento mediante geolocalización y análisis de evidencia fotográfica." },
  { icon: BarChart, title: "Analítica Avanzada",    desc: "Métricas en tiempo real: horas donadas, tasa de completion y rendimiento por equipo." },
  { icon: Users,    title: "RBAC Multi-tenant",     desc: "Roles granulares (owner, admin, coordinador) con espacios de trabajo completamente aislados." },
  { icon: Bot,      title: "Agente Conversacional", desc: "Chat IA integrado para guiar a voluntarios, responder preguntas y ejecutar acciones operativas." },
];

const logos = ["Cruz Roja", "UNICEF", "Hábitat", "Médicos Sin F.", "Ashoka"];

export default function LandingPage() {
  const { theme, toggle } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen overflow-x-hidden transition-colors duration-200"
         style={{ background: "var(--bg)", color: "var(--text)" }}>

      {/* ── Ambient glows ────────────────────────────────────── */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden -z-10">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full blur-[120px]"
             style={{ background: "var(--glow-a)" }} />
        <div className="absolute -bottom-40 -right-40 w-[600px] h-[600px] rounded-full blur-[120px]"
             style={{ background: "var(--glow-b)" }} />
      </div>

      {/* ── Navbar ────────────────────────────────────────────── */}
      <header className="fixed top-0 inset-x-0 z-50 border-b backdrop-blur-md"
              style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--bg) 80%, transparent)" }}>
        <div className="max-w-6xl mx-auto px-5 h-15 flex items-center justify-between gap-4">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 font-semibold text-base shrink-0">
            <span className="w-6 h-6 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 inline-block" />
            La Causa AI
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium" style={{ color: "var(--text-muted)" }}>
            <Link href="#features" className="hover:text-[var(--text)] transition-colors">Características</Link>
            <Link href="#pricing"  className="hover:text-[var(--text)] transition-colors">Precios</Link>
            <Link href="#logos"    className="hover:text-[var(--text)] transition-colors">Clientes</Link>
          </nav>

          {/* Desktop actions */}
          <div className="hidden md:flex items-center gap-3">
            <button
              data-testid="theme-toggle"
              onClick={toggle}
              aria-label="Cambiar tema"
              className="p-2 rounded-lg transition-colors hover:opacity-70"
              style={{ border: "1px solid var(--border)" }}
            >
              {theme === "dark"
                ? <Sun className="w-4 h-4" />
                : <Moon className="w-4 h-4" />}
            </button>
            <Link href="/login" className="text-sm px-4 py-2 rounded-full transition-colors hover:opacity-70"
                  style={{ color: "var(--text-muted)" }}>
              Iniciar Sesión
            </Link>
            <Link href="/register"
                  className="text-sm px-4 py-2 rounded-full font-medium transition-all hover:scale-105"
                  style={{ background: "var(--text)", color: "var(--bg)" }}>
              Comenzar →
            </Link>
          </div>

          {/* Mobile controls */}
          <div className="flex md:hidden items-center gap-2">
            <button onClick={toggle} className="p-2 rounded-lg" style={{ border: "1px solid var(--border)" }}>
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              data-testid="mobile-menu-btn"
              onClick={() => setMobileOpen((o) => !o)}
              className="p-2 rounded-lg"
              style={{ border: "1px solid var(--border)" }}
            >
              {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t px-5 py-4 flex flex-col gap-3 text-sm"
              style={{ borderColor: "var(--border)", background: "var(--bg)" }}
            >
              {["#features", "#pricing", "#logos"].map((href, i) => (
                <Link key={href} href={href}
                      onClick={() => setMobileOpen(false)}
                      className="py-2 font-medium"
                      style={{ color: "var(--text-muted)" }}>
                  {["Características", "Precios", "Clientes"][i]}
                </Link>
              ))}
              <hr style={{ borderColor: "var(--border)" }} />
              <Link href="/login"    className="py-2">Iniciar Sesión</Link>
              <Link href="/register" className="py-2 font-semibold" style={{ color: "var(--accent)" }}>
                Comenzar gratis →
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* ── Hero ──────────────────────────────────────────────── */}
      <section className="pt-36 pb-24 px-5 max-w-6xl mx-auto flex flex-col items-center text-center">
        <motion.div variants={fadeUp} custom={0} initial="hidden" animate="visible"
          className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-full mb-8 font-medium"
          style={{ border: "1px solid var(--border)", color: "var(--text-muted)", background: "var(--bg-subtle)" }}>
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          Motor IA v2.0 en producción
        </motion.div>

        <motion.h1 variants={fadeUp} custom={1} initial="hidden" animate="visible"
          className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.08] mb-6 max-w-4xl">
          LA CAUSA Premium para{" "}
          <span className="bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text text-transparent">
            organizaciones con propósito.
          </span>
        </motion.h1>

        <motion.p variants={fadeUp} custom={2} initial="hidden" animate="visible"
          className="text-base sm:text-lg max-w-xl mb-10 leading-relaxed"
          style={{ color: "var(--text-muted)" }}>
          Automatiza la asignación de voluntarios, predice necesidades operativas y centraliza la gestión de eventos — todo con IA.
        </motion.p>

        <motion.div variants={fadeUp} custom={3} initial="hidden" animate="visible"
          className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <Link href="/register"
                className="flex items-center justify-center gap-2 px-7 py-3.5 rounded-full font-semibold text-sm hover:scale-105 transition-transform"
                style={{ background: "var(--text)", color: "var(--bg)" }}>
            Prueba gratuita <ArrowRight className="w-4 h-4" />
          </Link>
          <Link href="#features"
                className="flex items-center justify-center gap-2 px-7 py-3.5 rounded-full font-medium text-sm hover:opacity-80 transition-opacity"
                style={{ border: "1px solid var(--border)", color: "var(--text-muted)" }}>
            Ver características
          </Link>
        </motion.div>

        {/* Mock screenshot */}
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.45, duration: 0.8 }}
          className="mt-20 w-full max-w-5xl aspect-video rounded-2xl overflow-hidden relative shadow-2xl"
          style={{ border: "1px solid var(--border)", background: "var(--bg-subtle)" }}>
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg)]/70 to-transparent z-10" />
          {/* Fake UI skeleton */}
          <div className="absolute inset-0 p-6 flex gap-4">
            <div className="w-44 shrink-0 rounded-xl h-full" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }} />
            <div className="flex-1 flex flex-col gap-4">
              <div className="h-9 rounded-lg w-1/3" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }} />
              <div className="grid grid-cols-4 gap-3 flex-shrink-0">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-20 rounded-xl" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }} />
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3 flex-1">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="rounded-xl" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }} />
                ))}
              </div>
            </div>
          </div>
          <p className="absolute bottom-6 left-1/2 -translate-x-1/2 text-xs font-mono z-20"
             style={{ color: "var(--text-muted)" }}>
            Vista previa del dashboard
          </p>
        </motion.div>
      </section>

      {/* ── Logo cloud ────────────────────────────────────────── */}
      <section id="logos" className="py-14 px-5 border-y" style={{ borderColor: "var(--border)" }}>
        <p className="text-center text-xs font-semibold uppercase tracking-widest mb-8"
           style={{ color: "var(--text-muted)" }}>
          Confían en La Causa AI
        </p>
        <div className="max-w-4xl mx-auto flex flex-wrap justify-center gap-x-12 gap-y-4">
          {logos.map((l) => (
            <span key={l} className="text-sm font-semibold opacity-40 hover:opacity-70 transition-opacity cursor-default">
              {l}
            </span>
          ))}
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────────── */}
      <section id="features" className="py-24 px-5 max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            Inteligencia en cada proceso
          </h2>
          <p className="text-base max-w-lg mx-auto" style={{ color: "var(--text-muted)" }}>
            Diseñado para eliminar el trabajo manual y maximizar el impacto social.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <motion.div
              key={i}
              variants={fadeUp}
              custom={i * 0.5}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              whileHover={{ y: -3 }}
              className="p-7 rounded-2xl transition-colors"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-5"
                   style={{ background: "var(--accent-soft)" }}>
                <f.icon className="w-5 h-5" style={{ color: "var(--accent)" }} />
              </div>
              <h3 className="font-semibold mb-2 text-sm">{f.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Pricing ───────────────────────────────────────────── */}
      <section id="pricing" className="py-24 px-5 max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            LA CAUSA Premium
          </h2>
          <p style={{ color: "var(--text-muted)" }}>
            Precios en bolivianos para organizaciones en Santa Cruz. Sin contratos largos.
          </p>
        </div>

        <motion.div className="grid grid-cols-1 md:grid-cols-3 gap-6" variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
          {LANDING_PRICING_PLANS.map((p) => (
            <div
              key={p.name}
              className="p-8 rounded-2xl flex flex-col relative"
              style={{
                background: p.highlight ? "var(--accent-soft)" : "var(--bg-card)",
                border: `1px solid ${p.highlight ? "var(--accent)" : "var(--border)"}`,
              }}
            >
              {p.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-bold px-3 py-1 rounded-full text-white bg-gradient-to-r from-purple-500 to-blue-500">
                  RECOMENDADO
                </span>
              )}
              <h3 className="font-semibold text-base mb-1">{p.name}</h3>
              <div className="text-4xl font-bold mb-6">
                {p.priceLabel}
                <span className="text-base font-normal" style={{ color: "var(--text-muted)" }}>{p.period}</span>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {p.items.map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm" style={{ color: "var(--text-muted)" }}>
                    <Check className="w-4 h-4 shrink-0" style={{ color: "var(--accent)" }} />
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href="/register"
                className="text-center py-3 rounded-full text-sm font-semibold transition-all hover:scale-[1.02]"
                style={
                  p.highlight
                    ? { background: "var(--text)", color: "var(--bg)" }
                    : { border: "1px solid var(--border)", background: "transparent", color: "var(--text)" }
                }
              >
                {p.cta}
              </Link>
            </div>
          ))}
        </motion.div>
      </section>

      {/* ── Footer ────────────────────────────────────────────── */}
      <footer className="border-t py-10 px-5" style={{ borderColor: "var(--border)" }}>
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <Link href="/" className="flex items-center gap-2 font-semibold text-sm">
            <span className="w-5 h-5 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 inline-block" />
            La Causa AI
          </Link>
          <div className="flex items-center gap-6 text-xs" style={{ color: "var(--text-muted)" }}>
            <Link href="/login"    className="hover:underline">App</Link>
            <Link href="#features" className="hover:underline">Características</Link>
            <Link href="#pricing"  className="hover:underline">Precios</Link>
          </div>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            © 2026 La Causa AI. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
