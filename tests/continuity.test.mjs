import test from 'node:test';
import assert from 'node:assert/strict';
import { compareObservations, createContinuityId, frameReviewRequest, importPlan, reportProject, validateBlueprint, validateConstraint, validateModelObservations } from '../src/continuity/continuity.js';
import { EXAMPLE_PLAN, EXAMPLE_CONSTRAINTS } from '../src/continuity/example.js';
const bp = () => structuredClone(EXAMPLE_PLAN);
const checks = () => EXAMPLE_CONSTRAINTS.map(c => ({ ...c, approved: true }));
const observed = overrides => [{ constraint_id: 'demo_hand', visibility: 'visible', value: 'sinistra', evidence: 'Presa verificata nel frame corrente.', source: 'manual', ...overrides }];

test('imports native CineCrew fields and preserves render/assembly layers', () => {
  const p = bp(); p.shots[0].render_layer = { image: { resolved_t2i: 'original prompt' } }; p.shots[0].assembly_layer = { transition_in: 'cut' };
  assert.deepEqual(importPlan(JSON.stringify(p)).blueprint, p);
});
test('report round-trip invalidates previous approvals and observations', () => {
  const report = reportProject({ blueprint: bp(), constraints: checks(), reviews: [{ id: 'old-review' }] });
  const imported = importPlan(JSON.stringify(report));
  assert.equal(imported.constraints[0].approved, false); assert.deepEqual(imported.reviews, []);
});
test('rejects duplicate shots, missing staging, invalid duration and malformed camera', () => {
  const duplicate = bp(); duplicate.shots[1].shot_id = '12B'; assert.throws(() => validateBlueprint(duplicate));
  const missing = bp(); delete missing.shots[0].staging_layer; assert.throws(() => validateBlueprint(missing));
  const duration = bp(); duration.shots[0].staging_layer.duration_seconds = 0; assert.throws(() => validateBlueprint(duration));
  const camera = bp(); camera.shots[0].staging_layer.camera.shot_scale = {}; assert.throws(() => validateBlueprint(camera));
});
test('unknown entities and unsupported attributes cannot become approved checks', () => {
  assert.throws(() => validateConstraint({ ...checks()[0], entity_id: 'prop_missing' }, bp()));
  assert.throws(() => validateConstraint({ ...checks()[0], attribute: 'automatic_reshoot' }, bp()));
});
test('does not review unapproved constraints or other shots', () => {
  assert.deepEqual(compareObservations(EXAMPLE_CONSTRAINTS, observed(), '12C'), []);
  assert.deepEqual(compareObservations(checks(), observed(), '12B'), []);
});
test('known mismatch produces a possible issue and never automatic reshoot', () => {
  const result = compareObservations(checks(), observed(), '12C')[0];
  assert.equal(result.status, 'possible_issue'); assert.match(result.suggestion, /Nessun rigiro automatico/);
});
test('matching values normalize case and whitespace without certifying footage', () => {
  assert.equal(compareObservations(checks(), observed({ value: ' DESTRA ' }), '12C')[0].status, 'no_discrepancy');
});
test('occlusion and uncertain results are unverifiable even if model guesses a value', () => {
  for (const visibility of ['not_visible', 'uncertain']) assert.equal(compareObservations(checks(), observed({ visibility }), '12C')[0].status, 'unverifiable');
  assert.equal(compareObservations(checks(), [], '12C')[0].status, 'unverifiable');
});
test('missing model checks remain unknown instead of silently passing', () => {
  const rows = validateModelObservations({ observations: [] }, checks(), '12C');
  assert.equal(rows[0].visibility, 'uncertain'); assert.equal(rows[0].source, 'model');
});
test('rejects fabricated IDs, duplicate results, invalid visibility and empty evidence', () => {
  for (const observations of [observed({ constraint_id: 'invented' }), [...observed(), ...observed()], observed({ visibility: 'certain' }), observed({ evidence: '' }), observed({ value: '' })]) {
    assert.throws(() => validateModelObservations({ observations }, checks(), '12C'));
  }
});
test('vision request contains actual images, approved checks, current frame last, and cancellation', () => {
  const controller = new AbortController(); const frame = 'data:image/jpeg;base64,AAAA'; const ref = 'data:image/png;base64,BBBB';
  const req = frameReviewRequest(bp(), checks(), '12C', frame, ref, controller.signal);
  assert.equal(req.signal, controller.signal); assert.equal(req.user[1].image_url.url, ref); assert.equal(req.user[2].image_url.url, frame);
  assert.match(req.system, /Non dedurre asse o movimento/); assert.throws(() => frameReviewRequest(bp(), checks(), '12C', 'file:///private', ref));
});
test('report retains decision, provenance and check snapshot, but no image data', () => {
  const project = { blueprint: bp(), constraints: checks(), reviews: [{ decision: 'pickup_requested', source: 'manual', constraints: checks(), results: compareObservations(checks(), observed(), '12C') }] };
  const report = reportProject(project); assert.equal(report.reviews[0].decision, 'pickup_requested'); assert.match(report.scope, /singoli fotogrammi/); assert.doesNotMatch(JSON.stringify(report), /data:image/);
});

test("IDs remain usable on non-secure preview hosts without randomUUID", () => {
  assert.notEqual(createContinuityId({}), createContinuityId({}));
  assert.equal(createContinuityId({ randomUUID: () => "known-id" }), "known-id");
});
