"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Award, ShieldCheck, Calendar, Zap, Trophy, Share2, X, Sparkles, Check, Copy } from "lucide-react";
import type { Badge } from "../api/gamificationApi";

interface Props {
  badge: Badge | null;
  onClose: () => void;
  onShare?: (badge: Badge) => void;
}

// Configuración de estilo, iluminación y textos según rango o rareza
function getHonorTheme(badge: Badge) {
  const nameUpper = (badge.nombre ?? "").toUpperCase();
  const rareza = badge.rareza?.toLowerCase() ?? "common";

  if (nameUpper.includes("DIAMANTE") || rareza === "legendary") {
    return {
      tierName: "RANGO DIAMANTE",
      badgeTitle: "Medalla de Honor · Diamante",
      glowColor: "rgba(56, 189, 248, 0.45)",
      borderColor: "rgba(56, 189, 248, 0.4)",
      accentColor: "#38BDF8",
      gradientBg: "radial-gradient(circle at 50% 30%, rgba(56, 189, 248, 0.18), transparent 70%)",
      pedestalColor: "rgba(56, 189, 248, 0.25)",
      ribbonText: "✦ DISTINCIÓN LEGENDARIA ✦",
      defaultDescription:
        "Condecoración suprema otorgada por trascendencia humanitaria, liderazgo comunitario excepcional y dedicación inquebrantable a las causas sociales.",
    };
  }
  if (nameUpper.includes("ORO") || rareza === "epic") {
    return {
      tierName: "RANGO ORO",
      badgeTitle: "Medalla de Honor · Oro",
      glowColor: "rgba(234, 179, 8, 0.45)",
      borderColor: "rgba(250, 204, 21, 0.4)",
      accentColor: "#FACC15",
      gradientBg: "radial-gradient(circle at 50% 30%, rgba(234, 179, 8, 0.18), transparent 70%)",
      pedestalColor: "rgba(234, 179, 8, 0.25)",
      ribbonText: "✦ DISTINCIÓN ÉPICA ✦",
      defaultDescription:
        "Reconocimiento de alta jerarquía conferido por maestría operativa, continuo compromiso y un impacto positivo demostrado en cada proyecto.",
    };
  }
  if (nameUpper.includes("PLATA") || rareza === "rare") {
    return {
      tierName: "RANGO PLATA",
      badgeTitle: "Medalla de Honor · Plata",
      glowColor: "rgba(148, 163, 184, 0.45)",
      borderColor: "rgba(203, 213, 225, 0.4)",
      accentColor: "#E2E8F0",
      gradientBg: "radial-gradient(circle at 50% 30%, rgba(148, 163, 184, 0.18), transparent 70%)",
      pedestalColor: "rgba(148, 163, 184, 0.25)",
      ribbonText: "✦ DISTINCIÓN DESTACADA ✦",
      defaultDescription:
        "Distinción otorgada por constancia, eficiencia y excelencia en la ejecución de tareas solidarias dentro de la comunidad.",
    };
  }
  if (nameUpper.includes("BRONCE") || rareza === "uncommon") {
    return {
      tierName: "RANGO BRONCE",
      badgeTitle: "Medalla de Honor · Bronce",
      glowColor: "rgba(217, 119, 6, 0.45)",
      borderColor: "rgba(245, 158, 11, 0.4)",
      accentColor: "#F59E0B",
      gradientBg: "radial-gradient(circle at 50% 30%, rgba(217, 119, 6, 0.2), transparent 70%)",
      pedestalColor: "rgba(217, 119, 6, 0.25)",
      ribbonText: "✦ RECONOCIMIENTO OFICIAL ✦",
      defaultDescription:
        "Distinción honorífica conferida por superar los primeros hitos de servicio, demostrando perseverancia, puntualidad y compromiso activo con la causa.",
    };
  }
  if (nameUpper.includes("ASPIRANTE") || nameUpper.includes("PRINCIPIANTE")) {
    return {
      tierName: "RANGO ASPIRANTE",
      badgeTitle: "Medalla de Rango: Aspirante",
      glowColor: "rgba(249, 115, 22, 0.45)",
      borderColor: "rgba(251, 146, 60, 0.45)",
      accentColor: "#FB923C",
      gradientBg: "radial-gradient(circle at 50% 30%, rgba(249, 115, 22, 0.22), transparent 70%)",
      pedestalColor: "rgba(249, 115, 22, 0.28)",
      ribbonText: "✦ DISTINCIÓN DE HONOR Y COMPROMISO ✦",
      defaultDescription:
        "Distinción conferida al incorporarse activamente al voluntariado y cumplir con los estándares de excelencia social. Acredita el mérito de iniciación en el escalafón competitivo de La Causa.",
    };
  }

  // General
  return {
    tierName: "RECONOCIMIENTO",
    badgeTitle: badge.nombre ?? "Insignia de Reconocimiento",
    glowColor: "rgba(59, 130, 246, 0.35)",
    borderColor: "rgba(96, 165, 250, 0.3)",
    accentColor: "#60A5FA",
    gradientBg: "radial-gradient(circle at 50% 30%, rgba(59, 130, 246, 0.15), transparent 70%)",
    pedestalColor: "rgba(59, 130, 246, 0.2)",
    ribbonText: "✦ MÉRITO COMUNITARIO ✦",
    defaultDescription:
      "Acreditación oficial concedida por vocación de servicio, solidaridad y valiosa colaboración en el cumplimiento de los objetivos sociales.",
  };
}

