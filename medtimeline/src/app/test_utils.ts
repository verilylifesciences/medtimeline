// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

/**
 * Testing utilities used across multiple files.
 */
import {Injectable} from '@angular/core';
import {DateTime, Interval} from 'luxon';

import {BCHMicrobioCodeGroup} from './clinicalconcepts/bch-microbio-code';
import {DiagnosticReportCodeGroup} from './clinicalconcepts/diagnostic-report-code';
import {DisplayGrouping} from './clinicalconcepts/display-grouping';
import {LOINCCode} from './clinicalconcepts/loinc-code';
import {RxNormCode} from './clinicalconcepts/rx-norm';
import {ResourceCodeCreator} from './conceptmappings/resource-code-creator';
import {ResourceCodeManager} from './conceptmappings/resource-code-manager';
import {AnnotatedDiagnosticReport} from './fhir-data-classes/annotated-diagnostic-report';
import {DiagnosticReport} from './fhir-data-classes/diagnostic-report';
import {Encounter} from './fhir-data-classes/encounter';
import {MedicationAdministration} from './fhir-data-classes/medication-administration';
import {MedicationOrder} from './fhir-data-classes/medication-order';
import {MicrobioReport} from './fhir-data-classes/microbio-report';
import {Observation} from './fhir-data-classes/observation';
import {FhirService} from './fhir.service';

const REQUEST_ID = '1234';

// We use vancomycin for our test med.
export const medicationCodingConcept = {
  coding: [{system: RxNormCode.CODING_STRING, code: '11124'}],
  text: 'vancomycin'
};

@Injectable()
export class StubFhirService extends FhirService {
  constructor(
      resourceCodeManager: ResourceCodeManager,
      resourceCodeCreator: ResourceCodeCreator) {
    super(resourceCodeManager, resourceCodeCreator);
  }

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

  getMicrobioReports(codeGroup: BCHMicrobioCodeGroup, dateRange: Interval):
      Promise<MicrobioReport[]> {
    return Promise.resolve([]);
  }

  getAnnotatedDiagnosticReports(
      codeGroup: DiagnosticReportCodeGroup,
      dateRange: Interval): Promise<AnnotatedDiagnosticReport[]> {
    return Promise.resolve([]);
  }

  getAttachment(url: string): Promise<string> {
    return Promise.resolve('');
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
        prescription: {reference: 'MedicationOrder/12'}
      },
      REQUEST_ID);
}

export function makeMedicationOrder(): MedicationOrder {
  return new MedicationOrder(
      {
        medicationReference: {display: 'vancomycin'},
        medicationCodeableConcept: medicationCodingConcept,
        id: 12
      },
      REQUEST_ID);
}

