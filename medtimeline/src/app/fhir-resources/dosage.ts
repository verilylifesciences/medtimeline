import {fixUnitAbbreviations} from '../utils/unit_utils';

// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

/**
 * This object represents relevant components of dosage information, provided
 * in MedicationOrders and MedicationAdministrations.
 */
export class Dosage {
  readonly quantity: number;
  readonly unit: string;
  readonly route: string;
  readonly text: string;

  constructor(json: any) {
    if (json.dosage) {
      if (json.dosage.quantity) {
        this.quantity = json.dosage.quantity.value;
        this.unit = fixUnitAbbreviations(json.dosage.quantity.unit);
      }
      if (json.dosage.route) {
        this.route = json.dosage.route.text;
      }
      /*
       * The text for the dosage usually contains information about the rate of
       * administration, however the format across different
       * MedicationAdministrations is not consistent. Ex: "500 mg IV q6hr" vs
       * "250 mg = 1 caps Oral Once"
       */
      this.text = json.dosage.text;
    }
  }
}
