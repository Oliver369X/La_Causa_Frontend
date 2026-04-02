"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Award, EyeOff, HelpCircle, Plus, Quote, Sparkles, Tag } from "lucide-react";
import { useAuthStore } from "@/shared/store/authStore";
import { apiClient } from "@/shared/api/client";
import { EP } from "@/shared/api/endpoints";
import {
  ConfigMedallaForm,
  reglaConfigToJson,
  requisitosToJson,
  type ReglaAsignacion,
  type ReglaConfigValues,
  type RequisitosValues,
} from "@/features/badges/ui/ConfigMedallaForm";
import {
  describeHowToEarn,
  getRarezaVisual,
  labelTipoInsignia,
} from "@/features/badges/lib/badgePresentation";
import { BadgeImageField } from "@/features/badges/ui/BadgeImageField";
import { PillMultiSelect, PillNumberPresets, PillSelect } from "@/features/badges/ui/BadgeFormPills";
import { Button } from "@/shared/ui/Button";
import { Spinner } from "@/shared/ui/Spinner";
import { EmptyState } from "@/shared/ui/EmptyState";
import { Modal } from "@/shared/ui/Modal";
import { toast } from "sonner";

interface OrgBadge {
  id: string;
  nombre: string;
  descripcion: string;
  url_imagen: string;
  rareza: "COMUN" | "NORMAL" | "RARO" | "MITICO" | "LEGENDARIO" | "UNICO";
  tipo: "ELO" | "TAREA_ESPECIAL";
  puntos_bonus: number;
  da_xp: boolean;
  requisitos?: Record<string, unknown> | null;
  categoria?: string | null;
  mensaje_personalizado?: string | null;
  regla_asignacion?: string | null;
  regla_config?: Record<string, unknown> | null;
  /** false = no aparece en listas públicas / logros; solo gestión y al otorgar. */
  visible_en_catalogo?: boolean;
  created_at: string;
}

function parseError(err: unknown): string {
  const e = err as { response?: { data?: { detail?: string } } };
  return e?.response?.data?.detail ?? "Error inesperado";
}

const RAREZA_PILLS = [
  { value: "COMUN", label: "Común" },
  { value: "NORMAL", label: "Normal" },
  { value: "RARO", label: "Raro" },
  { value: "MITICO", label: "Mítico" },
  { value: "LEGENDARIO", label: "Legendario" },
  { value: "UNICO", label: "Único" },
] as const;

const TIPO_PILLS = [
  { value: "TAREA_ESPECIAL", label: "Tarea / logro especial" },
  { value: "ELO", label: "Competencia (ELO)" },
] as const;

const XP_PRESETS = [0, 25, 50, 100, 200, 500] as const;

const CATEGORIAS_SUGERIDAS = [
  "Liderazgo",
  "Impacto social",
  "Asistencia",
  "Comunidad",
  "Educación",
  "Eventos",
  "Medio ambiente",
] as const;

const VISIBILIDAD_CATALOGO_PILLS = [
  { value: "catalogo", label: "Visible (catálogo, logros y web pública)" },
  { value: "sorpresa", label: "Sorpresa (oculta en listas hasta otorgarla)" },
] as const;