export function makeSampleDiscreteObservationJson(
    result: string, timestamp: DateTime, interpretation = 'N'): any {
  // we use a fake LOINCCode for testing. We make sure it is created and if not,
  // we create it.
  const loincCodeString = '4090-7';
  if (!LOINCCode.fromCodeString(loincCodeString)) {
    const newLoincCode = new LOINCCode(
        loincCodeString, new DisplayGrouping('Vanc pk'), 'Vanc pk', true,
        [0, 50], true);
  }
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

export function makeEncounter(start: DateTime, end: DateTime) {
  return new Encounter(
      {identifier: 'id', period: {start: start, end: end}}, REQUEST_ID);
}

export function makeMicrobioReports(): MicrobioReport[] {
  return [
    new MicrobioReport(
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
    new MicrobioReport(
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
    new MicrobioReport(
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

export function makePartialMicrobioReports(): MicrobioReport[] {
  return [new MicrobioReport(
      {
        id: 'id',
        contained: [
          {
            resourceType: 'Specimen',
            id: '1',
            type: {text: 'Stool'},
            collection: {collectedPeriod: {start: '2018-08-31T13:48:00-04:00'}}
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
        status: 'partial',
        category:
            {coding: [{system: 'http://hl7.org/fhir/v2/0074', code: 'MB'}]},
      },
      REQUEST_ID)];
}

export function makeDiagnosticReports(): DiagnosticReport[] {
  return [
    new DiagnosticReport(
        {
          category: {text: 'RADRPT'},
          code: {text: 'RADRPT'},
          effectiveDateTime: '2019-02-11T20:03:09.000Z',
          encounter: {reference: 'Encounter/2787906'},
          id: '1',
          issued: '2019-02-11T20:03:21.000Z',
          meta: {lastUpdated: '2019-02-11T20:03:21.000Z', versionId: '3'},
          performer: {display: 'Interfaced-Unknown'},
          presentedForm: [
            {
              contentType: 'text/html',
              url: 'assets/demo_data/test_radReport/radReport_mockXRay.html'
            },
            {
              contentType: 'application/pdf',
              url:
                  'https://fhir-open.sandboxcerner.com/dstu2/0b8a0111-e8e6-4c26-a91c-5069cbc6b1ca/Binary/XR-5153487'
            }
          ],
          request: [{reference: 'ProcedureRequest/18954087'}],
          resourceType: 'DiagnosticReport',
          status: 'unknown',
          subject: {display: 'Peralta, Jake', reference: 'Patient/1316020'},
          text: {
            div:
                '<div><p><b>Diagnostic Report</b></p><p><b>Document Type</b>: RADRPT</p>' +
                '<p><b>Document Title</b>: XR Wrist Complete Left</p><p><b>Status</b>: Unknown</p>' +
                '<p><b>Verifying Provider</b>: Interfaced-Unknown</p><p><b>Ordering Provider</b>: ' +
                '<ul><li>Song, River</li></ul></p></div>',
            status: 'additional'
          }
        },
        REQUEST_ID),

    new DiagnosticReport(
        {
          category: {text: 'CT Report'},
          code: {text: 'CT Report'},
          effectiveDateTime: '2019-02-12T22:31:02.000Z',
          encounter: {reference: 'Encounter/2153909'},
          id: '2',
          issued: '2019-02-12T16:33:11.000Z',
          meta: {lastUpdated: '2019-02-12T16:33:16.000Z', versionId: '5'},
          performer:
              {display: 'Chase, Robert', reference: 'Practitioner/1314015'},
          presentedForm: [
            {
              contentType: 'text/html',
              url: 'assets/demo_data/test_radReport/radReport_mockCTReport.html'
            },
            {
              contentType: 'application/pdf',
              url:
                  'https://fhir-open.sandboxcerner.com/dstu2/0b8a0111-e8e6-4c26-a91c-5069cbc6b1ca/Binary/XR-4135365'
            }
          ],
          request: [{reference: 'ProcedureRequest/17233929'}],
          resouceType: 'DiagnosticReport',
          status: 'final',
          subject: {display: 'Peralta, Jake', reference: 'Patient/1316020'},
          text: {
            div:
                '<div><p><b>Diagnostic Report</b></p><p><b>Document Type</b>: CT Report</p>' +
                '<p><b>Document Title</b>: CT Abdomen w/ Contrast</p><p><b>Status</b>: Final</p>' +
                '<p><b>Verifying Provider</b>: Chase, Robert</p>' +
                '<p><b>Ordering Provider</b>: <ul><li>Cuddy, Lisa</li></ul></p></div>',
            status: 'additional'
          }
        },
        REQUEST_ID)
  ];
}

// Does not have the additional text property (Narrative); used to test edge
// cases
export function makeDiagnosticReportWithoutTextField(): DiagnosticReport {
  return (new DiagnosticReport(
      {
        category: {text: 'RADRPT'},
        code: {text: 'RADRPT'},
        effectiveDateTime: '2019-02-12T22:31:02.000Z',
        encounter: {reference: 'Encounter/2153909'},
        id: '2',
        issued: '2019-02-12T16:33:11.000Z',
        meta: {lastUpdated: '2019-02-12T16:33:16.000Z', versionId: '5'},
        performer:
            {display: 'Chase, Robert', reference: 'Practitioner/1314015'},
        presentedForm: [
          {
            contentType: 'text/html',
            url:
                'https://fhir-open.sandboxcerner.com/dstu2/0b8a0111-e8e6-4c26-a91c-5069cbc6b1ca/Binary/TR-4135365'
          },
          {
            contentType: 'application/pdf',
            url:
                'https://fhir-open.sandboxcerner.com/dstu2/0b8a0111-e8e6-4c26-a91c-5069cbc6b1ca/Binary/XR-4135365'
          }
        ],
        request: [{reference: 'ProcedureRequest/17233929'}],
        resouceType: 'DiagnosticReport',
        status: 'final',
        subject: {display: 'Peralta, Jake', reference: 'Patient/1316020'}
      },
      REQUEST_ID));
}
