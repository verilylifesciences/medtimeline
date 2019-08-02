// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

/**
 * Testing utilities used across multiple files.
 */
import {DateTime, Interval} from 'luxon';

import {BCHMicrobioCodeGroup} from './clinicalconcepts/bch-microbio-code';
import {LOINCCode} from './clinicalconcepts/loinc-code';
import {RxNormCode} from './clinicalconcepts/rx-norm';
import {DiagnosticReport} from './fhir-data-classes/diagnostic-report';
import {Encounter} from './fhir-data-classes/encounter';
import {MedicationAdministration} from './fhir-data-classes/medication-administration';
import {MedicationOrder} from './fhir-data-classes/medication-order';
import {Observation} from './fhir-data-classes/observation';
import {FhirService} from './fhir.service';

const REQUEST_ID = '1234';

// We use vancomycin for our test med.
export const medicationCodingConcept = {
  coding: [{system: RxNormCode.CODING_STRING, code: '11124'}],
  text: 'vancomycin'
};

export class StubFhirService extends FhirService {
  getObservationsWithCode(code: LOINCCode, dateRange: Interval):
      Promise<Observation[]> {
    return Promise.resolve([]);
  }

  observationsPresentWithCode(code: LOINCCode, dateRange: Interval):
      Promise<boolean> {
    return Promise.resolve(false);
  }

  getMedicationAdministrationsWithCodes(
      codes: RxNormCode[],
      dateRange: Interval): Promise<MedicationAdministration[]> {
    return Promise.resolve(
        [makeMedicationAdministration(DateTime.utc().toISO())]);
  }

  medicationsPresentWithCode(code: RxNormCode, dateRange: Interval):
      Promise<boolean> {
    return Promise.resolve(true);
  }

  getMedicationOrderWithId(id: string): Promise<MedicationOrder> {
    return Promise.resolve(makeMedicationOrder());
  }

  getMedicationAdministrationsWithOrder(id: string, code: RxNormCode):
      Promise<MedicationAdministration[]> {
    return Promise.resolve(
        [makeMedicationAdministration(DateTime.utc().toISO())]);
  }

  getEncountersForPatient(dateRange: Interval) {
    return Promise.resolve([]);
  }

  saveStaticNote(image: HTMLCanvasElement, date: string): Promise<boolean> {
    return Promise.resolve(true);
  }

  getDiagnosticReports(codeGroup: BCHMicrobioCodeGroup, dateRange: Interval):
      Promise<DiagnosticReport[]> {
    return Promise.resolve([]);
  }
}

export function makeSampleObservationJson(
    value: number, timestamp: DateTime,
    referenceRange: [number, number] = [10, 20], interpretation = 'N',
    hasInterpretation = true, hasValueAndResult = true,
    hasReferenceRange = true): any {
  // Testing for missing 'interpretation' value in JSON
  let interpretationJSON;
  if (hasInterpretation) {
    interpretationJSON = {
      coding: [{
        code: interpretation,
        system: 'http://hl7.org/fhir/ValueSet/observation-interpretation'
      }]
    };
  } else {
    interpretationJSON = '';
  }
  // Testing for missing 'value' and 'result' in JSON
  let valueJSON;
  if (hasValueAndResult) {
    valueJSON = {value: value, unit: 'g/dL'};
  } else {
    valueJSON = '';
  }

  // Testing for missing 'referenceRange' in JSON
  let referenceRangeJSON;
  if (hasReferenceRange) {
    referenceRangeJSON = [{
      low: {value: referenceRange[0], unit: 'g/dL'},
      high: {value: referenceRange[1], unit: 'g/dL'}
    }];
  } else {
    referenceRangeJSON = '';
  }

  return {
    code: {
      coding: [{system: 'http://loinc.org', code: '718-7'}],
      text: 'Hemoglobin'
    },
    effectiveDateTime: timestamp.toISO(),
    valueQuantity: valueJSON,
    interpretation: interpretationJSON,
    referenceRange: referenceRangeJSON
  };
}

export function makeSampleObservation(
    value: number, timestamp: DateTime,
    referenceRange: [number, number] = [10, 20], interpretation = 'N',
    hasInterpretation = true, hasValueAndResult = true,
    hasReferenceRange = true, requestId = REQUEST_ID): any {
  return new Observation(
      makeSampleObservationJson(
          value, timestamp, referenceRange, interpretation, hasInterpretation,
          hasValueAndResult, hasReferenceRange),
      requestId);
}

export function makeMedicationAdministration(timestamp: string, dose = 50) {
  return new MedicationAdministration(
      {
        effectiveTimeDateTime: timestamp,
        medicationReference: {display: 'vancomycin'},
        dosage: {
          quantity: {value: dose, unit: 'mg'},
          route: {text: 'oral'},
          text: dose + 'mg tablet daily'
        },
        medicationCodeableConcept: medicationCodingConcept,
        prescription: 'order_id'
      },
      REQUEST_ID);
}

export function makeMedicationOrder(): MedicationOrder {
  return new MedicationOrder(
      {
        medicationReference: {display: 'vancomycin'},
        medicationCodeableConcept: medicationCodingConcept,
        id: 'order_id'
      },
      REQUEST_ID);
}

