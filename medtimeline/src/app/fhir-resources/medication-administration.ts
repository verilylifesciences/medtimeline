// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {DateTime} from 'luxon';
import {FhirResourceType} from 'src/constants';

import {RxNormCode} from '../conceptmappings/resource-codes/rx-norm';
import {ResultError} from '../result-error';
import {fixUnitAbbreviations} from '../utils/unit_utils';

import {Dosage} from './dosage';
import {ContainedMedication} from './medication';
import {FhirResourceSet, ResultClass, ResultClassWithTimestamp} from './sets/fhir-resource-set';


/**
 * FHIR element for MedicationAdministrationStatus, from the DSTU2 version of
 * the standard. http://hl7.org/fhir/DSTU2/valueset-medication-admin-status.html
 */
export enum MedicationAdministrationStatus {
  IN_PROGRESS = 'In Progress',
  ON_HOLD = 'On Hold',
  COMPLETED = 'Completed',
  ENTERED_IN_ERROR = 'Entered in Error',
  STOPPED = 'Stopped'
}

const statusToEnumMap = new Map<string, MedicationAdministrationStatus>([
  ['in-progress', MedicationAdministrationStatus.IN_PROGRESS],
  ['on-hold', MedicationAdministrationStatus.ON_HOLD],
  ['completed', MedicationAdministrationStatus.COMPLETED],
  ['entered-in-error', MedicationAdministrationStatus.ENTERED_IN_ERROR],
  ['stopped', MedicationAdministrationStatus.STOPPED],
]);


/**
 * This object represents a FHIR MedicationAdministration. It does not contain
 * all the information in a standard MedicationAdministration (see
 * https://www.hl7.org/fhir/DSTU2/medicationadministration.html) but instead
 * stores only the information we're interested in seeing.
 */
export class MedicationAdministration extends ResultClassWithTimestamp {
  readonly wasNotGiven: boolean;
  readonly dosage: Dosage;
  readonly containedMedications: ContainedMedication[] = [];
  static readonly MED_RESOURCE_TYPE = 'Medication';
  readonly effectiveDateTime: DateTime;
  readonly rxNormCode: RxNormCode;
  readonly medicationOrderId: string;
  readonly status: MedicationAdministrationStatus;

  /**
   * Makes an MedicationAdministration out of a JSON object that represents a
   * a FHIR MedicationAdministration.
   * https://www.hl7.org/fhir/DSTU2/medicationadministration.html
   * @param json A JSON object that represents a FHIR MedicationAdministration.
   * @param requestId The x-request-id of the request that acquired this
   *     medication administration's data.
   */
  constructor(json: any, requestId: string) {
    super(
        json.medicationReference ? json.medicationReference.display :
                                   json.medicationCodeableConcept ?
                                   json.medicationCodeableConcept.text :
                                   null,
        requestId, MedicationAdministration.getTimestamp(json));
    this.rxNormCode = ResultClass.extractMedicationEncoding(json);
    this.medicationOrderId = json.prescription && json.prescription.reference ?
        json.prescription.reference.replace(
            FhirResourceType.MedicationOrder + '/', '') :
        null;

    this.dosage = new Dosage(json);
    this.wasNotGiven = json.wasNotGiven;
    this.status = statusToEnumMap.get(json.status);

    if (json.contained && json.contained.length > 0) {
      // We first find the element that lists the "ingredients" of this
      // MedicationAdministration with each corresponding dosage and reference
      // id. This element of "contained" will have the same id as the overall
      // MedicationAdministration's medicationReference number.
      const referenceId =
          json.medicationReference ? json.medicationReference.reference : null;

      const ingredientReferences = new Map<string, any>();
      if (referenceId) {
        const index = json.contained.findIndex(
            el =>
                (el.resourceType ===
                     MedicationAdministration.MED_RESOURCE_TYPE &&
                 el.product && el.id === referenceId.replace('#', '')));
        const listOfIngredients = json.contained[index];
        if (listOfIngredients && listOfIngredients.product.ingredient) {
          for (const el of listOfIngredients.product.ingredient) {
            if (el.item && el.amount) {
              ingredientReferences.set(el.item.reference.replace('#', ''), el);
            }
          }
        }
        // Remove the element similar to a "list of ingredients" from contained.
        if (index > -1) {
          json.contained.splice(index, 1);
        }
      }
      if (ingredientReferences.size > 0 && json.contained.length > 1) {
        // We map the Medications in the list of ingredients to JSON elements
        // containing the RxNorms for each ingredient.
        for (const ing of json.contained) {
          this.containedMedications.push(new ContainedMedication(
              ing, ingredientReferences, this.requestId));
        }
      }
    }

    if (!(this.rxNormCode && this.label)) {
      // If a MedicationAdministration has "Contained" portions of different
      // ingredients, then there might not be one single RxNorm corresponding to
      // this administration.

      // We throw an error if all contained medications do not
      // have an RxNormCode, or if there are no contained medications.
      if (this.containedMedications.length === 0 ||
          (this.containedMedications.length > 0 &&
           this.containedMedications.every(med => (med.code === undefined)))) {
        throw new ResultError(
            new Set([this.requestId]),
            'JSON must include RxNormCode and a label' +
                ' to be included as a MedicationAdministration.',
            json);
      }
    }
  }
  static getTimestamp(json): DateTime {
    return json.effectiveTimeDateTime ?
        DateTime.fromISO(json.effectiveTimeDateTime).toUTC() :
        json.effectiveTimePeriod ?
        DateTime.fromISO(json.effectiveTimePeriod.start).toUTC() :
        null;
  }
}

