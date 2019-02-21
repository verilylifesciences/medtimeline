// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {MedicationConceptGroup, RxNormCode} from '../clinicalconcepts/rx-norm';
import {FhirResourceSet, LabeledClass} from '../fhir-resource-set';
import {FhirService} from '../fhir.service';

import {AnnotatedAdministration, MedicationAdministration, MedicationAdministrationSet} from './medication-administration';

/**
 * This object represents a FHIR MedicationOrder. It does not contain
 * all the information in a standard MedicationOrder (see
 * https://www.hl7.org/fhir/DSTU2/medicationorder.html) but instead
 * stores only the information we're interested in seeing.
 */
export class MedicationOrder extends LabeledClass {
  readonly rxNormCode: RxNormCode;
  firstAdministration: MedicationAdministration;
  lastAdmininistration: MedicationAdministration;
  administrationsForOrder: MedicationAdministrationSet;
  readonly orderId: string;
  /**
   * Makes an MedicationOrder out of a list of MedicationAdministrations.
   * https://www.hl7.org/fhir/DSTU2/medicationorder.html
   * @param json The json representing this MedicationOrder.
   */
  constructor(private json: any) {
    super();
    this.orderId = json.id;
    this.label = json.medicationReference ?
        json.medicationReference.display :
        json.medicationCodeableConcept ? json.medicationCodeableConcept.text :
                                         null;
    if (json.medicationCodeableConcept) {
      if (json.medicationCodeableConcept.coding) {
        this.rxNormCode =
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
      }
    }

    if (!(this.rxNormCode && this.label)) {
      throw Error(
          'JSON must include RxNormCode and a label' +
          ' to be included as a MedicationOrder. JSON: ' +
          JSON.stringify(json));
    }

    // Check this MedicationOrder label against the RxNorm label.
    if (this.label.toLowerCase() !== this.rxNormCode.label.toLowerCase()) {
      throw Error(
          'The label for this MedicationOrder\'s RxNorm code doesn\'t match ' +
          ' the label in the data. MedicationOrder label: ' + this.label +
          ' RxNorm label: ' + this.rxNormCode.label);
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
    return fhirService.getMedicationAdministrationsWithOrder(this.orderId)
        .then(
            medAdmins => {
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
    // TODO(b/117327111): Restructure FhirResourceSet to take in a list of
    // attributes to check sameness for
    if (medicationOrderList.length > 0) {
      const firstRxNorm = medicationOrderList[0].rxNormCode;
      if (!firstRxNorm) {
        throw Error('The first resource does not have an RxNorm code.');
      }

      for (const rs of medicationOrderList) {
        if (rs.rxNormCode !== firstRxNorm) {
          throw Error('The resource list in this set has mixed RxNorm codes.');
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
        throw Error(
            'Different units in the order set: ' + Array.from(units.values()));
      }
      this.unit = Array.from(units.values())[0];
    }
  }
}
