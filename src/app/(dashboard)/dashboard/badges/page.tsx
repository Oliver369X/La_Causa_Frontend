"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Award, Plus, Sparkles, Tag, ShieldCheck } from "lucide-react";
import { useAuthStore } from "@/shared/store/authStore";
import { uploadImage } from "@/features/uploads/api/uploadApi";
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
  categoria?: string | null;
  mensaje_personalizado?: string | null;
  regla_asignacion?: string | null;
  regla_config?: Record<string, unknown> | null;
  created_at: string;
}

function parseError(err: unknown): string {
  const e = err as { response?: { data?: { detail?: string } } };
  return e?.response?.data?.detail ?? "Error inesperado";
}

export default function BadgesPage() {
  const { activeOrgId } = useAuthStore();
  const [badges, setBadges] = useState<OrgBadge[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [formNombre, setFormNombre] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formImg, setFormImg] = useState("");
  const [formCategoria, setFormCategoria] = useState("");
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
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

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

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    setUploading(true);
    try {
      const { url } = await uploadImage(file);
      setFormImg(url);
    } catch {
      toast.error("Error al subir imagen");
    } finally {
      setUploading(false);
    }
  };

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
        categoria: formCategoria || null,
        mensaje_personalizado: formMensaje || null,
        regla_asignacion: formRegla,
        regla_config: reglaConfig,
        requisitos,
      });
      toast.success("Medalla creada");
      setShowCreate(false);
      setFormNombre("");
      setFormDesc("");
      setFormImg("");
      setFormCategoria("");
      setFormMensaje("");
      setFormTipo("TAREA_ESPECIAL");
      setFormRareza("COMUN");
      setFormRegla("manual");
      setFormReglaConfig({ requiere_aprobacion_admin: true });
      setFormRequisitos({ evidencia_requerida: false, nivel_minimo: 1 });
      setFormDaXp(true);
      setFormPuntosBonus(0);
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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Award className="w-5 h-5" style={{ color: "var(--accent)" }} />
          Catálogo de medallas
        </h1>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4" /> Nueva medalla
        </Button>
      </div>

      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Crear medalla"
        description="Medallas de la organización para reconocer a voluntarios"
        size="xl"
        scrollable
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancelar</Button>
            <Button onClick={handleCreate} loading={submitting}>Crear</Button>
          </>
        }
      >
        <div className="space-y-4">
          {/* Vista previa siempre visible arriba */}
          <div
            className="rounded-xl p-4 shrink-0"
            style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}
          >
            <p className="text-xs font-semibold mb-3 flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
              <Sparkles className="w-4 h-4" style={{ color: "var(--accent)" }} /> Vista previa
            </p>
            <div className="flex items-center gap-4">
              <div
                className="w-20 h-20 rounded-xl overflow-hidden flex items-center justify-center shrink-0"
                style={{ background: "var(--bg-card)", border: "2px solid var(--border)" }}
              >
                {formImg ? (
                  <img src={formImg} alt="preview-medalla" className="w-full h-full object-cover" />
                ) : (
                  <Award className="w-10 h-10" style={{ color: "var(--text-muted)" }} />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                  {formNombre || "Nombre de medalla"}
                </p>
                <p className="text-xs mt-0.5 line-clamp-2" style={{ color: "var(--text-muted)" }}>
                  {formDesc || "Descripción de reconocimiento"}
                </p>
                <p className="text-xs mt-2 flex items-center gap-2 flex-wrap" style={{ color: "var(--text-muted)" }}>
                  <Tag className="w-3.5 h-3.5 shrink-0" /> {formRareza} · {formTipo}
                  {formDaXp && <span>· XP: +{formPuntosBonus}</span>}
                </p>
                <p className="text-xs mt-1 flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0" /> Regla: {formRegla}
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Nombre</label>
            <input
              value={formNombre}
              onChange={(e) => setFormNombre(e.target.value)}
              placeholder="Ej: Voluntario destacado"
              className="w-full h-9 px-3 rounded-lg text-sm outline-none"
              style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Descripción</label>
            <textarea
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              placeholder="Qué reconoce esta medalla"
              rows={2}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Categoría</label>
              <input
                value={formCategoria}
                onChange={(e) => setFormCategoria(e.target.value)}
                placeholder="Ej: Liderazgo, Impacto social, Asistencia"
                className="w-full h-9 px-3 rounded-lg text-sm outline-none"
                style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tipo</label>
              <select
                value={formTipo}
                onChange={(e) => setFormTipo(e.target.value as "ELO" | "TAREA_ESPECIAL")}
                className="w-full h-9 px-3 rounded-lg text-sm outline-none"
                style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}
              >
                <option value="TAREA_ESPECIAL">Tarea especial</option>
                <option value="ELO">ELO</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Imagen</label>
            <div className="flex gap-3 items-center">
              <input type="file" accept="image/*" onChange={handleImageChange} className="text-sm" />
              {uploading && <span className="text-xs" style={{ color: "var(--text-muted)" }}>Subiendo...</span>}
              {formImg && (
                <img src={formImg} alt="Preview" className="w-16 h-16 rounded-xl object-cover" />
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Rareza</label>
              <select
                value={formRareza}
                onChange={(e) => setFormRareza(e.target.value)}
                className="w-full h-9 px-3 rounded-lg text-sm outline-none"
                style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}
              >
                <option value="COMUN">Común</option>
                <option value="NORMAL">Normal</option>
                <option value="RARO">Raro</option>
                <option value="MITICO">Mítico</option>
                <option value="LEGENDARIO">Legendario</option>
                <option value="UNICO">Único</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Puntos bonus (XP)</label>
              <input
                type="number"
                min={0}
                value={formPuntosBonus}
                onChange={(e) => setFormPuntosBonus(parseInt(e.target.value, 10) || 0)}
                className="w-full h-9 px-3 rounded-lg text-sm outline-none"
                style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}
              />
            </div>
          </div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formDaXp}
              onChange={(e) => setFormDaXp(e.target.checked)}
            />
            <span className="text-sm">Otorga experiencia al obtenerla</span>
          </label>
          <div>
            <label className="block text-sm font-medium mb-1">Mensaje personalizado</label>
            <input
              value={formMensaje}
              onChange={(e) => setFormMensaje(e.target.value)}
              placeholder="Ej: ¡Gracias por tu compromiso excepcional!"
              className="w-full h-9 px-3 rounded-lg text-sm outline-none"
              style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text)" }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Regla y requisitos</label>
            <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>
              Define cómo se otorga la medalla. El JSON se genera automáticamente.
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {badges.map((b, i) => (
            <motion.div
              key={b.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i, duration: 0.3 }}
              className="rounded-2xl p-4 flex flex-col gap-2 g-reward-card"
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0 overflow-hidden"
                  style={{ background: "var(--bg-subtle)" }}
                >
                  {b.url_imagen ? (
                    <img src={b.url_imagen} alt={b.nombre} className="w-full h-full object-cover" />
                  ) : (
                    <Award className="w-7 h-7" style={{ color: "var(--text-muted)" }} />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{b.nombre}</p>
                  {b.descripcion && (
                    <p className="text-xs line-clamp-2 mt-0.5" style={{ color: "var(--text-muted)" }}>{b.descripcion}</p>
                  )}
                  <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                    {b.rareza} · {b.tipo} · XP {b.da_xp ? `+${b.puntos_bonus}` : "0"}
                  </p>
                  {b.regla_asignacion && (
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                      Regla: {b.regla_asignacion}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
