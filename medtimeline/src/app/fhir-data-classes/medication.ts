// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.


import {RxNormCode} from '../clinicalconcepts/rx-norm';
import {LabeledClass} from '../fhir-resource-set';
import {Dosage} from './dosage';

/**
 * This object represents relevant components of a medication contained as part
 * of a MedicationAdministration.
 * This is not a FHIR resource, and differs from the defined Medication
 * documentation at http://hl7.org/fhir/dstu2/medication.html.
 */
export class ContainedMedication extends LabeledClass {
  readonly code: RxNormCode;
  readonly dosage: Dosage;
  readonly id: string;
  constructor(json: any, ingredients: Map<string, any>) {
    super();
    // We want to construct new Medications for jsons containing RxNorm codes.
    if (json.resourceType !== 'Medication') {
      throw Error('Resource must be of type Medication');
    }
    if (json.code) {
      this.label = json.code.text;
      if (json.code.coding) {
        this.code =
            json.code.coding
                .map(
                    // Map the codes to a boolean that is true only if the
                    // encoding is an RxNormCode encoding, and the RxNorm code
                    // appeas in our RxNormCode list that we care about.
                    (coding) => (!coding.system ||
                                 coding.system.indexOf(
                                     RxNormCode.CODING_STRING) !== -1) &&
                        RxNormCode.fromCodeString(coding.code))
                // Filter out any codes that are not RxNorm codes.
                .filter((code) => !!code)[0];
      }
    }
    if (!this.code) {
      throw Error('Medication must have RxNorm code to be useful');
    }
    this.id = json.id;
    const reference = ingredients.get(this.id);
    if (!reference) {
      throw Error(
          'Medication info must have been contained in ingredient list.');
    }
    if (this.id) {
      //  The dosage format is different for contained
      // portions of Medications.
      const dosage = {
        dosage: {
          quantity: {
            value: reference.amount.numerator ?
                reference.amount.numerator.value :
                null,
            unit: reference.amount.numerator ? reference.amount.numerator.unit :
                                               null
          },
        }
      };
      this.dosage = new Dosage(dosage);
    }
  }
}