/**
 * A set of MedicalAdministrations that belong together as part of the same
 * series.
 */
export class MedicationAdministrationSet extends
    FhirResourceSet<AnnotatedAdministration> {
  readonly maxDose: number;
  readonly minDose: number;
  readonly unit: string;
  readonly rxNormCode: RxNormCode;

  /**
   * Constructor for MedicationAdministrationSet.
   * @param medicationAdministrationList The list of MedicationAdministrations
   *     belonging together.
   * @throws Error if the administrations have different labels or RxNorms,
   *      or if there is not a label, or if the administrations have different
   *      units.
   */
  constructor(medicationAdministrationList: AnnotatedAdministration[]) {
    super(medicationAdministrationList);

    const rxNorms =
        medicationAdministrationList.map(x => x.medAdministration.rxNormCode);
    if (new Set(rxNorms).size > 1) {
      throw new ResultError(
          this.requestIds,
          `Different RxNorms for administrations: ${rxNorms}.`);
    }
    this.rxNormCode = rxNorms[0];

    this.minDose = Math.min(...medicationAdministrationList.map(
        x => x.medAdministration.dosage.quantity));
    this.maxDose = Math.max(...medicationAdministrationList.map(
        x => x.medAdministration.dosage.quantity));

    const units = new Set(
        medicationAdministrationList.map(x => x.medAdministration.dosage.unit));
    if (units.size > 1) {
      throw new ResultError(
          this.requestIds,
          `Different units in the administration set: ${
              Array.from(units.values())}.`);
    }
    this.unit = fixUnitAbbreviations(Array.from(units.values())[0]);
  }
}

/**
 * A MedicationAdministration with additional information relating it to
 * the other administrations in the same order.
 */
export class AnnotatedAdministration extends ResultClass {
  /** The medication administration to be annotated. */
  readonly medAdministration: MedicationAdministration;

  /**
   * The annotated dose for the dose prior to this one. Undefined if this is
   * the first dose.
   */
  readonly previousDose: AnnotatedAdministration;

  constructor(
      medAdmin: MedicationAdministration, prevDose?: AnnotatedAdministration) {
    super(medAdmin.label, medAdmin.requestId);
    this.medAdministration = medAdmin;
    this.previousDose = prevDose;
  }
}
