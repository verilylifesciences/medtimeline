// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {APP_TIMESPAN} from 'src/constants';

import {ResourceCode} from '../clinicalconcepts/resource-code-group';
import {MedicationOrderSet} from '../fhir-data-classes/medication-order';
import {FhirService} from '../fhir.service';
import * as BCHColors from '../theme/bch_colors';

import {DisplayGrouping} from './display-grouping';

export class MedicationConceptGroup extends DisplayGrouping {}

export const ANTIVIRAL =
    new MedicationConceptGroup('Antiviral', BCHColors.BOSTON_PURPLE);
export const ANTIBIOTIC =
    new MedicationConceptGroup('Antibiotic', BCHColors.BOSTON_INDIGO);
export const ANTIFUNGAL =
    new MedicationConceptGroup('Antifungal', BCHColors.BOSTON_YELLOW);

export const MEDICATION_GROUPS = [ANTIVIRAL, ANTIBIOTIC, ANTIFUNGAL];

/**
 * Holds RXNorm codes and orders corresponding to them.
 */
export class RxNormCode extends ResourceCode {
  static readonly CODING_STRING = 'http://www.nlm.nih.gov/research/umls/rxnorm';

  /* Contains a set of medication orders for this RxNorm code. */
  orders: MedicationOrderSet;

  dataAvailableInAppTimeScope(fhirService: FhirService): Promise<boolean> {
    return fhirService.medicationsPresentWithCode(this, APP_TIMESPAN);
  }
}

export const RXNORM_CODES = [
  // Parenteral antibiotics
  new RxNormCode('11124', ANTIBIOTIC, 'Vancomycin', true),
  new RxNormCode('1596450', ANTIBIOTIC, 'Gentamicin')
];
