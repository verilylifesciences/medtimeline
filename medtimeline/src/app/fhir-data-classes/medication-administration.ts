// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {DateTime} from 'luxon';

import {RxNormCode} from '../clinicalconcepts/rx-norm';
import {FhirResourceSet, LabeledClass} from '../fhir-resource-set';
import {fixUnitAbbreviations} from '../unit_utils';

import {Dosage} from './dosage';
import {ContainedMedication} from './medication';


/**
 * This object represents a FHIR MedicationAdministration. It does not contain
 * all the information in a standard MedicationAdministration (see
 * https://www.hl7.org/fhir/DSTU2/medicationadministration.html) but instead
 * stores only the information we're interested in seeing.
 */
export class MedicationAdministration extends LabeledClass {
  readonly MED_RESOURCE_TYPE = 'Medication';
  readonly rxNormCode: RxNormCode;
  readonly timestamp: DateTime;
  readonly wasNotGiven: boolean;
  readonly dosage: Dosage;
  readonly medicationOrderId: string;
  readonly containedMedications: ContainedMedication[] = [];
  /**
   * Makes an MedicationAdministration out of a JSON object that represents a
   * a FHIR MedicationAdministration.
   * https://www.hl7.org/fhir/DSTU2/medicationadministration.html
   * @param json A JSON object that represents a FHIR MedicationAdministration.
   */
  constructor(private json: any) {
    super(
        json.medicationReference ? json.medicationReference.display :
                                   json.medicationCodeableConcept ?
                                   json.medicationCodeableConcept.text :
                                   null);
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

    // TODO(b/111990521): If there are hours and minutes then we can guarantee
    // timezone is specified, but if not, then the timezone might not be
    // specified! I'm not sure how to best handle that.
    // https://www.hl7.org/fhir/DSTU2/datatypes.html#dateTime
    this.timestamp = json.effectiveTimeDateTime ?
        DateTime.fromISO(json.effectiveTimeDateTime).toUTC() :
        (json.effectiveTimePeriod ?
             DateTime.fromISO(json.effectiveTimePeriod.start).toUTC() :
             null);

    this.dosage = new Dosage(json);
    this.wasNotGiven = json.wasNotGiven;
    this.medicationOrderId =
        json.prescription ? json.prescription.reference : null;

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
                (el.resourceType === this.MED_RESOURCE_TYPE && el.product &&
                 el.id === referenceId.replace('#', '')));
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
          this.containedMedications.push(
              new ContainedMedication(ing, ingredientReferences));
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
        throw Error(
            'JSON must include RxNormCode and a label' +
            ' to be included as a MedicationAdministration. JSON: ' +
            JSON.stringify(json));
      }
    }
    // TODO(b/b/119673528): Replace checks for LOINC and RxNorm labels.
    // if (this.rxNormCode) {
    //   // Check this MedicationOrder label against the RxNorm label.
    //   // Check the observation label against the LOINC code label.
    //   if (this.label.toLowerCase() !== this.rxNormCode.label.toLowerCase()) {
    //     throw Error(
    //         'The label for this MedicationAdministration\'s RxNorm code' +
    //         ' doesn\'t match the label in the data. MedicationOrder label: '
    //         + this.label + ' RxNorm label: ' + this.rxNormCode.label);
    //   }
    // }
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
      throw Error('Different RxNorms for administrations: ' + rxNorms);
    }
    this.rxNormCode = rxNorms[0];

    this.minDose = Math.min(...medicationAdministrationList.map(
        x => x.medAdministration.dosage.quantity));
    this.maxDose = Math.max(...medicationAdministrationList.map(
        x => x.medAdministration.dosage.quantity));

    const units = new Set(
        medicationAdministrationList.map(x => x.medAdministration.dosage.unit));
    if (units.size > 1) {
      throw Error(
          'Different units in the administration set: ' +
          Array.from(units.values()));
    }
    this.unit = fixUnitAbbreviations(Array.from(units.values())[0]);
  }
}

/**
 * A MedicationAdministration with additional information relating it to
 * the other administrations in the same order.
 */
export class AnnotatedAdministration extends LabeledClass {
  /** The medication administration to be annotated. */
  readonly medAdministration: MedicationAdministration;

  /**
   * The dose number for this administration in this order. The first dose is
   * numbered 1.
   */
  readonly doseInOrder: number;

  /**
   * The numbered day for this dose within this order. The first dose will
   * be on day 1. Day 2 starts 24 hours after the first dose administration,
   * day 3 24 hours after that, etc.
   */
  readonly doseDay: number;

  /**
   * The annotated dose for the dose prior to this one. Undefined if this is
   * the first dose.
   */
  readonly previousDose: AnnotatedAdministration;

  constructor(
      medAdmin: MedicationAdministration, doseInOrder: number, doseDay: number,
      prevDose?: AnnotatedAdministration) {
    super(medAdmin.label);
    this.medAdministration = medAdmin;
    this.doseInOrder = doseInOrder;
    this.doseDay = doseDay;
    this.previousDose = prevDose;
  }
}
