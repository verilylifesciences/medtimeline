// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

// Disable this check because it's for IE 11 compatibility and we're not worried
// about that in our testing code.
/* tslint:disable:object-literal-shorthand*/
import {HttpClient, HttpClientModule} from '@angular/common/http';
import {async, TestBed} from '@angular/core/testing';
import {DateTime} from 'luxon';

import {ResourceCode} from '../clinicalconcepts/resource-code-group';
import {RxNormCode} from '../clinicalconcepts/rx-norm';
import {ResourceCodeCreator} from '../conceptmappings/resource-code-creator';
import {makeMedicationAdministration, makeMedicationOrder} from '../test_utils';

import {MedicationAdministration} from './medication-administration';
import {AnnotatedMedicationOrder, MedicationOrder, MedicationOrderSet} from './medication-order';

const REQUEST_ID = '1234';

const vancMedConcept = {
  medicationCodeableConcept: {
    coding: [
      {system: 'not RxNorm', code: '2744-1'},
      {system: RxNormCode.CODING_STRING, code: '11124'},
    ],
    text: 'Vancomycin'
  }
};

describe('MedicationOrder', () => {
  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientModule],
    });
    const rcm = new ResourceCodeCreator(TestBed.get(HttpClient));
    Promise.all(rcm.loadConfigurationFromFiles.values());
  }));

  it('should get rxNorm code from json', () => {
    const medicationOrder = new MedicationOrder(
        {
          medicationCodeableConcept: {
            coding: [
              {system: 'not RxNorm', code: '2744-1'},
              {system: RxNormCode.CODING_STRING, code: '11124'},
            ],
            text: 'Vancomycin'
          }
        },
        REQUEST_ID);
    expect(medicationOrder.rxNormCode).toBeDefined();
    expect(medicationOrder.rxNormCode as ResourceCode)
        .toBe(RxNormCode.fromCodeString('11124'));
  });

  it('should get label from json', () => {
    const medicationOrder = new MedicationOrder(
        {
          medicationReference: {display: 'vancomycin'},
          medicationCodeableConcept: {
            coding: [
              {system: RxNormCode.CODING_STRING, code: '11124'},
            ]
          },
        },
        REQUEST_ID);
    expect(medicationOrder.label).toBeDefined();
    expect(medicationOrder.label).toEqual('vancomycin');
  });

  it('should get dosage instruction from json', () => {
    const medicationOrder = new MedicationOrder(
        {
          medicationReference: {display: 'vancomycin'},
          dosageInstruction: [{text: 'dosage'}],
          medicationCodeableConcept: {
            coding: [
              {system: RxNormCode.CODING_STRING, code: '11124'},
            ]
          },
        },
        REQUEST_ID);
    expect(medicationOrder.dosageInstruction).toBeDefined();
    expect(medicationOrder.dosageInstruction).toEqual('dosage');
  });

  it('should indicate lack of dosage instructions when applicable', () => {
    const medicationOrder = new MedicationOrder(
        {
          medicationReference: {display: 'vancomycin'},
          medicationCodeableConcept: {
            coding: [
              {system: RxNormCode.CODING_STRING, code: '11124'},
            ]
          },
        },
        REQUEST_ID);
    expect(medicationOrder.dosageInstruction).toBeDefined();
    expect(medicationOrder.dosageInstruction)
        .toEqual('Could not retrieve dosage instructions.');
  });

  it('should throw error with more than one dosage instruction', () => {
    const json = {
      medicationReference: {display: 'vancomycin'},
      dosageInstruction: [{text: 'dosage1'}, {text: 'dosage2'}],
      medicationCodeableConcept: {
        coding: [
          {system: RxNormCode.CODING_STRING, code: '11124'},
        ]
      },
    };
    expect(() => {
      const x = new MedicationOrder(json, REQUEST_ID);
    }).toThrowError(new RegExp(`Request IDs: ${REQUEST_ID}`));
  });

  it('should get label from medicationCodeableConcept if medicationReference is absent',
     () => {
       const medicationOrder = new MedicationOrder(
           {
             medicationCodeableConcept: {
               text: 'vancomycin',
               coding: [
                 {system: RxNormCode.CODING_STRING, code: '11124'},
               ]
             },
           },
           REQUEST_ID);
       expect(medicationOrder.label).toBeDefined();
       expect(medicationOrder.label).toEqual('vancomycin');
     });
});

