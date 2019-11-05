// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {HttpClient, HttpClientModule} from '@angular/common/http';
import {async, TestBed} from '@angular/core/testing';
import {DateTime} from 'luxon';

import {ConceptFileConfiguration} from '../conceptmappings/concept-file-configuration';
import {ResourceCodeCreator} from '../conceptmappings/resource-code-creator';
import {ResourceCode} from '../conceptmappings/resource-codes/resource-code-group';
import {RxNormCode} from '../conceptmappings/resource-codes/rx-norm';
import {AnnotatedAdministration, MedicationAdministration, MedicationAdministrationSet, MedicationAdministrationStatus} from '../fhir-resources/medication-administration';
import {makeMedicationAdministration} from '../utils/test_utils';

import {Dosage} from './dosage';

const medicationCoding = {
  coding: [{system: RxNormCode.CODING_STRING, code: '11124'}],
  text: 'vancomycin'
};

const REQUEST_ID = '1234';

describe('MedicationAdministration', () => {
  describe('RxNormGroup', () => {
    beforeEach(async(() => {
      TestBed.configureTestingModule({
        imports: [HttpClientModule],
      });

      const rcm = new ResourceCodeCreator(
          TestBed.get(HttpClient), new ConceptFileConfiguration());
      Promise.resolve(rcm.loadAllConcepts);
    }));
  });

  it('should get rxNorm code from json', () => {
    const medicationAdministration = new MedicationAdministration(
        {
          medicationCodeableConcept: {
            coding: [
              {system: 'not RxNorm', code: '2744-1'},
              {system: RxNormCode.CODING_STRING, code: '11124'}
            ],
            text: 'vancomycin'
          }
        },
        REQUEST_ID);
    expect(medicationAdministration.rxNormCode).toBeDefined();
    expect(medicationAdministration.rxNormCode as ResourceCode)
        .toBe(RxNormCode.fromCodeString('11124'));
  });

  it('should throw error without rxNorm code', () => {
    const constructor = () => {
      const admin = new MedicationAdministration({}, REQUEST_ID);
    };
    expect(constructor).toThrowError(new RegExp(`Request IDs: ${REQUEST_ID}`));
  });

  it('should get timestamp from effectiveTimeDateTime', () => {
    const timestampString = '2012-08-04T11:00:00.000Z';
    const medicationAdministration =
        makeMedicationAdministration(timestampString);
    expect(medicationAdministration.timestamp).toBeDefined();
    expect(medicationAdministration.timestamp)
        .toEqual(DateTime.fromISO(timestampString).toUTC());
  });

  it('should get timestamp from effectiveTimePeriod if effectiveTimeDateTime absent',
     () => {
       const timestampString = '2012-08-05T11:00:00.000Z';
       const medicationAdministration = new MedicationAdministration(
           {
             effectiveTimePeriod: {start: timestampString},
             medicationCodeableConcept: medicationCoding,
           },
           REQUEST_ID);
       expect(medicationAdministration.timestamp).toBeDefined();
       expect(medicationAdministration.timestamp)
           .toEqual(DateTime.fromISO(timestampString).toUTC());
     });

  it('should get label from medicationReference in json', () => {
    const medicationAdministration = new MedicationAdministration(
        {
          medicationReference: {display: 'vancomycin'},
          medicationCodeableConcept: medicationCoding,
        },
        REQUEST_ID);
    expect(medicationAdministration.label).toBeDefined();
    expect(medicationAdministration.label).toEqual('vancomycin');
  });

  it('should get status from json', () => {
    const medicationAdministration = new MedicationAdministration(
        {medicationCodeableConcept: medicationCoding, status: 'in-progress'},
        REQUEST_ID);
    expect(medicationAdministration.status).toBeDefined();
    expect(medicationAdministration.status)
        .toEqual(MedicationAdministrationStatus.IN_PROGRESS);
  });

  it('should get label from medicationCodeableConcept if medicationReference is absent',
     () => {
       const medicationAdministration = new MedicationAdministration(
           {
             medicationCodeableConcept:
                 {text: 'vancomycin', coding: medicationCoding.coding},
           },
           REQUEST_ID);
       expect(medicationAdministration.label).toBeDefined();
       expect(medicationAdministration.label).toEqual('vancomycin');
     });

  it('should get dosage information from json', () => {
    const jsonDosageString = {
      dosage: {
        quantity: {value: 50, unit: 'mg'},
        route: {text: 'oral'},
        text: '50mg tablet daily'
      }
    };
    const medAdmin = {
      ...jsonDosageString,
      medicationCodeableConcept: medicationCoding
    };
    const medicationAdministration =
        new MedicationAdministration(medAdmin, REQUEST_ID);
    expect(medicationAdministration.dosage)
        .toEqual(new Dosage(jsonDosageString));
  });

  it('should get wasNotGiven information from json', () => {
    const medicationAdministration = new MedicationAdministration(
        {
          wasNotGiven: false,
          medicationCodeableConcept: medicationCoding,
        },
        REQUEST_ID);
    expect(medicationAdministration.wasNotGiven).toBeDefined();
    expect(medicationAdministration.wasNotGiven).toEqual(false);
  });

  it('should get medicationOrderId information from json', () => {
    const medicationAdministration = new MedicationAdministration(
        {
          prescription: {reference: '24197931'},
          medicationCodeableConcept: medicationCoding,
        },
        REQUEST_ID);
    expect(medicationAdministration.medicationOrderId).toBeDefined();
    expect(medicationAdministration.medicationOrderId).toEqual('24197931');
  });

  it('should set contained medications from json', () => {
    const medicationAdministration = new MedicationAdministration(
        {
          medicationReference: {reference: '12345'},
          contained: [
            {
              code: {...medicationCoding},
              resourceType: 'Medication',
              id: '12345',
              product: {
                ingredient: [
                  {
                    item: {reference: '12', display: 'Ing1'},
                    amount: {numerator: {value: 50}}
                  },
                  {
                    item: {reference: '345', display: 'Ing2'},
                    amount: {numerator: {value: 60}}
                  }
                ]
              }
            },
            {resourceType: 'Medication', id: '12', code: medicationCoding},
            {resourceType: 'Medication', id: '345', code: medicationCoding},
          ]
        },
        REQUEST_ID);
    expect(medicationAdministration.containedMedications.length).toEqual(2);
  });

  it('should not set contained medications without ingredient list', () => {
    const medicationAdministration = new MedicationAdministration(
        {
          medicationCodeableConcept: medicationCoding,
          medicationReference: {display: 'Vancomycin', reference: '12345'},
          contained: [
            {resourceType: 'Medication', id: '12', code: medicationCoding},
            {resourceType: 'Medication', id: '345', code: medicationCoding},
          ]
        },
        REQUEST_ID);
    expect(medicationAdministration.containedMedications.length).toEqual(0);
  });
});

