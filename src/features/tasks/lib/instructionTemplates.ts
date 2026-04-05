export type SavedInstructionTemplate = {
  id: string;
  nombre: string;
  texto: string;
  createdAt: number;
};

function storageKey(orgId: string | null | undefined): string {
  const slug = orgId?.trim() || "global";
  return `taller2_task_instruction_templates_v1_${slug}`;
}

export const BUILTIN_INSTRUCTION_TEMPLATES: Omit<SavedInstructionTemplate, "createdAt">[] = [
  {
    id: "builtin-acreditacion",
    nombre: "Acreditación y registro",
    texto: `1. Llegar 20 minutos antes del inicio del turno
2. Montar mesa, cartelería y materiales según indicaciones del coordinador
3. Verificar identidad o inscripción y entregar credenciales o pulseras
4. Registrar asistencia en la lista o sistema indicado
5. Ante incidencias, avisar al responsable del evento`,
  },
  {
    id: "builtin-logistica",
    nombre: "Montaje / logística",
    texto: `1. Reunirse en el punto indicado a la hora acordada
2. Revisar checklist de materiales antes de distribuir
3. Colocar señalética y elementos según plano
4. Al finalizar el turno, dejar el espacio ordenado y devolver material`,
  },
  {
    id: "builtin-comunicacion",
    nombre: "Comunicación o redes",
    texto: `1. Usar el tono y hashtags acordados con la organización
2. Publicar solo contenido aprobado o dentro de la guía de marca
3. Incluir mención al evento y al menos una foto de calidad
4. Enviar captura o enlace al canal interno al cerrar la tarea`,
  },
  {
    id: "builtin-apoyo",
    nombre: "Apoyo general en sala",
    texto: `- Ubicarse en el puesto asignado durante todo el turno
- Orientar a asistentes y responder dudas frecuentes
- Reportar emergencias al personal de seguridad o médico
- No abandonar el puesto sin avisar al coordinador`,
  },
  {
    id: "builtin-cierre",
    nombre: "Cierre y desmontaje",
    texto: `1. Recoger materiales y residuos en las zonas indicadas
2. Entregar inventario o llaves al responsable
3. Confirmar en el grupo interno que el turno quedó cerrado
4. Fotografiar el espacio vacío si se pidió evidencia`,
  },
];

function safeParse(raw: string | null): SavedInstructionTemplate[] {
  if (!raw) return [];
  try {
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) return [];
    return data.filter(
      (x): x is SavedInstructionTemplate =>
        typeof x === "object" &&
        x !== null &&
        typeof (x as SavedInstructionTemplate).id === "string" &&
        typeof (x as SavedInstructionTemplate).nombre === "string" &&
        typeof (x as SavedInstructionTemplate).texto === "string"
    );
  } catch {
    return [];
  }
}

export function loadSavedInstructionTemplates(orgId?: string | null): SavedInstructionTemplate[] {
  if (typeof window === "undefined") return [];
  return safeParse(localStorage.getItem(storageKey(orgId))).sort(
    (a, b) => b.createdAt - a.createdAt
  );
}

export function persistInstructionTemplates(
  templates: SavedInstructionTemplate[],
  orgId?: string | null
): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(storageKey(orgId), JSON.stringify(templates));
}

export function saveInstructionTemplate(
  nombre: string,
  texto: string,
  orgId?: string | null
): SavedInstructionTemplate {
  const trimmed = nombre.trim() || "Plantilla sin título";
  const body = texto.trim();
  if (!body) {
    throw new Error("El texto de las instrucciones no puede estar vacío");
  }
  const list = loadSavedInstructionTemplates(orgId);
  const item: SavedInstructionTemplate = {
    id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `t-${Date.now()}`,
    nombre: trimmed,
    texto: body,
    createdAt: Date.now(),
  };
  persistInstructionTemplates([item, ...list], orgId);
  return item;
}

export function deleteInstructionTemplate(id: string, orgId?: string | null): void {
  const list = loadSavedInstructionTemplates(orgId).filter((t) => t.id !== id);
  persistInstructionTemplates(list, orgId);
}
