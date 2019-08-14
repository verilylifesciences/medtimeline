// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

/** This is the URL for the coding system for observation interpretations. */
export const OBSERVATION_INTERPRETATION_VALUESET_URL =
    'http://hl7.org/fhir/ValueSet/observation-interpretation';

/**
 * These are codes corresponding to ObservationInterpretations used in
 * MicrobioGraph.
 */
export const CHECK_RESULT_CODE = 'CHECKRESULT';
export const NEGFLORA_CODE = 'NEGORFLORA';
export const NEG_CODE = 'NEG';
export const NORMAL = 'N';
export const PARTIAL = 'Partial';

/**
 * Represents the possible interpretations for observations. Each interpretation
 * has a code (usually 1-3 characters) plus a text description for display.
 * This class also keeps track of a map of codes to display text.
 */
export class ObservationInterpretation {
  static codeToObject = new Map<string, ObservationInterpretation>();

  readonly code: string;
  readonly display: string;

  constructor(code: string, display: string) {
    this.code = code;
    this.display = display;
    ObservationInterpretation.codeToObject.set(code, this);
  }
}

/**
 * These are the FHIR standard value set values.
 * http://hl7.org/fhir/valueset-observation-interpretation.html
 */
const STANDARD_FHIR_INTERPRETATIONS = [
  new ObservationInterpretation('<', 'Off scale low'),
  new ObservationInterpretation('>', 'Off scale high'),
  new ObservationInterpretation('A', 'Abnormal'),
  new ObservationInterpretation('A', 'Critically abnormal'),
  new ObservationInterpretation('AC', 'Anti-complementary substances present'),
  new ObservationInterpretation('B', 'Better'),
  new ObservationInterpretation('D', 'Significant change down'),
  new ObservationInterpretation('DET', 'Detected'),
  new ObservationInterpretation('H', 'High'),
  new ObservationInterpretation('HH', 'Critically high'),
  new ObservationInterpretation('HM', 'Hold for Medical Review'),
  new ObservationInterpretation('HU', 'Very high'),
  new ObservationInterpretation('I', 'Intermediate'),
  new ObservationInterpretation('IE', 'Insufficient evidence'),
  new ObservationInterpretation('IND', 'Indeterminate'),
  new ObservationInterpretation('L', 'Low'),
  new ObservationInterpretation('LL', 'Critically low'),
  new ObservationInterpretation('LU', 'Very low'),
  new ObservationInterpretation(
      'MS',
      'Moderately susceptible. Indicates for microbiology susceptibilities only.'),
  new ObservationInterpretation(NORMAL, 'Normal'),
  new ObservationInterpretation('ND', 'Not Detected'),
  new ObservationInterpretation(NEG_CODE, 'Negative'),
  new ObservationInterpretation('NR', 'Non-reactive'),
  new ObservationInterpretation('NS', 'Non-susceptible'),
  new ObservationInterpretation(
      'null', 'No range defined, or normal ranges don\'t apply'),
  new ObservationInterpretation(
      'OBX', 'Interpretation qualifiers in separate OBX segments'),
  new ObservationInterpretation('POS', 'Positive'),
  new ObservationInterpretation('QCF', 'Quality Control Failure'),
  new ObservationInterpretation('R', 'Resistant'),
  new ObservationInterpretation('RR', 'Reactive'),
  new ObservationInterpretation('S', 'Susceptible'),
  new ObservationInterpretation('SDD', 'Susceptible-dose dependent'),
  new ObservationInterpretation('SYN-R', 'Synergy - resistant'),
  new ObservationInterpretation('SYN-S', 'Synergy - susceptible'),
  new ObservationInterpretation('TOX', 'Cytotoxic substance present'),
  new ObservationInterpretation('U', 'Significant change up'),
  new ObservationInterpretation(
      'VS',
      'Very susceptible. Indicates for microbiology susceptibilities only.'),
  new ObservationInterpretation('W', 'Worse'),
  new ObservationInterpretation('WR', 'Weakly reactive')
];

/**
 * This valueset is extensible, so here are some that BCH extends it with
 * for its microbiology results.
 */
const BCH_CUSTOM_INTERPRETATIONS = [
  new ObservationInterpretation(CHECK_RESULT_CODE, 'Check result'),
  new ObservationInterpretation(NEGFLORA_CODE, 'Negative or Flora')
];

const ALL_INTERPRETATIONS =
    [].concat(BCH_CUSTOM_INTERPRETATIONS, STANDARD_FHIR_INTERPRETATIONS);
