export interface ReportMetrics {
  voluntarios: boolean;
  eventos: boolean;
  tareas: boolean;
  completadas: boolean;
  tasaFinalizacion: boolean;
}

export interface ReportData {
  total_volunteers: number;
  active_events?: number;
  total_events: number;
  total_tasks: number;
  tasks_completed: number;
  tasks_pending: number;
  average_rating?: number | null;
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

    const nextY = ((doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? y) + 8;
    autoTable(doc, {
      startY: nextY,
      head: [["Métrica", "Periodo actual", "Periodo anterior", "Variación"]],
      body: [
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
      ],
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
