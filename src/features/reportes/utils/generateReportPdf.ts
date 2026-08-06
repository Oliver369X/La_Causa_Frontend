import type { EventAnalytics, EventExpense } from "@/features/analytics/api/analyticsApi";

export interface ReportMetrics {
  voluntarios: boolean;
  eventos: boolean;
  tareas: boolean;
  completadas: boolean;
  tasaFinalizacion: boolean;
  retencion: boolean;
  precisionAsignacion: boolean;
  horasImpacto: boolean;
  mtta: boolean;
  skillsPromedio: boolean;
}

export interface ReportData {
  total_volunteers: number;
  active_events?: number;
  total_events: number;
  total_tasks: number;
  tasks_completed: number;
  tasks_pending: number;
  average_rating?: number | null;
  volunteer_retention_pct?: number | null;
  assignment_precision_pct?: number | null;
  impact_hours_total?: number;
  mtta_audit_seconds?: number | null;
  skills_new_avg_per_volunteer?: number | null;
}

export type ReporteTipo = "formal" | "informal";

export interface ReportComparison {
  current: ReportData;
  previous: ReportData;
  start_date: string;
  end_date: string;
  previous_start_date: string;
  previous_end_date: string;
}

function fmtPctCell(v: number | null | undefined): string {
  return v != null && Number.isFinite(v) ? `${v.toFixed(1)}%` : "—";
}

