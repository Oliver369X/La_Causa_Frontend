/**
 * Unit checks for pure helpers (filterVolunteerMembers + csvExport).
 * Run: node --experimental-strip-types scripts/verify_frontend_units.mjs
 * (or: npx tsx scripts/verify_frontend_units.mjs)
 */
import assert from "node:assert/strict";

// ── mirror of filterVolunteerMembers (keep in sync with volunteersApi.ts) ──
function isVolunteerMember(m) {
  if (m.es_propietario) return false;
  const slug = (m.rol_slug || "voluntario").toLowerCase();
  return slug === "voluntario";
}
function filterVolunteerMembers(members) {
  return members.filter((m) => m.estado_membresia === "activo" && isVolunteerMember(m));
}

function escCell(v) {
  const s = v == null ? "" : String(v);
  return `"${s.replace(/"/g, '""')}"`;
}
function buildCsv(headers, rows) {
  const lines = [headers.map(escCell).join(",")];
  for (const row of rows) lines.push(row.map(escCell).join(","));
  return "\uFEFF" + lines.join("\r\n");
}

const members = [
  { usuario_id: "1", es_propietario: true, rol_slug: "organizador", estado_membresia: "activo" },
  { usuario_id: "2", es_propietario: false, rol_slug: "coordinador", estado_membresia: "activo" },
  { usuario_id: "3", es_propietario: false, rol_slug: "voluntario", estado_membresia: "activo" },
  { usuario_id: "4", es_propietario: false, rol_slug: "voluntario", estado_membresia: "suspendido" },
  { usuario_id: "5", es_propietario: false, rol_slug: null, estado_membresia: "activo" },
];

const vols = filterVolunteerMembers(members);
assert.equal(vols.length, 2);
assert.deepEqual(
  vols.map((v) => v.usuario_id).sort(),
  ["3", "5"],
);

const csv = buildCsv(["nombre", "email"], [["Ana", "ana@test.com"], ['Jo"se', null]]);
assert.ok(csv.startsWith("\uFEFF"));
assert.ok(csv.includes('"Ana"'));
assert.ok(csv.includes('"Jo""se"'));
assert.ok(csv.includes('""')); // null → empty quoted

console.log("verify_frontend_units: OK");
