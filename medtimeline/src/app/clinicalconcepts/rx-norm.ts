// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {APP_TIMESPAN} from 'src/constants';

import {ResourceCode} from '../clinicalconcepts/resource-code-group';
import {MedicationOrderSet} from '../fhir-resources/medication-order';
import {FhirService} from '../fhir-server/fhir.service';
import * as Colors from '../theme/verily_colors';

import {DisplayGrouping} from './display-grouping';

export class MedicationConceptGroup extends DisplayGrouping {}

export const ANTIBIOTIC =
    new MedicationConceptGroup('Antibiotic', Colors.DEEP_TURQUOISE);

export const MEDICATION_GROUPS = [ANTIBIOTIC];

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