export async function generateReportPdf(
  data: ReportData,
  metrics: ReportMetrics,
  tipo: ReporteTipo,
  orgName?: string,
  comparison?: ReportComparison
): Promise<void> {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  const doc = new jsPDF();
  const now = new Date().toLocaleDateString("es-BO", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const isFormal = tipo === "formal";

  let y = 20;

  if (isFormal) {
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("REPORTE DE GESTIÓN", 105, y, { align: "center" });
    y += 10;

    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(orgName || "Organización", 105, y, { align: "center" });
    y += 6;

    doc.setFontSize(10);
    doc.text(`Fecha de emisión: ${now}`, 105, y, { align: "center" });
    y += 15;
  } else {
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Reporte Dinámico", 20, y);
    y += 8;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`${orgName || "Organización"} · ${now}`, 20, y);
    y += 12;
  }

  const rows: [string, string | number][] = [];

  const n = (v: number | undefined) => (v ?? 0).toLocaleString();

  if (metrics.voluntarios) {
    rows.push(["Voluntarios", n(data.total_volunteers)]);
  }
  if (metrics.eventos) {
    rows.push(["Eventos", n(data.total_events)]);
  }
  if (metrics.tareas) {
    rows.push(["Total tareas", n(data.total_tasks)]);
  }
  if (metrics.completadas) {
    rows.push(["Tareas completadas", n(data.tasks_completed)]);
  }
  if (metrics.tasaFinalizacion && (data.total_tasks ?? 0) > 0) {
    const rate = Math.round(((data.tasks_completed ?? 0) / (data.total_tasks ?? 1)) * 100);
    rows.push(["Tasa de finalización", `${rate}%`]);
  }

  const fmtPct = (v: number | null | undefined) =>
    v != null && Number.isFinite(v) ? `${v.toFixed(1)}%` : "—";
  const fmtMttaPdf = (sec: number | null | undefined) => {
    if (sec == null || !Number.isFinite(sec)) return "—";
    if (sec < 60) return `${sec.toFixed(1)} s`;
    return `${(sec / 60).toFixed(1)} min`;
  };

  if (metrics.retencion) {
    rows.push(["Retención de voluntarios (≥2 eventos)", fmtPct(data.volunteer_retention_pct)]);
  }
  if (metrics.precisionAsignacion) {
    rows.push(["Precisión de asignación (proxy)", fmtPct(data.assignment_precision_pct)]);
  }
  if (metrics.horasImpacto) {
    rows.push([
      "Horas de impacto (certificados)",
      (data.impact_hours_total ?? 0).toLocaleString(undefined, { maximumFractionDigits: 1 }),
    ]);
  }
  if (metrics.mtta) {
    rows.push(["MTTA auditoría (evidencia → revisión)", fmtMttaPdf(data.mtta_audit_seconds)]);
  }
  if (metrics.skillsPromedio) {
    const s = data.skills_new_avg_per_volunteer;
    rows.push([
      "Skills nuevas / voluntario activo",
      s != null && Number.isFinite(s) ? s.toFixed(2) : "—",
    ]);
  }

  if (rows.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [["Métrica", "Valor"]],
      body: rows,
      theme: isFormal ? "grid" : "plain",
      headStyles: {
        fillColor: isFormal ? [66, 66, 66] : [100, 100, 100],
        textColor: 255,
        fontStyle: "bold",
      },
      styles: {
        fontSize: 10,
      },
      margin: { left: 20, right: 20 },
    });
  }

  if (comparison) {
    const current = comparison.current;
    const previous = comparison.previous;
    const cRate = (current.total_tasks ?? 0) > 0
      ? Math.round(((current.tasks_completed ?? 0) / (current.total_tasks ?? 1)) * 100)
      : 0;
    const pRate = (previous.total_tasks ?? 0) > 0
      ? Math.round(((previous.tasks_completed ?? 0) / (previous.total_tasks ?? 1)) * 100)
      : 0;
    const delta = (a: number, b: number) => a - b;

    const cmpBody: [string, string, string, string][] = [
      [
        "Voluntarios",
        n(current.total_volunteers),
        n(previous.total_volunteers),
        n(delta(current.total_volunteers ?? 0, previous.total_volunteers ?? 0)),
      ],
      [
        "Eventos",
        n(current.total_events),
        n(previous.total_events),
        n(delta(current.total_events ?? 0, previous.total_events ?? 0)),
      ],
      [
        "Tareas",
        n(current.total_tasks),
        n(previous.total_tasks),
        n(delta(current.total_tasks ?? 0, previous.total_tasks ?? 0)),
      ],
      [
        "Completadas",
        n(current.tasks_completed),
        n(previous.tasks_completed),
        n(delta(current.tasks_completed ?? 0, previous.tasks_completed ?? 0)),
      ],
      [
        "Tasa cierre",
        `${cRate}%`,
        `${pRate}%`,
        `${cRate - pRate} pp`,
      ],
    ];

    const ppDelta = (a: number | null | undefined, b: number | null | undefined) => {
      if (a == null || b == null || !Number.isFinite(a) || !Number.isFinite(b)) return "—";
      const d = a - b;
      return `${d >= 0 ? "+" : ""}${d.toFixed(1)} pp`;
    };
    if (metrics.retencion) {
      cmpBody.push([
        "Retención voluntarios",
        fmtPctCell(current.volunteer_retention_pct),
        fmtPctCell(previous.volunteer_retention_pct),
        ppDelta(current.volunteer_retention_pct, previous.volunteer_retention_pct),
      ]);
    }
    if (metrics.precisionAsignacion) {
      cmpBody.push([
        "Precisión asignación",
        fmtPctCell(current.assignment_precision_pct),
        fmtPctCell(previous.assignment_precision_pct),
        ppDelta(current.assignment_precision_pct, previous.assignment_precision_pct),
      ]);
    }
    if (metrics.horasImpacto) {
      const ch = current.impact_hours_total ?? 0;
      const ph = previous.impact_hours_total ?? 0;
      cmpBody.push([
        "Horas impacto",
        ch.toLocaleString(undefined, { maximumFractionDigits: 1 }),
        ph.toLocaleString(undefined, { maximumFractionDigits: 1 }),
        n(delta(ch, ph)),
      ]);
    }
    if (metrics.mtta) {
      cmpBody.push([
        "MTTA auditoría",
        fmtMttaPdf(current.mtta_audit_seconds),
        fmtMttaPdf(previous.mtta_audit_seconds),
        (() => {
          const a = current.mtta_audit_seconds;
          const b = previous.mtta_audit_seconds;
          if (a == null || b == null || !Number.isFinite(a) || !Number.isFinite(b)) return "—";
          const d = a - b;
          return `${d >= 0 ? "+" : ""}${d.toFixed(1)} s`;
        })(),
      ]);
    }
    if (metrics.skillsPromedio) {
      const fmtSk = (x: number | null | undefined) =>
        x != null && Number.isFinite(x) ? x.toFixed(2) : "—";
      const cs = current.skills_new_avg_per_volunteer;
      const ps = previous.skills_new_avg_per_volunteer;
      cmpBody.push([
        "Skills / voluntario",
        fmtSk(cs),
        fmtSk(ps),
        cs != null && ps != null && Number.isFinite(cs) && Number.isFinite(ps)
          ? `${(cs - ps >= 0 ? "+" : "")}${(cs - ps).toFixed(2)}`
          : "—",
      ]);
    }

    const nextY = ((doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? y) + 8;
    autoTable(doc, {
      startY: nextY,
      head: [["Métrica", "Periodo actual", "Periodo anterior", "Variación"]],
      body: cmpBody,
      theme: "striped",
      headStyles: {
        fillColor: [45, 55, 72],
        textColor: 255,
        fontStyle: "bold",
      },
      styles: { fontSize: 9 },
      margin: { left: 20, right: 20 },
    });
  }

  const filename = `reporte-${orgName?.replace(/\s+/g, "-") || "org"}-${Date.now()}.pdf`;
  doc.save(filename);
}

