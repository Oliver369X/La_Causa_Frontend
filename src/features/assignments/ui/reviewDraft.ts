export type ReviewAction = "aprobar" | "rechazar" | "advertencia" | "informacion";
export const templates: Record<ReviewAction, string> = {
  aprobar: "¡Tu tarea fue aceptada, felicidades! ¡Sigue así!",
  rechazar: "Tu tarea fue rechazada debido a…",
  advertencia: "Mensaje de advertencia:",
  informacion: "Necesitamos más información:",
};
export type ReviewDraft = { action: ReviewAction | null; feedback: string; confirmed: boolean; replace: ReviewAction | null };
export const initialDraft: ReviewDraft = { action: null, feedback: "", confirmed: false, replace: null };
export function completeFeedback(action: ReviewAction | null, feedback: string) {
  if (!action) return false;
  const prefix = action === "rechazar" ? "Tu tarea fue rechazada debido a" : action === "aprobar" ? "" : templates[action];
  let remainder = feedback.trim();
  if (prefix && remainder.toLowerCase().startsWith(prefix.toLowerCase())) remainder = remainder.slice(prefix.length);
  return /[\p{L}\p{N}]/u.test(remainder);
}
export function chooseAction(draft: ReviewDraft, action: ReviewAction): ReviewDraft {
  if (draft.action !== action) {
    if (draft.feedback.trim()) return { ...draft, replace: action };
    return { action, feedback: templates[action], confirmed: false, replace: null };
  }
  return { ...draft, confirmed: completeFeedback(action, draft.feedback) };
}
export function replaceFeedback(draft: ReviewDraft, yes: boolean): ReviewDraft {
  if (!yes || !draft.replace) return { ...draft, replace: null };
  return { action: draft.replace, feedback: templates[draft.replace], confirmed: false, replace: null };
}
