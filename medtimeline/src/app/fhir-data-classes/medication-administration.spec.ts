// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {} from 'jasmine';
import {DateTime} from 'luxon';

import {ResourceCode} from '../clinicalconcepts/resource-code-group';
import {RxNormCode} from '../clinicalconcepts/rx-norm';
import {makeMedicationAdministration} from '../test_utils';

import {Dosage} from './dosage';
import {AnnotatedAdministration, MedicationAdministration, MedicationAdministrationSet} from './medication-administration';

const medicationCoding = {
  coding: [{system: RxNormCode.CODING_STRING, code: '11124'}],
  text: 'vancomycin'
};

describe('MedicationAdministration', () => {
  it('should get rxNorm code from json', () => {
    const medicationAdministration = new MedicationAdministration({
      medicationCodeableConcept: {
        coding: [
          {system: 'not RxNorm', code: '2744-1'},
          {system: RxNormCode.CODING_STRING, code: '11124'}
        ],
        text: 'vancomycin'
      }
    });
    expect(medicationAdministration.rxNormCode).toBeDefined();
    expect(medicationAdministration.rxNormCode as ResourceCode)
        .toBe(RxNormCode.fromCodeString('11124'));
  });

  it('should throw error without rxNorm code', () => {
    const constructor = () => {
      const admin = new MedicationAdministration({});
    };
    expect(constructor).toThrowError();
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
       const medicationAdministration = new MedicationAdministration({
         effectiveTimePeriod: {start: timestampString},
         medicationCodeableConcept: medicationCoding,
       });
       expect(medicationAdministration.timestamp).toBeDefined();
       expect(medicationAdministration.timestamp)
           .toEqual(DateTime.fromISO(timestampString).toUTC());
     });

  it('should get label from medicationReference in json', () => {
    const medicationAdministration = new MedicationAdministration({
      medicationReference: {display: 'vancomycin'},
      medicationCodeableConcept: medicationCoding,
    });
    expect(medicationAdministration.label).toBeDefined();
    expect(medicationAdministration.label).toEqual('vancomycin');
  });

  it('should get label from medicationCodeableConcept if medicationReference is absent',
     () => {
       const medicationAdministration = new MedicationAdministration({
         medicationCodeableConcept:
             {text: 'vancomycin', coding: medicationCoding.coding},
       });
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
    const medicationAdministration = new MedicationAdministration(medAdmin);
    expect(medicationAdministration.dosage)
        .toEqual(new Dosage(jsonDosageString));
  });

  it('should get wasNotGiven information from json', () => {
    const medicationAdministration = new MedicationAdministration({
      wasNotGiven: false,
      medicationCodeableConcept: medicationCoding,
    });
    expect(medicationAdministration.wasNotGiven).toBeDefined();
    expect(medicationAdministration.wasNotGiven).toEqual(false);
  });

  it('should get medicationOrderId information from json', () => {
    const medicationAdministration = new MedicationAdministration({
      prescription: {reference: '24197931'},
      medicationCodeableConcept: medicationCoding,
    });
    expect(medicationAdministration.medicationOrderId).toBeDefined();
    expect(medicationAdministration.medicationOrderId).toEqual('24197931');
  });

  it('should set contained medications from json', () => {
    const medicationAdministration = new MedicationAdministration({
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
    });
    expect(medicationAdministration.containedMedications.length).toEqual(2);
  });

  it('should not set contained medications without ingredient list', () => {
    const medicationAdministration = new MedicationAdministration({
      medicationCodeableConcept: medicationCoding,
      medicationReference: {display: 'Vancomycin', reference: '12345'},
      contained: [
        {resourceType: 'Medication', id: '12', code: medicationCoding},
        {resourceType: 'Medication', id: '345', code: medicationCoding},
      ]
    });
    expect(medicationAdministration.containedMedications.length).toEqual(0);
  });
});

describe('MedicationAdministrationSet', () => {
  it('should throw error with mismatched units', () => {
    const medicationAdministrations = [
      new MedicationAdministration({
        medicationCodeableConcept: medicationCoding,
        dosage: {quantity: {unit: 'unit'}}
      }),
      new MedicationAdministration({
        medicationReference: {display: 'Vancomycin'},
        medicationCodeableConcept: medicationCoding,
        dosage: {quantity: {unit: 'a different unit'}}
      })
    ];
    const constructor = () => {
      const obsSet =
          new MedicationAdministrationSet(medicationAdministrations.map(
              // annotations not important for this test
              x => new AnnotatedAdministration(x, 0, 0)));
    };
    expect(constructor).toThrowError();
  });

  it('should throw error with mismatched RxNorms', () => {
    const medicationAdministrations = [
      new MedicationAdministration({
        medicationCodeableConcept: medicationCoding,
        dosage: {quantity: {unit: 'unit'}}
      }),
      new MedicationAdministration({
        // artificially matching label to test RxNorm mismatch in isolation
        medicationReference: {display: 'Vancomycin'},
        medicationCodeableConcept:
            {coding: [{system: RxNormCode.CODING_STRING, code: '1596450'}]},
        dosage: {quantity: {unit: 'unit'}}
      })
    ];
    const constructor = () => {
      const obsSet =
          new MedicationAdministrationSet(medicationAdministrations.map(
              // annotations not important for this test
              x => new AnnotatedAdministration(x, 0, 0)));
    };
    expect(constructor).toThrowError();
  });

  it('should get max and min dosages', () => {
    const medicationAdministrations = [
      new MedicationAdministration({
        medicationCodeableConcept: medicationCoding,
        dosage: {quantity: {value: 300}}
      }),
      new MedicationAdministration({
        medicationReference: {display: 'Vancomycin'},
        medicationCodeableConcept: medicationCoding,
        dosage: {quantity: {value: 100}}
      }),
      new MedicationAdministration({
        medicationCodeableConcept: medicationCoding,
        dosage: {quantity: {value: 500}}
      }),
      new MedicationAdministration({
        medicationReference: {display: 'Vancomycin'},
        medicationCodeableConcept: medicationCoding,
        dosage: {quantity: {value: 200}}
      })
    ];
    const obsSet =
        new MedicationAdministrationSet(medicationAdministrations.map(
            // annotations not important for this test
            x => new AnnotatedAdministration(x, 0, 0)));

    expect(obsSet.maxDose).toEqual(500);
    expect(obsSet.minDose).toEqual(100);
  });

  it('should pass through units and rxNorm', () => {
    const medicationAdministrations = [new MedicationAdministration({
      medicationReference: {display: 'Gentamicin'},
      medicationCodeableConcept:
          {coding: [{system: RxNormCode.CODING_STRING, code: '1596450'}]},
      dosage: {quantity: {unit: 'unit'}}
    })];

    const obsSet =
        new MedicationAdministrationSet(medicationAdministrations.map(
            // annotations not important for this test
            x => new AnnotatedAdministration(x, 0, 0)));

    expect(obsSet.unit).toEqual('unit');
    expect(obsSet.rxNormCode.codeString).toEqual('1596450');
  });
});
