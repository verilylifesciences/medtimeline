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
 * FHIR element for MedicationOrderStatus, from the DSTU2 version of the
 * standard.
 * http://hl7.org/fhir/DSTU2/valueset-medication-order-status.html
 */
export const MedicationOrderStatus = {
  ACTIVE: 'active',
  ON_HOLD: 'on-hold',
  COMPLETED: 'completed',
  ENTERED_IN_ERROR: 'entered-in-error',
  STOPPED: 'stopped',
  DRAFT: 'draft',
}

/**
 * This object represents a FHIR MedicationOrder. It does not contain
 * all the information in a standard MedicationOrder (see
 * https://www.hl7.org/fhir/DSTU2/medicationorder.html) but instead
 * stores only the information we're interested in seeing.
 */
export class MedicationOrder extends ResultClass {
  readonly rxNormCode: RxNormCode;
  readonly dosageRetrievalError = 'Could not retrieve dosage instructions.';
  readonly status: string;
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
    this.status = json.status;

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
}

/**
 * This object stores a FHIR MedicationOrder object along with additional
 * information including MedicationAdministration information.
 *
 * During initialization, it calculates first/last medication administrations
 * based on the list of medication administrations that the
 * AnnotatedMedicationOrder is initialized with. It does NOT fetch all
 * administrations for the entire order - since this is a very time consuming
 * FHIR call.
 */
export class AnnotatedMedicationOrder extends ResultClass {
  readonly order: MedicationOrder;

  /**
   * MedicationAdministrationSet associated with the order. This is based
   * on the MedicationAdministrations that this object is initialized with.
   * It may not represent all medication administrations for the entire order.
   */
  medicationAdministrationSet: MedicationAdministrationSet;

  /**
   * The MedicationAdministration that occured first. This comes from the list
   * of medication administrations that this object is initialized with. It
   * may not be the first administration of the whole order.
   */
  firstAdministration: MedicationAdministration;


  /**
   * The MedicationAdministration that occured last. This comes from the list
   * of medication administrations that this object is initialized with. It
   * may not be the last administration of the whole order.
   */
  lastAdministration: MedicationAdministration;

  constructor(
      order: MedicationOrder,
      medicationAdministrations: MedicationAdministration[]) {
    super(order.label, order.requestId);
    this.order = order;
    this.setMedicationAdministrations(medicationAdministrations);
  }

  /**
   * Sets the MedicationAdministration info for this AnnotatedMedicationOrder.
   * @param medicationAdministrations MedicationAdministrations associated with
   *     the order.
   * @throws Error if the label for the list of administrations does not match
   *     the label for this order.
   */
  private setMedicationAdministrations(medicationAdministrations:
                                           MedicationAdministration[]): void {
    if (!medicationAdministrations) {
      return;
    }
    const sortedMedAdmins = medicationAdministrations.sort((a, b) => {
      return a.timestamp.toMillis() - b.timestamp.toMillis();
    });
    this.firstAdministration = sortedMedAdmins[0];
    this.lastAdministration =
        sortedMedAdmins[medicationAdministrations.length - 1];

    const annotatedAdmins = [];
    for (let i = 0; i < sortedMedAdmins.length; i++) {
      const admin = sortedMedAdmins[i];
      // if i = 0, this is the first dose so we set the previous
      // dose to undefined. Otherwise, the previous dose is the
      // medication administration at the previous index
      const previousDose = i > 0 ? annotatedAdmins[i - 1] : undefined;
      const annotated = new AnnotatedAdministration(admin, previousDose);
      annotatedAdmins.push(annotated);
    }
    this.medicationAdministrationSet =
        new MedicationAdministrationSet(annotatedAdmins);
  }
}

/**
 * A set of MedicationOrders that belong together as part of the same
 * series, representing all orders for the medicine in a given time period.
 */
export class MedicationOrderSet extends
    FhirResourceSet<AnnotatedMedicationOrder> {
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
  constructor(medicationOrderList: AnnotatedMedicationOrder[]) {
    // Sort the list by first administration.
    medicationOrderList = medicationOrderList.sort((a, b) => {
      return a.firstAdministration.timestamp.toMillis() -
          b.firstAdministration.timestamp.toMillis();
    });
    super(medicationOrderList);
    // Set the RxNormCode and MedicationConceptGroup for this
    // MedicationOrderSet.
    if (medicationOrderList.length > 0) {
      const firstRxNorm = medicationOrderList[0].order.rxNormCode;
      if (!firstRxNorm) {
        throw new ResultError(
            this.requestIds,
            'The first resource does not have an RxNorm code.');
      }

      for (const rs of medicationOrderList) {
        if (rs.order.rxNormCode !== firstRxNorm) {
          throw new ResultError(
              this.requestIds,
              'The resource list in this set has mixed RxNorm codes.');
        }
      }
      this.rxNormCode = firstRxNorm;
      this.medicationConcept = this.rxNormCode.displayGrouping;

      this.minDose = Math.min(...medicationOrderList.map(
          x => x.medicationAdministrationSet.minDose));
      this.maxDose = Math.max(...medicationOrderList.map(
          x => x.medicationAdministrationSet.maxDose));

      const units = new Set(
          medicationOrderList.map(x => x.medicationAdministrationSet.unit));
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