// Formatear nombre legible
function formatBadgeDisplay(badge: Badge, defaultTitle: string) {
  const raw = badge.nombre ?? "";
  // Si es un código como BRONCE-LA-CAUSA-3VNRE o similar
  if (/^[A-Z0-9]+-[A-Z0-9_-]+$/i.test(raw)) {
    const parts = raw.split("-");
    const rank = parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase();
    const org = parts.slice(1, parts.length - 1).join(" ");
    return {
      displayTitle: `Medalla de Rango: ${rank}`,
      subtitle: org ? `Otorgada por ${org.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())}` : defaultTitle,
      code: raw,
    };
  }
  return {
    displayTitle: raw || defaultTitle,
    subtitle: badge.organizacion_nombre ? `Otorgada por ${badge.organizacion_nombre}` : "Organización comunitaria",
    code: raw.includes("-") ? raw : undefined,
  };
}

export function BadgeRecognitionModal({ badge, onClose, onShare }: Props) {
  const [copied, setCopied] = useState(false);

  if (!badge) return null;

  const theme = getHonorTheme(badge);
  const { displayTitle, subtitle, code } = formatBadgeDisplay(badge, theme.badgeTitle);
  const descriptionText = badge.descripcion?.trim() && badge.descripcion !== "Sin descripción."
    ? badge.descripcion
    : theme.defaultDescription;

  const handleCopyCode = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const formattedDate = badge.fecha_obtencion
    ? new Date(badge.fecha_obtencion).toLocaleDateString("es-ES", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "Otorgada recientemente";

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
        style={{ background: "rgba(0, 0, 0, 0.72)", backdropFilter: "blur(8px)" }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 16 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl"
          style={{
            background: "var(--bg-card, #12151c)",
            border: `1px solid ${theme.borderColor}`,
            boxShadow: `0 20px 50px -10px ${theme.glowColor}, 0 0 0 1px rgba(255,255,255,0.08)`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Botón cerrar X */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full flex items-center justify-center transition-transform hover:scale-110 active:scale-95"
            style={{
              background: "rgba(255,255,255,0.08)",
              color: "var(--text, #ffffff)",
              backdropFilter: "blur(6px)",
            }}
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Cabecera ceremonial con iluminación y aura */}
          <div
            className="relative pt-10 pb-6 px-6 text-center flex flex-col items-center justify-center overflow-hidden"
            style={{ background: theme.gradientBg }}
          >
            {/* Halo de luz de fondo */}
            <div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full blur-3xl pointer-events-none opacity-60"
              style={{ background: theme.glowColor }}
            />

            {/* Ribbon superior de honor */}
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold tracking-wider uppercase mb-5"
              style={{
                background: "rgba(0,0,0,0.45)",
                color: theme.accentColor,
                border: `1px solid ${theme.borderColor}`,
                backdropFilter: "blur(6px)",
              }}
            >
              <Sparkles className="w-3 h-3" />
              {theme.ribbonText}
            </motion.div>

            {/* Showcase de la medalla con pedestal */}
            <div className="relative my-2 flex items-center justify-center">
              {/* Pedestal de luz */}
              <div
                className="absolute -bottom-3 w-32 h-8 rounded-full blur-md"
                style={{ background: theme.pedestalColor }}
              />

              <motion.div
                initial={{ scale: 0.8, rotate: -4 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 220, damping: 18 }}
                className="relative z-10 w-28 h-28 sm:w-32 sm:h-32 rounded-3xl flex items-center justify-center p-3"
                style={{
                  filter: `drop-shadow(0 12px 24px ${theme.glowColor})`,
                }}
              >
                {badge.imagen_url ? (
                  <img
                    src={badge.imagen_url}
                    alt={displayTitle}
                    className="w-full h-full object-contain transform hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <Award className="w-20 h-20" style={{ color: theme.accentColor }} />
                )}
              </motion.div>
            </div>

            {/* Título de honor */}
            <motion.h2
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="text-2xl font-black mt-3 tracking-tight"
              style={{ color: "var(--text, #ffffff)" }}
            >
              {displayTitle}
            </motion.h2>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-xs font-medium mt-1"
              style={{ color: "var(--text-muted, #94a3b8)" }}
            >
              {badge.organizacion_nombre
                ? `Conferida por ${badge.organizacion_nombre}`
                : subtitle}
            </motion.p>

            {/* Código verificador */}
            {code && (
              <button
                type="button"
                onClick={handleCopyCode}
                className="inline-flex items-center gap-1.5 mt-2.5 px-2.5 py-1 rounded-lg text-[11px] font-mono transition-opacity hover:opacity-80"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "var(--text-muted, #cbd5e1)",
                }}
                title="Copiar identificador de acreditación"
              >
                <ShieldCheck className="w-3 h-3" style={{ color: theme.accentColor }} />
                ID: {code}
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 opacity-60" />}
              </button>
            )}
          </div>

          {/* Cuerpo: Descripción Solemne y Grid de Méritos */}
          <div className="px-6 pb-6 pt-2 space-y-5">
            {/* Descripción inspiradora de reconocimiento real */}
            <div
              className="rounded-2xl p-4 relative"
              style={{
                background: "var(--bg-subtle, rgba(255,255,255,0.03))",
                border: "1px solid var(--border, rgba(255,255,255,0.08))",
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck className="w-4 h-4" style={{ color: theme.accentColor }} />
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: theme.accentColor }}>
                  Acreditación de Mérito
                </span>
              </div>
              <p
                className="text-sm leading-relaxed"
                style={{ color: "var(--text, #e2e8f0)" }}
              >
                {descriptionText}
              </p>
            </div>

            {/* Grid de Metadatos del Reconocimiento */}
            <div className="grid grid-cols-2 gap-3">
              {/* Puntos / XP */}
              <div
                className="rounded-xl p-3 flex items-center gap-3"
                style={{
                  background: "var(--bg-subtle, rgba(255,255,255,0.03))",
                  border: "1px solid var(--border, rgba(255,255,255,0.08))",
                }}
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: "rgba(234, 179, 8, 0.15)", color: "#FACC15" }}
                >
                  <Zap className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px]" style={{ color: "var(--text-muted, #94a3b8)" }}>
                    Recompensa XP
                  </p>
                  <p className="text-sm font-bold truncate" style={{ color: "var(--text, #ffffff)" }}>
                    {badge.puntos != null && badge.puntos > 0 ? `+${badge.puntos} XP` : "Mérito de Honor"}
                  </p>
                </div>
              </div>

              {/* Rango o Rareza */}
              <div
                className="rounded-xl p-3 flex items-center gap-3"
                style={{
                  background: "var(--bg-subtle, rgba(255,255,255,0.03))",
                  border: "1px solid var(--border, rgba(255,255,255,0.08))",
                }}
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: "rgba(168, 85, 247, 0.15)", color: "#C084FC" }}
                >
                  <Trophy className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px]" style={{ color: "var(--text-muted, #94a3b8)" }}>
                    Jerarquía
                  </p>
                  <p className="text-sm font-bold truncate capitalize" style={{ color: "var(--text, #ffffff)" }}>
                    {badge.rareza ? (badge.rareza === "uncommon" ? "Poco común" : badge.rareza === "rare" ? "Raro" : badge.rareza === "epic" ? "Épico" : badge.rareza === "legendary" ? "Legendario" : "Común") : theme.tierName}
                  </p>
                </div>
              </div>

              {/* Fecha de Emisión */}
              <div
                className="col-span-2 rounded-xl p-3 flex items-center gap-3"
                style={{
                  background: "var(--bg-subtle, rgba(255,255,255,0.03))",
                  border: "1px solid var(--border, rgba(255,255,255,0.08))",
                }}
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: "rgba(59, 130, 246, 0.15)", color: "#60A5FA" }}
                >
                  <Calendar className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px]" style={{ color: "var(--text-muted, #94a3b8)" }}>
                    Fecha de Concesión
                  </p>
                  <p className="text-xs font-semibold truncate" style={{ color: "var(--text, #ffffff)" }}>
                    {formattedDate}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 shrink-0">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Verificado
                </div>
              </div>
            </div>

            {/* Acciones principales */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              {onShare && (
                <button
                  type="button"
                  onClick={() => onShare(badge)}
                  className="w-full sm:flex-1 py-2.5 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-transform hover:scale-[1.02] active:scale-[0.98]"
                  style={{
                    background: "var(--accent, #6366f1)",
                    color: "#ffffff",
                    boxShadow: "0 4px 16px rgba(99, 102, 241, 0.35)",
                  }}
                >
                  <Share2 className="w-4 h-4" />
                  Compartir reconocimiento
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className={`py-2.5 px-5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-85 ${onShare ? "w-full sm:w-auto" : "w-full"}`}
                style={{
                  background: "var(--bg-subtle, rgba(255,255,255,0.08))",
                  border: "1px solid var(--border, rgba(255,255,255,0.12))",
                  color: "var(--text, #ffffff)",
                }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