export function makeSampleDiscreteObservationJson(
    result: string, timestamp: DateTime, interpretation = 'N'): any {
  return {
    code: {
      coding: [{system: 'http://loinc.org', code: '4090-7'}],
      text: 'Vanc pk'
    },
    effectiveDateTime: timestamp.toISO(),
    interpretation: {
      coding: [{
        code: interpretation,
        system: 'http://hl7.org/fhir/ValueSet/observation-interpretation'
      }]
    },
    valueCodeableConcept: {text: result}
  };
}

export function makeSampleDiscreteObservation(
    result: string, timestamp: DateTime, interpretation = 'N',
    requestId = REQUEST_ID): any {
  return new Observation(
      makeSampleDiscreteObservationJson(result, timestamp, interpretation),
      requestId);
}

export function getEmptyFhirService() {
  return new StubFhirService();
}

export function makeEncounter(start: DateTime, end: DateTime) {
  return new Encounter(
      {identifier: 'id', period: {start: start, end: end}}, REQUEST_ID);
}

export function makeDiagnosticReports(): DiagnosticReport[] {
  return [
    new DiagnosticReport(
        {
          id: 'id',
          contained: [
            {
              resourceType: 'Specimen',
              id: '1',
              type: {text: 'Stool'},
              collection:
                  {collectedPeriod: {start: '2018-08-31T13:48:00-04:00'}}
            },
            {
              resourceType: 'Observation',
              id: '2',
              code: {
                coding: [{
                  system: 'http://cerner.com/bch_mapping/',
                  code: 'OVAANDPARASITEEXAM',
                  display: 'Ova and Parasite Exam'
                }]
              },
              interpretation: {
                coding: [{
                  system:
                      'http://hl7.org/fhir/ValueSet/observation-interpretation',
                  code: 'NEGORFLORA',
                  display: 'Neg or Flora'
                }]
              }
            },
            {
              resourceType: 'Observation',
              id: '3',
              code: {
                coding: [{
                  system: 'http://cerner.com/bch_mapping/',
                  code: 'SALMONELLAANDSHIGELLACULTURE',
                  display: 'Salmonella and Shigella Culture'
                }]
              },
              interpretation: {
                coding: [{
                  system:
                      'http://hl7.org/fhir/ValueSet/observation-interpretation',
                  code: 'CHECKRESULT',
                  display: 'Check Result'
                }]
              }
            }
          ],
          status: 'final',
          category:
              {coding: [{system: 'http://hl7.org/fhir/v2/0074', code: 'MB'}]},
        },
        REQUEST_ID),
    new DiagnosticReport(
        {
          id: 'id2',
          contained: [
            {
              resourceType: 'Specimen',
              id: '1',
              type: {text: 'Stool'},
              collection:
                  {collectedPeriod: {start: '2018-08-31T13:48:00-04:00'}}
            },
            {
              resourceType: 'Observation',
              id: '2',
              code: {
                coding: [{
                  system: 'http://cerner.com/bch_mapping/',
                  code: 'SALMONELLAANDSHIGELLACULTURE',
                  display: 'Salmonella and Shigella Culture'
                }]
              },
              interpretation: {
                coding: [{
                  system:
                      'http://hl7.org/fhir/ValueSet/observation-interpretation',
                  code: 'NEGORFLORA',
                  display: 'Neg or Flora'
                }]
              }
            }
          ],
          status: 'final',
          category:
              {coding: [{system: 'http://hl7.org/fhir/v2/0074', code: 'MB'}]},
        },
        REQUEST_ID),
    new DiagnosticReport(
        {
          id: 'id3',
          contained: [
            {
              resourceType: 'Specimen',
              id: '1',
              type: {text: 'Stool'},
              collection:
                  {collectedPeriod: {start: '2018-08-31T13:48:00-04:00'}}
            },
            {
              resourceType: 'Observation',
              id: '2',
              code: {
                coding: [{
                  system: 'http://cerner.com/bch_mapping/',
                  code: 'SALMONELLAANDSHIGELLACULTURE',
                  display: 'Salmonella and Shigella Culture'
                }]
              },
              interpretation: {
                coding: [{
                  system:
                      'http://hl7.org/fhir/ValueSet/observation-interpretation',
                  code: 'NEGORFLORA',
                  display: 'Neg or Flora'
                }]
              }
            },
            {
              resourceType: 'Observation',
              id: '3',
              code: {
                coding: [{
                  system: 'http://cerner.com/bch_mapping/',
                  code: 'SALMONELLAANDSHIGELLACULTURE',
                  display: 'Salmonella and Shigella Culture'
                }]
              },
              interpretation: {
                coding: [{
                  system:
                      'http://hl7.org/fhir/ValueSet/observation-interpretation',
                  code: 'CHECKRESULT',
                  display: 'Check Result'
                }]
              }
            }
          ],
          status: 'corrected',
          category:
              {coding: [{system: 'http://hl7.org/fhir/v2/0074', code: 'MB'}]},
        },
        REQUEST_ID),
  ];
}