function BadgeFormPreview({
  formRareza,
  formNombre,
  formDesc,
  formImg,
  formCategorias,
  formMensaje,
  formTipo,
  formDaXp,
  formPuntosBonus,
  formRegla,
  formReglaConfig,
  formRequisitos,
}: {
  formRareza: string;
  formNombre: string;
  formDesc: string;
  formImg: string;
  formCategorias: string[];
  formMensaje: string;
  formTipo: "ELO" | "TAREA_ESPECIAL";
  formDaXp: boolean;
  formPuntosBonus: number;
  formRegla: ReglaAsignacion;
  formReglaConfig: ReglaConfigValues[ReglaAsignacion];
  formRequisitos: RequisitosValues;
}) {
  const rv = getRarezaVisual(formRareza);
  const how = describeHowToEarn(
    formRegla,
    reglaConfigToJson(formReglaConfig),
    requisitosToJson(formRequisitos),
  );
  return (
    <div className="w-full min-w-0 max-w-full">
      <p className="text-xs font-semibold flex items-center gap-2 mb-3 min-w-0" style={{ color: "var(--text-muted)" }}>
        <Sparkles className="w-4 h-4 shrink-0" style={{ color: "var(--accent)" }} />
        <span className="break-words">Vista previa (tarjeta de logro)</span>
      </p>
      <div
        className="rounded-2xl overflow-hidden w-full min-w-0 shadow-lg"
        style={{
          border: "1px solid var(--border)",
          boxShadow: "0 12px 48px var(--glow-a)",
        }}
      >
        <div
          className="h-1.5 w-full"
          style={{ background: `linear-gradient(90deg, ${rv.border}, var(--accent))` }}
        />
        <div className="p-5 sm:p-6 space-y-4" style={{ background: "var(--bg-card)" }}>
          <div className="flex flex-col sm:flex-row gap-5 items-stretch">
            <div className="flex flex-col items-center shrink-0 mx-auto sm:mx-0 w-full sm:w-[160px]">
              <div
                className="w-full max-w-[160px] aspect-square rounded-2xl flex items-center justify-center p-4 box-border"
                style={{
                  border: `2px solid ${rv.border}`,
                  boxShadow: rv.glow,
                  background: "linear-gradient(165deg, var(--bg-subtle) 0%, var(--bg-card) 100%)",
                }}
              >
                {formImg ? (
                  <img
                    src={formImg}
                    alt=""
                    className="max-w-full max-h-full w-auto h-auto object-contain"
                    style={{ maxHeight: "112px", maxWidth: "100%" }}
                  />
                ) : (
                  <Award className="w-14 h-14 opacity-35" style={{ color: "var(--text-muted)" }} />
                )}
              </div>
              <span
                className="mt-2.5 text-[10px] uppercase font-bold tracking-wide px-2.5 py-1 rounded-full"
                style={{
                  background: rv.bg,
                  border: `1px solid ${rv.border}`,
                  color: "var(--text)",
                }}
              >
                {rv.label}
              </span>
            </div>
            <div className="min-w-0 flex-1 flex flex-col gap-2 justify-center">
              {formCategorias.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {formCategorias.map((cat) => (
                    <span
                      key={cat}
                      className="text-[10px] font-medium px-2 py-0.5 rounded-md max-w-full truncate"
                      style={{ background: "var(--bg-subtle)", color: "var(--text-muted)" }}
                      title={cat}
                    >
                      {cat}
                    </span>
                  ))}
                </div>
              )}
              <h3 className="text-lg sm:text-xl font-bold leading-snug break-words" style={{ color: "var(--text)" }}>
                {formNombre || "Nombre de la medalla"}
              </h3>
              <p className="text-sm leading-relaxed break-words" style={{ color: "var(--text-muted)" }}>
                {formDesc || "La descripción motiva al voluntario a conseguir el reconocimiento."}
              </p>
            </div>
          </div>

          <div
            className="rounded-xl p-3 sm:p-4 text-sm leading-relaxed break-words [overflow-wrap:anywhere]"
            style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}
          >
            <span className="font-semibold" style={{ color: "var(--accent)" }}>Cómo ganarla: </span>
            {how}
          </div>

          {formMensaje.trim() ? (
            <div
              className="flex gap-2 items-start text-sm italic border-l-[3px] pl-3 py-0.5"
              style={{ borderColor: "var(--accent)", color: "var(--text-muted)" }}
            >
              <Quote className="w-4 h-4 shrink-0 mt-0.5 opacity-60" />
              <span className="break-words [overflow-wrap:anywhere]">{formMensaje.trim()}</span>
            </div>
          ) : null}

          <div
            className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs pt-2 border-t"
            style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
          >
            <Tag className="w-3.5 h-3.5 shrink-0" />
            <span>{labelTipoInsignia(formTipo)}</span>
            <span aria-hidden>·</span>
            {formDaXp ? (
              <span>+{formPuntosBonus} XP al desbloquear</span>
            ) : (
              <span>Sin bonus de XP</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function BadgeDataExplainer() {
  return (
    <details
      className="rounded-xl p-3 sm:p-4 text-xs leading-relaxed group min-w-0"
      style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}
    >
      <summary
        className="cursor-pointer font-semibold list-none flex items-center gap-2 select-none min-w-0"
        style={{ color: "var(--text)" }}
      >
        <HelpCircle className="w-4 h-4 shrink-0" style={{ color: "var(--accent)" }} />
        <span className="break-words">Horas, XP y qué se guarda en la base de datos</span>
        <span className="text-[10px] font-normal ml-auto opacity-70 group-open:hidden">Abrir</span>
      </summary>
      <div className="mt-3 space-y-3 pt-2 border-t" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
        <p>
          <strong style={{ color: "var(--text)" }}>Horas y la regla «Horas mínimas».</strong> En el formulario solo definís un
          umbral (por ejemplo 120 horas) y un período (anual, semestral o mensual). Eso se guarda como JSON en la medalla.
          El total de horas del voluntario en el perfil (<code className="text-[11px] px-1 rounded" style={{ background: "var(--bg-card)" }}>horas_totales_voluntario</code>) está pensado
          para métricas y certificados; en el código actual del backend no aparece un incremento automático por cada tarea completada
          (solo datos de prueba en scripts). Las horas por <strong style={{ color: "var(--text)" }}>participación en eventos</strong> pueden
          registrarse por inscripción (<code className="text-[11px] px-1 rounded" style={{ background: "var(--bg-card)" }}>evento_usuario.horas_acreditadas</code>), según configure el flujo de la organización.
        </p>
        <p>
          <strong style={{ color: "var(--text)" }}>Qué fila se guarda.</strong> Tabla <code className="text-[11px] px-1 rounded" style={{ background: "var(--bg-card)" }}>insignia</code>:
          nombre, descripción, <code className="text-[11px]">url_imagen</code> (URL del archivo subido), rareza y tipo (enum en BD),
          puntos_bonus, da_xp, <code className="text-[11px]">categoria</code> (texto, hasta ~80 caracteres; varias categorías van separadas por comas),
          mensaje_personalizado, <code className="text-[11px]">requisitos</code> (JSONB: nivel mínimo, evidencia),
          <code className="text-[11px]"> regla_asignacion</code> (texto: manual, gestion_completada, horas_minimas, tareas_completadas) y{" "}
          <code className="text-[11px]">regla_config</code> (JSONB con los números según la regla), y{" "}
          <code className="text-[11px]">visible_en_catalogo</code> (booleano: si es <code className="text-[11px]">false</code>, la medalla no aparece en la página pública ni en «Logros de la org»; solo la ves acá y el voluntario al recibirla). No se guarda la imagen en la BD, solo la URL.
        </p>
        <p>
          <strong style={{ color: "var(--text)" }}>Qué no es persistencia directa.</strong> La vista previa y los textos de ayuda del modal no se guardan;
          el XP bonus es un número entero en la fila de la medalla (no el historial de partidas del voluntario).
        </p>
      </div>
    </details>
  );
}

export default function BadgesPage() {
  const { activeOrgId } = useAuthStore();
  const [badges, setBadges] = useState<OrgBadge[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [formNombre, setFormNombre] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formImg, setFormImg] = useState("");
  const [formCategorias, setFormCategorias] = useState<string[]>([]);
  const [customCategoriaDraft, setCustomCategoriaDraft] = useState("");
  const [formMensaje, setFormMensaje] = useState("");
  const [formTipo, setFormTipo] = useState<"ELO" | "TAREA_ESPECIAL">("TAREA_ESPECIAL");
  const [formRareza, setFormRareza] = useState("COMUN");
  const [formRegla, setFormRegla] = useState<ReglaAsignacion>("manual");
  const [formReglaConfig, setFormReglaConfig] = useState<ReglaConfigValues[ReglaAsignacion]>({
    requiere_aprobacion_admin: true,
  });
  const [formRequisitos, setFormRequisitos] = useState<RequisitosValues>({
    evidencia_requerida: false,
    nivel_minimo: 1,
  });
  const [formDaXp, setFormDaXp] = useState(true);
  const [formPuntosBonus, setFormPuntosBonus] = useState(0);
  const [formVisCatalogo, setFormVisCatalogo] = useState<"catalogo" | "sorpresa">("catalogo");
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  const resetCreateForm = () => {
    setFormNombre("");
    setFormDesc("");
    setFormImg("");
    setFormCategorias([]);
    setCustomCategoriaDraft("");
    setFormMensaje("");
    setFormTipo("TAREA_ESPECIAL");
    setFormRareza("COMUN");
    setFormRegla("manual");
    setFormReglaConfig({ requiere_aprobacion_admin: true });
    setFormRequisitos({ evidencia_requerida: false, nivel_minimo: 1 });
    setFormDaXp(true);
    setFormPuntosBonus(0);
    setFormVisCatalogo("catalogo");
  };

  const closeCreateModal = () => {
    resetCreateForm();
    setShowCreate(false);
  };

  const loadBadges = async () => {
    if (!activeOrgId) return;
    const { data } = await apiClient.get<OrgBadge[]>(EP.MEDALS, { params: { organizacion_id: activeOrgId } });
    setBadges(data);
  };

  useEffect(() => {
    if (!activeOrgId) return;
    loadBadges()
      .catch((e) => toast.error(`Error al cargar medallas: ${parseError(e)}`))
      .finally(() => setLoading(false));
  }, [activeOrgId]);

  const handleCreate = async () => {
    if (!formNombre.trim() || !formDesc.trim()) {
      toast.error("Nombre y descripción requeridos");
      return;
    }
    if (!formImg.trim()) {
      toast.error("Sube una imagen para la medalla");
      return;
    }
    if (!activeOrgId) return;
    const reglaConfig = reglaConfigToJson(formReglaConfig);
    const requisitos = requisitosToJson(formRequisitos);
    setSubmitting(true);
    try {
      await apiClient.post(EP.MEDALS, {
        organizacion_id: activeOrgId,
        nombre: formNombre,
        descripcion: formDesc,
        url_imagen: formImg,
        rareza: formRareza,
        tipo: formTipo,
        da_xp: formDaXp,
        puntos_bonus: formPuntosBonus,
        categoria: formCategorias.length > 0 ? formCategorias.join(", ") : null,
        mensaje_personalizado: formMensaje || null,
        regla_asignacion: formRegla,
        regla_config: reglaConfig,
        requisitos,
        visible_en_catalogo: formVisCatalogo === "catalogo",
      });
      toast.success("Medalla creada");
      closeCreateModal();
      await loadBadges();
    } catch (e) {
      toast.error(`Error al crear medalla: ${parseError(e)}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (!activeOrgId) {
    return (
      <div className="p-5 md:p-8" style={{ color: "var(--text)" }}>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Selecciona una organización para gestionar medallas.
        </p>
      </div>
    );
  }

  return (
    <div className="p-5 md:p-8 space-y-6" style={{ color: "var(--text)" }}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1 max-w-2xl">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Award className="w-5 h-5" style={{ color: "var(--accent)" }} />
            Catálogo de medallas
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
            Diseña reconocimientos claros y atractivos: imagen, rareza y un mensaje al desbloquear ayudan a que los
            voluntarios piensen &quot;quiero ganar esto&quot;. La vista previa simula lo que refuerza el deseo de logro.
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4" /> Nueva medalla
        </Button>
      </div>

      <Modal
        open={showCreate}
        onClose={closeCreateModal}
        title="Crear medalla"
        description="Piensa en el voluntario: nombre memorable, imagen reconocible y reglas comprensibles."
        size="2xl"
        scrollable
        footer={
          <>
            <Button variant="ghost" onClick={closeCreateModal}>Cancelar</Button>
            <Button onClick={handleCreate} loading={submitting}>Crear</Button>
          </>
        }
      >
        <div className="space-y-5 w-full min-w-0 max-w-full overflow-hidden">
          <div className="min-w-0">
            <label className="block text-sm font-medium mb-1">Nombre</label>
            <input
              value={formNombre}
              onChange={(e) => setFormNombre(e.target.value)}
              placeholder="Ej: Voluntario destacado"
              className="w-full min-w-0 h-9 px-3 rounded-lg text-sm outline-none"
              style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}
            />
          </div>
          <div className="min-w-0">
            <label className="block text-sm font-medium mb-1">Descripción</label>
            <textarea
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              placeholder="Qué reconoce esta medalla"
              rows={2}
              className="w-full min-w-0 px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}
            />
          </div>

          <BadgeImageField
            value={formImg}
            onChange={setFormImg}
            uploading={uploading}
            onUploadingChange={setUploading}
            onError={(msg) => toast.error(msg)}
          />

          <BadgeFormPreview
            formRareza={formRareza}
            formNombre={formNombre}
            formDesc={formDesc}
            formImg={formImg}
            formCategorias={formCategorias}
            formMensaje={formMensaje}
            formTipo={formTipo}
            formDaXp={formDaXp}
            formPuntosBonus={formPuntosBonus}
            formRegla={formRegla}
            formReglaConfig={formReglaConfig}
            formRequisitos={formRequisitos}
          />

          <PillMultiSelect
            label="Categorías"
            hint="Podés elegir varias. Se guardan separadas por comas."
            value={formCategorias}
            onChange={setFormCategorias}
            options={[...CATEGORIAS_SUGERIDAS]}
          />
          <div className="flex flex-col sm:flex-row gap-2 min-w-0">
            <input
              value={customCategoriaDraft}
              onChange={(e) => setCustomCategoriaDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  const v = customCategoriaDraft.trim();
                  if (!v || formCategorias.includes(v)) return;
                  setFormCategorias((prev) => [...prev, v]);
                  setCustomCategoriaDraft("");
                }
              }}
              placeholder="Otra categoría (Enter para añadir)"
              className="flex-1 min-w-0 h-9 px-3 rounded-lg text-sm outline-none"
              style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}
            />
            <Button
              type="button"
              variant="ghost"
              className="shrink-0"
              onClick={() => {
                const v = customCategoriaDraft.trim();
                if (!v || formCategorias.includes(v)) return;
                setFormCategorias((prev) => [...prev, v]);
                setCustomCategoriaDraft("");
              }}
            >
              Añadir
            </Button>
          </div>

          <PillSelect
            label="Tipo de medalla"
            hint="Solo una: logro por tarea o reconocimiento ligado al ranking ELO."
            value={formTipo}
            onChange={(v) => setFormTipo(v)}
            options={[...TIPO_PILLS]}
          />

          <PillSelect
            label="Rareza"
            hint="Una sola: define brillo y escasez visual."
            value={formRareza}
            onChange={setFormRareza}
            options={[...RAREZA_PILLS]}
          />

          <PillSelect
            label="Visibilidad en catálogos"
            hint="Las «sorpresa» no saturan la web pública ni el menú Logros; el voluntario las descubre al recibirlas."
            value={formVisCatalogo}
            onChange={(v) => setFormVisCatalogo(v as "catalogo" | "sorpresa")}
            options={[...VISIBILIDAD_CATALOGO_PILLS]}
          />

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formDaXp}
              onChange={(e) => setFormDaXp(e.target.checked)}
            />
            <span className="text-sm">Otorga experiencia al obtenerla</span>
          </label>

          {formDaXp && (
            <PillNumberPresets
              label="Puntos de experiencia (XP)"
              hint="Elegí un valor rápido o escribí otro a la derecha."
              value={formPuntosBonus}
              onChange={setFormPuntosBonus}
              presets={[...XP_PRESETS]}
              suffix=" XP"
            />
          )}

          <div className="min-w-0">
            <label className="block text-sm font-medium mb-1">Mensaje al desbloquear (opcional)</label>
            <input
              value={formMensaje}
              onChange={(e) => setFormMensaje(e.target.value)}
              placeholder="Ej: ¡Gracias por tu compromiso excepcional!"
              className="w-full min-w-0 h-9 px-3 rounded-lg text-sm outline-none"
              style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}
            />
          </div>
          <div className="min-w-0">
            <label className="block text-sm font-medium mb-1.5">Regla y requisitos</label>
            <p className="text-xs mb-2 break-words" style={{ color: "var(--text-muted)" }}>
              Definí cómo se otorga la medalla; el sistema arma la configuración automáticamente.
            </p>
            <ConfigMedallaForm
              regla={formRegla}
              reglaConfig={formReglaConfig}
              requisitos={formRequisitos}
              onReglaChange={setFormRegla}
              onReglaConfigChange={setFormReglaConfig}
              onRequisitosChange={setFormRequisitos}
            />
          </div>

          <BadgeDataExplainer />
        </div>
      </Modal>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : badges.length === 0 ? (
        <EmptyState
          title="Sin medallas"
          description="Crea medallas para reconocer a tus voluntarios."
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {badges.map((b, i) => {
            const rv = getRarezaVisual(b.rareza);
            const how = describeHowToEarn(b.regla_asignacion, b.regla_config ?? undefined, b.requisitos ?? undefined);
            return (
              <motion.div
                key={b.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * i, duration: 0.3 }}
                className="rounded-2xl overflow-hidden flex flex-col g-reward-card hover:scale-[1.01] transition-transform"
              >
                <div
                  className="relative w-full aspect-[4/3] flex items-center justify-center overflow-hidden"
                  style={{
                    borderBottom: `2px solid ${rv.border}`,
                    boxShadow: `inset 0 0 40px ${rv.bg}`,
                    background: `linear-gradient(160deg, ${rv.bg} 0%, var(--bg-card) 55%)`,
                  }}
                >
                  <div
                    className="w-[45%] max-w-[140px] aspect-square rounded-2xl overflow-hidden flex items-center justify-center"
                    style={{
                      border: `3px solid ${rv.border}`,
                      boxShadow: rv.glow,
                      background: rv.bg,
                    }}
                  >
                    {b.url_imagen ? (
                      <img src={b.url_imagen} alt="" className="w-full h-full object-contain p-1" />
                    ) : (
                      <Award className="w-12 h-12" style={{ color: "var(--text-muted)" }} />
                    )}
                  </div>
                  <span
                    className="absolute top-2 right-2 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full"
                    style={{ background: "var(--bg-card)", border: `1px solid ${rv.border}`, color: "var(--text)" }}
                  >
                    {rv.label}
                  </span>
                  {b.visible_en_catalogo === false && (
                    <span
                      className="absolute top-2 left-2 text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5 max-w-[calc(100%-5rem)]"
                      style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-muted)" }}
                      title="No aparece en la web pública ni en Logros del voluntario hasta otorgarla"
                    >
                      <EyeOff className="w-3 h-3 shrink-0" /> Sorpresa
                    </span>
                  )}
                </div>
                <div className="p-4 flex flex-col gap-2 flex-1">
                  <div className="flex flex-wrap gap-1.5 items-center">
                    {b.categoria?.trim() && (
                      <span
                        className="text-[10px] font-medium px-2 py-0.5 rounded-md"
                        style={{ background: "var(--bg-subtle)", color: "var(--text-muted)" }}
                      >
                        {b.categoria.trim()}
                      </span>
                    )}
                    <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                      {labelTipoInsignia(b.tipo)}
                    </span>
                  </div>
                  <p className="text-sm font-bold leading-snug">{b.nombre}</p>
                  {b.descripcion && (
                    <p className="text-xs line-clamp-2 leading-relaxed" style={{ color: "var(--text-muted)" }}>
                      {b.descripcion}
                    </p>
                  )}
                  <div
                    className="text-xs leading-snug rounded-lg p-2.5 mt-1 flex-1"
                    style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}
                  >
                    <span className="font-semibold" style={{ color: "var(--accent)" }}>Cómo ganarla: </span>
                    {how}
                  </div>
                  {b.mensaje_personalizado?.trim() && (
                    <p className="text-[11px] italic line-clamp-2 flex gap-1.5 items-start" style={{ color: "var(--text-muted)" }}>
                      <Quote className="w-3.5 h-3.5 shrink-0 mt-0.5 opacity-70" />
                      {b.mensaje_personalizado.trim()}
                    </p>
                  )}
                  <p className="text-[11px] pt-1 mt-auto" style={{ color: "var(--text-muted)" }}>
                    {b.da_xp ? `+${b.puntos_bonus} XP` : "Sin bonus de XP"}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