describe('MedicationAdministrationSet', () => {
  describe('RxNormGroup', () => {
    beforeEach(async(() => {
      const rcm = new ResourceCodeCreator(
          TestBed.get(HttpClient), new ConceptFileConfiguration());
      Promise.resolve(rcm.loadAllConcepts);
    }));
  });

  it('should throw error with mismatched units', () => {
    const medicationAdministrations = [
      new MedicationAdministration(
          {
            medicationCodeableConcept: medicationCoding,
            dosage: {quantity: {unit: 'unit'}}
          },
          REQUEST_ID),
      new MedicationAdministration(
          {
            medicationReference: {display: 'Vancomycin'},
            medicationCodeableConcept: medicationCoding,
            dosage: {quantity: {unit: 'a different unit'}}
          },
          REQUEST_ID)
    ];
    const constructor = () => {
      const obsSet =
          new MedicationAdministrationSet(medicationAdministrations.map(
              // annotations not important for this test
              x => new AnnotatedAdministration(x)));
    };
    expect(constructor).toThrowError(new RegExp(`Request IDs: ${REQUEST_ID}`));
  });

  it('should throw error with mismatched RxNorms', () => {
    const medicationAdministrations = [
      new MedicationAdministration(
          {
            medicationCodeableConcept: medicationCoding,
            dosage: {quantity: {unit: 'unit'}}
          },
          REQUEST_ID),
      new MedicationAdministration(
          {
            // artificially matching label to test RxNorm mismatch in
            // isolation
            medicationReference: {display: 'Vancomycin'},
            medicationCodeableConcept:
                {coding: [{system: RxNormCode.CODING_STRING, code: '310466'}]},
            dosage: {quantity: {unit: 'unit'}}
          },
          REQUEST_ID)
    ];
    const constructor = () => {
      const obsSet =
          new MedicationAdministrationSet(medicationAdministrations.map(
              // annotations not important for this test
              x => new AnnotatedAdministration(x)));
    };
    expect(constructor).toThrowError(new RegExp(`Request IDs: ${REQUEST_ID}`));
  });

  it('should get max and min dosages', () => {
    const medicationAdministrations = [
      new MedicationAdministration(
          {
            medicationCodeableConcept: medicationCoding,
            dosage: {quantity: {value: 300}}
          },
          REQUEST_ID),
      new MedicationAdministration(
          {
            medicationReference: {display: 'Vancomycin'},
            medicationCodeableConcept: medicationCoding,
            dosage: {quantity: {value: 100}}
          },
          REQUEST_ID),
      new MedicationAdministration(
          {
            medicationCodeableConcept: medicationCoding,
            dosage: {quantity: {value: 500}}
          },
          REQUEST_ID),
      new MedicationAdministration(
          {
            medicationReference: {display: 'Vancomycin'},
            medicationCodeableConcept: medicationCoding,
            dosage: {quantity: {value: 200}}
          },
          REQUEST_ID)
    ];
    const obsSet =
        new MedicationAdministrationSet(medicationAdministrations.map(
            // annotations not important for this test
            x => new AnnotatedAdministration(x)));

    expect(obsSet.maxDose).toEqual(500);
    expect(obsSet.minDose).toEqual(100);
  });

  it('should pass through units and rxNorm', () => {
    const medicationAdministrations = [new MedicationAdministration(
        {
          medicationReference: {
            display: 'Gentamicin Sulfate (USP) 0.003 MG/MG Ophthalmic Ointment'
          },
          medicationCodeableConcept:
              {coding: [{system: RxNormCode.CODING_STRING, code: '310466'}]},
          dosage: {quantity: {unit: 'unit'}}
        },
        REQUEST_ID)];

    const obsSet =
        new MedicationAdministrationSet(medicationAdministrations.map(
            // annotations not important for this test
            x => new AnnotatedAdministration(x)));

    expect(obsSet.unit).toEqual('unit');
    expect(obsSet.rxNormCode.codeString).toEqual('310466');
  });
});