/** Reporte financiero y operativo de un evento puntual. */
export async function generateEventReportPdf(
  event: EventAnalytics,
  orgName?: string,
  expenses: EventExpense[] = [],
): Promise<void> {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const doc = new jsPDF();
  const currencies = new Set([
    ...Object.keys(event.costos_estimados_por_moneda),
    ...Object.keys(event.gastos_por_moneda),
    ...Object.keys(event.gastos_pendientes_por_moneda),
  ]);
  const financialRows = [...currencies].map((currency) => {
    const estimated = event.costos_estimados_por_moneda[currency] ?? 0;
    const actual = event.gastos_por_moneda[currency] ?? 0;
    const pending = event.gastos_pendientes_por_moneda[currency] ?? 0;
    const variance = actual - estimated;
    return [
      currency,
      estimated.toFixed(2),
      actual.toFixed(2),
      pending.toFixed(2),
      `${variance >= 0 ? "+" : ""}${variance.toFixed(2)}${estimated > 0 ? ` (${((variance / estimated) * 100).toFixed(1)}%)` : ""}`,
    ];
  });
  const costPerVolunteer = Object.fromEntries(
    Object.entries(event.gastos_por_moneda).map(([currency, amount]) => [
      currency,
      event.voluntarios_registrados > 0 ? amount / event.voluntarios_registrados : 0,
    ]),
  );
  const costPerHour = Object.fromEntries(
    Object.entries(event.gastos_por_moneda).map(([currency, amount]) => [
      currency,
      event.horas_voluntarias > 0 ? amount / event.horas_voluntarias : 0,
    ]),
  );
  const categoryTotals = new Map<string, number>();
  for (const expense of expenses.filter((item) => item.estado !== "cancelado")) {
    const key = `${expense.categoria} (${expense.moneda})`;
    categoryTotals.set(key, (categoryTotals.get(key) ?? 0) + expense.total);
  }
  const categoryRows = [...categoryTotals.entries()].map(([category, total]) => [category, total.toFixed(2)]);
  const money = (values: Record<string, number>) => Object.entries(values)
    .map(([currency, amount]) => `${Number(amount).toFixed(2)} ${currency}`)
    .join(" · ") || "—";

  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("REPORTE DE EVENTO", 105, 20, { align: "center" });
  doc.setFontSize(13);
  doc.text(event.titulo, 105, 29, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(orgName || "Organización", 105, 36, { align: "center" });

  autoTable(doc, {
    startY: 45,
    head: [["Indicador", "Resultado"]],
    body: [
      ["Estado", event.estado],
      ["Voluntarios", String(event.voluntarios_registrados)],
      ["Tareas completadas", `${event.tareas_completadas}/${event.tareas_totales}`],
      ["Horas acreditadas", String(event.horas_voluntarias)],
      ["Entregas aprobadas", String(event.entregas_aprobadas)],
      ["Entregas rechazadas", String(event.entregas_rechazadas)],
      ["Costo estimado", money(event.costos_estimados_por_moneda)],
      ["Costo real", money(event.gastos_por_moneda)],
      ["Pendiente de aprobacion", money(event.gastos_pendientes_por_moneda)],
      ["Costo real por voluntario", money(costPerVolunteer)],
      ["Costo real por hora", money(costPerHour)],
    ],
    theme: "grid",
    headStyles: { fillColor: [95, 70, 180], textColor: 255 },
  });
  let nextY = ((doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? 45) + 10;
  doc.setFont("helvetica", "bold");
  doc.text("Consolidado financiero", 20, nextY);
  autoTable(doc, {
    startY: nextY + 4,
    head: [["Moneda", "Estimado", "Real", "Pendiente", "Variación"]],
    body: financialRows.length ? financialRows : [["BOB", "0.00", "0.00", "0.00", "0.00"]],
    theme: "grid",
    headStyles: { fillColor: [95, 70, 180], textColor: 255 },
    styles: { fontSize: 9 },
  });
  nextY = ((doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? nextY) + 10;
  doc.setFont("helvetica", "bold");
  doc.text("Gastos por categoría", 20, nextY);
  autoTable(doc, {
    startY: nextY + 4,
    head: [["Categoría", "Total"]],
    body: categoryRows.length ? categoryRows : [["Sin gastos adicionales", "0.00"]],
    theme: "striped",
    headStyles: { fillColor: [45, 55, 72], textColor: 255 },
    styles: { fontSize: 9 },
  });
  nextY = ((doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? nextY) + 10;
  doc.setFont("helvetica", "bold");
  doc.text("Desglose de tareas y costos", 20, nextY);
  autoTable(doc, {
    startY: nextY + 4,
    head: [["Tarea", "Asignaciones", "Completadas", "Estimado", "Real"]],
    body: event.tareas.map((task) => [
      task.titulo,
      String(task.asignaciones),
      String(task.completadas),
      task.costo_estimado == null ? "—" : `Bs ${task.costo_estimado.toFixed(2)}`,
      task.costo_real == null ? money(task.gastos) : `Bs ${task.costo_real.toFixed(2)}`,
    ]),
    theme: "striped",
    headStyles: { fillColor: [45, 55, 72], textColor: 255 },
    styles: { fontSize: 9 },
  });
  nextY = ((doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? nextY) + 10;
  doc.setFont("helvetica", "bold");
  doc.text("Gastos y respaldos", 20, nextY);
  autoTable(doc, {
    startY: nextY + 4,
    head: [["Categoría", "Descripción", "Proveedor", "Factura", "Total", "Estado", "Respaldo"]],
    body: expenses.length ? expenses.map((expense) => [
      expense.categoria,
      expense.descripcion,
      expense.proveedor || "-",
      expense.numero_comprobante || "-",
      `${expense.total.toFixed(2)} ${expense.moneda}`,
      expense.estado,
      expense.comprobante_url ? "Sí" : "No",
    ]) : [["-", "Sin gastos adicionales registrados", "-", "-", "-", "-", "-"]],
    theme: "striped",
    headStyles: { fillColor: [45, 55, 72], textColor: 255 },
    styles: { fontSize: 8 },
  });
  doc.save(`reporte-evento-${event.titulo.replace(/\s+/g, "-")}-${Date.now()}.pdf`);
}