describe('AnnotatedMedicationOrder', () => {
  let earliestAdministration;
  let middleAdministration;
  let latestAdministration;
  let medicationAdministrations;

  let medicationOrder;
  let annotatedMedicationOrder;


  beforeEach(async(() => {
    TestBed.configureTestingModule({imports: [HttpClientModule]})
        .compileComponents();
    const rcm = new ResourceCodeCreator(TestBed.get(HttpClient));
    Promise.all(rcm.loadConfigurationFromFiles.values());


    earliestAdministration =
        makeMedicationAdministration('2012-08-04T11:00:00.000Z');
    middleAdministration =
        makeMedicationAdministration('2012-08-09T11:00:00.000Z');
    latestAdministration =
        makeMedicationAdministration('2012-08-18T11:00:00.000Z');
    medicationAdministrations =
        [latestAdministration, earliestAdministration, middleAdministration];

    medicationOrder = new MedicationOrder(vancMedConcept, REQUEST_ID);
    annotatedMedicationOrder = new AnnotatedMedicationOrder(
        medicationOrder, medicationAdministrations);
  }));


  it('should get the first and last MedicationAdministration from list of MedicationAdministrations',
     () => {
       expect(annotatedMedicationOrder.firstAdministration)
           .toEqual(earliestAdministration);
       expect(annotatedMedicationOrder.lastAdministration)
           .toEqual(latestAdministration);
     });

  it('should annotate medication administrations', () => {
    const annotatedMedicationList =
        annotatedMedicationOrder.medicationAdministrationSet.resourceList;
    expect(annotatedMedicationList.length).toEqual(3);

    expect(annotatedMedicationList[0].medAdministration)
        .toEqual(earliestAdministration);
    expect(annotatedMedicationList[0].previousDose).toBeUndefined();

    expect(annotatedMedicationList[1].medAdministration)
        .toEqual(middleAdministration);
    expect(annotatedMedicationList[1].previousDose)
        .toEqual(annotatedMedicationList[0]);

    expect(annotatedMedicationList[2].medAdministration)
        .toEqual(latestAdministration);
    expect(annotatedMedicationList[2].previousDose)
        .toEqual(annotatedMedicationList[1]);
  });
});

describe('MedicationOrderSet', () => {
  it('should get high and low doses', () => {
    const medAdmin1 =
        makeMedicationAdministration(DateTime.utc(1965, 3, 22).toString(), 92);
    const medAdmin2 =
        makeMedicationAdministration(DateTime.utc(1965, 3, 23).toString(), 19);

    const medAdmin1Order2 =
        makeMedicationAdministration(DateTime.utc(1965, 3, 25).toString(), 23);
    const medAdmin2Order2 =
        makeMedicationAdministration(DateTime.utc(1965, 3, 26).toString(), 17);

    const annotatedOrder = new AnnotatedMedicationOrder(
        makeMedicationOrder(), [medAdmin1, medAdmin2]);
    const annotatedOrder2 = new AnnotatedMedicationOrder(
        makeMedicationOrder(), [medAdmin1Order2, medAdmin2Order2]);

    const medOrderSet =
        new MedicationOrderSet([annotatedOrder, annotatedOrder2]);
    expect(medOrderSet.minDose).toEqual(17);
    expect(medOrderSet.maxDose).toEqual(92);
  });

  it('should get units', () => {
    const medAdmin1 =
        makeMedicationAdministration(DateTime.utc(1965, 3, 22).toString(), 92);
    const medAdmin2 =
        makeMedicationAdministration(DateTime.utc(1965, 3, 23).toString(), 19);
    const annotatedOrder = new AnnotatedMedicationOrder(
        makeMedicationOrder(), [medAdmin1, medAdmin2]);
    const medOrderSet = new MedicationOrderSet([annotatedOrder]);
    expect(medOrderSet.unit).toBe('mg');
  });

  it('should throw error if units do not match', () => {
    const medicationAdministrations = [new MedicationAdministration(
        {
          ...vancMedConcept,
          dosage: {quantity: {unit: 'unit'}},
          effectiveTimeDateTime: DateTime.utc(1965, 3, 22).toString()
        },
        REQUEST_ID)];

    const medicationAdministrations2 = [new MedicationAdministration(
        {
          ...vancMedConcept,
          dosage: {quantity: {unit: 'different unit'}},
          effectiveTimeDateTime: DateTime.utc(1965, 3, 19).toString()
        },
        REQUEST_ID)];

    const annotatedOrder = new AnnotatedMedicationOrder(
        makeMedicationOrder(), medicationAdministrations);
    const annotatedOrder2 = new AnnotatedMedicationOrder(
        makeMedicationOrder(), medicationAdministrations2);
    expect(() => {
      const x = new MedicationOrderSet([annotatedOrder, annotatedOrder2]);
    }).toThrowError(new RegExp(`Request IDs: ${REQUEST_ID}`));
  });


  // TODO: This test is not actually throwing an error because of the RxNorms
  // not matching. We should fix this test and update the expect clause to
  // ensure the constructor is erroring for the reason being tested.
  it('should throw error if RxNorms do not match.', () => {
    const medicationAdministrations =
        [new MedicationAdministration({...vancMedConcept}, REQUEST_ID)];

    const medicationAdministrations2 = [new MedicationAdministration(
        {
          medicationCodeableConcept: {
            coding: [
              {system: 'not RxNorm', code: '2744-1'},
              {system: RxNormCode.CODING_STRING, code: '310466'},
            ],
            text: 'Gentamicin Sulfate (USP) 0.003 MG/MG Ophthalmic Ointment'
          }
        },
        REQUEST_ID)];

    const annotatedOrder = new AnnotatedMedicationOrder(
        makeMedicationOrder(), medicationAdministrations);
    const annotatedOrder2 = new AnnotatedMedicationOrder(
        makeMedicationOrder(), medicationAdministrations2);

    expect(() => {
      const x = new MedicationOrderSet([annotatedOrder, annotatedOrder2]);
    }).toThrowError();
  });
});
/* tslint:enable:object-literal-shorthand*/
