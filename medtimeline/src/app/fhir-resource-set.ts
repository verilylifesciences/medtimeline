// Copyright 2019 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.


import {DateTime} from 'luxon';

import {RXNORM_CODES, RxNormCode} from './clinicalconcepts/rx-norm';
import {ResultError} from './result-error';

// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.


export class TimestampedObject {
  constructor(readonly timestamp: DateTime) {}
}

export class ResultClassWithTimestamp extends TimestampedObject {
  constructor(
      readonly label: string, readonly requestId: string,
      readonly timestamp: DateTime) {
    super(timestamp);
  }
}

export class RawResource {
  constructor(public json: any, public requestId: string) {}
}

/**
 * A class that has label and requestId attributes.
 *
 * TODO: Figure out how to combine with ResultClassWithTimestamp.
 */
export class ResultClass {
  constructor(readonly label: string, readonly requestId: string) {}

  /**
   * Parses the passed-in JSON and gets out a RxNormCode.
   *
   * This function prefers to directly get the RxNorm code from the resource's
   * encoding. If it can't get that, it will get the prescription's label,
   * then try to map it back to a RxNorm code. If it can't find a suitable
   * RxNorm code, it will pass back an undefined object.
   */
  static extractMedicationEncoding(json: any): RxNormCode {
    let rxNormCode: RxNormCode;
    if (json.medicationCodeableConcept) {
      if (json.medicationCodeableConcept.coding) {
        rxNormCode =
            (json.medicationCodeableConcept.coding
                 .map(
                     // Map the codes to a boolean that is true only if the
                     // encoding is an RxNorm encoding, and the RxNorm code
                     // appears in our RxNormCode list that we care about.
                     (coding) => (!coding.system ||
                                  coding.system.indexOf(
                                      RxNormCode.CODING_STRING) !== -1) &&
                         RxNormCode.fromCodeString(coding.code))
                 // Filter out any codes that are not RxNorm codes.
                 .filter((code) => !!code))[0];
      } else if (json.medicationCodeableConcept.text) {
        // MedicationAdministrations do not come out of the BCH system with a
        // RxNorm code on at this point, so if we don't get a RxNorm code,
        // as a stopgap we reverse lookup based on the string name.
        const rxNormString = json.medicationCodeableConcept.text;
        const codesWithName = RXNORM_CODES.filter(
            x => x.label.toLowerCase() === rxNormString.toLowerCase());
        rxNormCode = codesWithName.length === 1 ? codesWithName[0] : undefined;
      }
    }
    return rxNormCode;
  }
}

/**
 * A set of FHIR resources. All resources that are a part of this set must
 * have the same label.
 */
export class FhirResourceSet<T extends ResultClass> {
  /**
   * The list of resources that belong together.
   */
  readonly resourceList: T[];
  readonly requestIds: Set<string>;

  /*
   * The label for this set of data. All data in this set
   * must have the same label.
   */
  label: string;

  /**
   * Constructor for FhirResourceSet.
   * @param resourceList The list of resources belonging together.
   * @throws Error if the resources have different labels, or if there is not
   *     a label.
   */
  constructor(resourceList: T[]) {
    this.requestIds = new Set(resourceList.map(resource => resource.requestId));

    if (!resourceList) {
      throw new ResultError(this.requestIds, 'Resource list is undefined.');
    }

    if (resourceList.length > 0) {
      const firstLabel = resourceList[0].label;
      if (!firstLabel) {
        throw new ResultError(
            this.requestIds, 'The first resource does not have a label.');
      }

      const allLabels = new Set(resourceList.map(rs => rs.label.toLowerCase()));
      if (allLabels.size !== 1) {
        throw new ResultError(
            this.requestIds,
            `The resource list in this set has mixed labels: ${
                Array.from(allLabels.values())}`);
      }
      this.label = firstLabel;
    }

    this.resourceList = resourceList;
  }
}
