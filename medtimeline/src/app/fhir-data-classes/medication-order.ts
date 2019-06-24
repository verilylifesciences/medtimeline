// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

// Disable this check because it's for IE 11 compatibility and we're not worried
// about that in our testing code.
/* tslint:disable:object-literal-shorthand*/

import {MedicationConceptGroup, RxNormCode} from '../clinicalconcepts/rx-norm';
import {FhirResourceSet, ResultClass} from '../fhir-resource-set';
import {FhirService} from '../fhir.service';
import {fixUnitAbbreviations} from '../unit_utils';
import {ResultError} from './../result-error';

import {AnnotatedAdministration, MedicationAdministration, MedicationAdministrationSet} from './medication-administration';

/**
 * This object represents a FHIR MedicationOrder. It does not contain
 * all the information in a standard MedicationOrder (see
 * https://www.hl7.org/fhir/DSTU2/medicationorder.html) but instead
 * stores only the information we're interested in seeing.
 */
export class MedicationOrder extends ResultClass {
  readonly rxNormCode: RxNormCode;
  readonly dosageRetrievalError = 'Could not retrieve dosage instructions.';
  firstAdministration: MedicationAdministration;
  lastAdmininistration: MedicationAdministration;
  administrationsForOrder: MedicationAdministrationSet;
  readonly orderId: string;

  // By default, we set the instruction message as the retrieval error message,
  // and change it if we find a valid dosage instruction.
  dosageInstruction = this.dosageRetrievalError;
  /**
   * Makes an MedicationOrder out of a list of MedicationAdministrations.
   * https://www.hl7.org/fhir/DSTU2/medicationorder.html
   * @param json The json representing this MedicationOrder.
   * @param requestId The x-request-id of the request that acquired this
   *     medication order's data.
   */
  constructor(private json: any, requestId: string) {
    // A MedicationOrder's label is one of the following in order of preference:
    // 1) the medication reference's display anme
    // 2) the medication encoding's text
    // 3) the order's ID
    super(
        json.medicationReference ? json.medicationReference.display :
                                   json.medicationCodeableConcept ?
                                   json.medicationCodeableConcept.text :
                                   json.id,
        requestId);

    if (json.dosageInstruction && json.dosageInstruction[0]) {
      if (json.dosageInstruction.length > 1) {
        throw new ResultError(
            new Set([this.requestId]),
            'JSON must only include one dosage instruction.', json);
      }
      this.dosageInstruction = json.dosageInstruction[0].text;
    }
    this.orderId = json.id;

    this.rxNormCode = ResultClass.extractMedicationEncoding(json);

    if (!(this.rxNormCode && this.label)) {
      throw new ResultError(
          new Set([this.requestId]),
          'JSON must include RxNormCode and a label to be included as a MedicationOrder.',
          json);
    }

    // Check this MedicationOrder label against the RxNorm label.
    if (this.label.toLowerCase() !== this.rxNormCode.label.toLowerCase()) {
      throw new ResultError(
          new Set([this.requestId]),
          `The label for this MedicationOrder's RxNorm code doesn't match ` +
              `the label in the data. MedicationOrder label: ${this.label}. ` +
              `RxNorm label: ${this.rxNormCode.label}.`);
    }
  }

  /**
   * Sets the MedicationAdministration info for this MedicationOrder.
   * @param fhirService The FhirService used to find the
   *     MedicationAdministrations corresponding to this MedicationOrder.
   * @throws Error if the label for the list of administrations does not match
   *     the label for this order.
   * @returns This order, after all the promises are resolved.
   */
  setMedicationAdministrations(fhirService: FhirService):
      Promise<MedicationOrder> {
    return fhirService
        .getMedicationAdministrationsWithOrder(this.orderId, this.rxNormCode)
        .then(
            medAdmins => {
              if (!medAdmins) {
                return this;
              }
              medAdmins = medAdmins.sort((a, b) => {
                return a.timestamp.toMillis() - b.timestamp.toMillis();
              });
              this.firstAdministration = medAdmins[0];
              this.lastAdmininistration = medAdmins[medAdmins.length - 1];

              const admins = [];
              for (let i = 0; i < medAdmins.length; i++) {
                const admin = medAdmins[i];
                // We want the dose counts and day counts to start with 1 so we
                // add 1 to the day count and the index for the dose.
                const dayCount =
                    admin.timestamp.diff(this.firstAdministration.timestamp)
                        .as('day') + 1;
                const annotated = new AnnotatedAdministration(
                    admin, i + 1 /* dose in order starts at 1 */, dayCount,
                    i > 0 ? admins[i - 1] : undefined);
                admins.push(annotated);
              }
              this.administrationsForOrder =
                  new MedicationAdministrationSet(admins);
              return this;
            },
            rejection => {
              // Throw an error if the construction of the
              // MedicationAdministration results in an error.
              throw rejection;
            });
  }
}

/**
 * A set of MedicationOrders that belong together as part of the same
 * series, representing all orders for the medicine in a given time period.
 */
export class MedicationOrderSet extends FhirResourceSet<MedicationOrder> {
  /*
   * The RxNormCode for this set of data. All data in this set
   * must have the same RxNormCode.
   */
  readonly rxNormCode: RxNormCode;
  readonly medicationConcept: MedicationConceptGroup;

  readonly maxDose: number;
  readonly minDose: number;
  readonly unit: string;

  /**
   * Constructor for MedicationOrderSet.
   * @param MedicationOrderList The list of MedicationOrders belonging
   *     together. This list is sorted by first MedicationAdministration for
   *     each order.
   * @throws Error if the observations have different labels/RxNormCodes, or
   *     if there is not a label/RxNormCode.
   */
  constructor(medicationOrderList: MedicationOrder[]) {
    // Sort the list by first administration.
    medicationOrderList = medicationOrderList.sort(function(a, b) {
      return a.firstAdministration.timestamp.toMillis() -
          b.firstAdministration.timestamp.toMillis();
    });
    super(medicationOrderList);
    // Set the RxNormCode and MedicationConceptGroup for this
    // MedicationOrderSet.
    if (medicationOrderList.length > 0) {
      const requestIdsString = Array.from(this.requestIds).join(', ');

      const firstRxNorm = medicationOrderList[0].rxNormCode;
      if (!firstRxNorm) {
        throw new ResultError(
            this.requestIds,
            'The first resource does not have an RxNorm code.');
      }

      for (const rs of medicationOrderList) {
        if (rs.rxNormCode !== firstRxNorm) {
          throw new ResultError(
              this.requestIds,
              'The resource list in this set has mixed RxNorm codes.');
        }
      }
      this.rxNormCode = firstRxNorm;
      this.medicationConcept = this.rxNormCode.displayGrouping;

      this.minDose = Math.min(
          ...medicationOrderList.map(x => x.administrationsForOrder.minDose));
      this.maxDose = Math.max(
          ...medicationOrderList.map(x => x.administrationsForOrder.maxDose));

      const units =
          new Set(medicationOrderList.map(x => x.administrationsForOrder.unit));
      if (units.size > 1) {
        throw new ResultError(
            this.requestIds,
            `Different units in the order set: ${Array.from(units.values())}`);
      }
      this.unit = fixUnitAbbreviations(Array.from(units.values())[0]);
    }
  }
}
/* tslint:enable:object-literal-shorthand*/
