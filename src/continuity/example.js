// Original synthetic fixture for DeepFrame; FilmDSL-compatible field names.
export const EXAMPLE_PLAN = {
  blueprint_id: 'demo_bar_12', metadata: { project_name: 'Esempio — incontro al bar' }, global_style: 'Realismo, luce serale',
  shots: ['12B', '12C'].map((shot_id, i) => ({
    shot_id,
    narrative_layer: { narrative_action: i ? 'Controcampo: Elena continua a sollevare la tazza.' : 'Elena solleva la tazza con la destra.', emotional_beat: 'Esitazione' },
    staging_layer: { duration_seconds: 5, camera: { shot_scale: 'MCU', angle: 'eye_level', movement: 'static' }, environment_id: 'loc_bar', entities: [{ asset_id: 'char_elena', position: 'centro', action_state: 'Solleva la tazza' }, { asset_id: 'prop_tazza', position: 'nella mano di Elena', action_state: 'sollevata' }], consistency_constraints: ['La tazza rimane nella destra di Elena durante il raccordo.'] },
  })),
};
export const EXAMPLE_CONSTRAINTS = [{ id: 'demo_hand', shot_id: '12C', entity_id: 'prop_tazza', attribute: 'hand', expected: 'destra', evidence: 'Esempio sintetico: azione prevista nel campo 12B.', approved: false }];
