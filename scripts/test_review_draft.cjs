const fs = require('node:fs');
const assert = require('node:assert/strict');
const ts = require('typescript');
const code = ts.transpileModule(fs.readFileSync('src/features/assignments/ui/reviewDraft.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const exported = {};
new Function('exports', code)(exported);
const { initialDraft, chooseAction, completeFeedback, replaceFeedback, templates } = exported;

let draft = chooseAction(initialDraft, 'rechazar');
assert.equal(draft.feedback, templates.rechazar);
assert.equal(draft.confirmed, false);
assert.equal(chooseAction(draft, 'rechazar').confirmed, false, 'placeholder must not confirm');
draft = { ...draft, feedback: 'Tu tarea fue rechazada debido a que falta la captura solicitada.' };
draft = chooseAction(draft, 'rechazar');
assert.equal(draft.confirmed, true);
const switching = chooseAction(draft, 'aprobar');
assert.equal(switching.replace, 'aprobar');
assert.equal(switching.feedback, draft.feedback);
assert.deepEqual(replaceFeedback(switching, false), draft, 'No preserves text and selected action');
draft = replaceFeedback(switching, true);
assert.equal(draft.action, 'aprobar');
assert.equal(draft.confirmed, false);
assert.equal(chooseAction(draft, 'aprobar').confirmed, true);
for (const action of ['advertencia', 'informacion']) {
  draft = chooseAction(initialDraft, action);
  assert.equal(completeFeedback(action, draft.feedback), false);
  draft = { ...draft, feedback: draft.feedback + ' Adjunta una foto legible.' };
  assert.equal(chooseAction(draft, action).confirmed, true);
}
assert.equal(completeFeedback('rechazar', 'Tu tarea fue rechazada debido a.....'), false);
assert.equal(completeFeedback('aprobar', '  '), false);
assert.equal(chooseAction({ ...initialDraft, feedback: 'Texto propio' }, 'aprobar').replace, 'aprobar');
console.log('Review draft: 17 assertions passed (actual TypeScript module).');
