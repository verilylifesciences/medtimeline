// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

// Disable this check because it's for IE 11 compatibility and we're not worried
// about that in our testing code.
/* tslint:disable:object-literal-shorthand*/
import {async} from '@angular/core/testing';
import {Interval} from 'luxon';
import {DateTime} from 'luxon';
import {of} from 'rxjs';

import {ResourceCode} from '../clinicalconcepts/resource-code-group';
import {RxNormCode} from '../clinicalconcepts/rx-norm';
import {makeMedicationAdministration, makeMedicationOrder} from '../test_utils';

import {AnnotatedAdministration, MedicationAdministration, MedicationAdministrationSet} from './medication-administration';
import {MedicationOrder, MedicationOrderSet} from './medication-order';

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
  let fhirServiceStub: any;
  const dateRange = Interval.fromDateTimes(
      DateTime.fromISO('2018-09-03T00:00:00.00'),
      DateTime.fromISO('2018-09-30T00:00:00.00'));

  const earliestAdministration =
      makeMedicationAdministration('2012-08-04T11:00:00.000Z');
  const middleAdministration =
      makeMedicationAdministration('2012-08-09T11:00:00.000Z');
  const latestAdministration =
      makeMedicationAdministration('2012-08-18T11:00:00.000Z');
  const medicationAdministrations =
      [latestAdministration, earliestAdministration, middleAdministration];

  beforeEach(async(() => {
    fhirServiceStub = {
      getMedicationAdministrationsWithOrder(id: string, code: RxNormCode) {
        return of(medicationAdministrations).toPromise();
      }
    };
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

  it('should get rxnorm code from label if it\'s not encoded', () => {
    const medicationOrder = new MedicationOrder(
        {medicationCodeableConcept: {text: 'Vancomycin'}}, REQUEST_ID);
    expect(medicationOrder.rxNormCode).toBeDefined();
    expect(medicationOrder.rxNormCode as ResourceCode)
        .toBe(RxNormCode.fromCodeString('11124'));
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

  it('should get the first and last MedicationAdministration from list of MedicationAdministrations',
     () => {
       const medicationOrder = new MedicationOrder(vancMedConcept, REQUEST_ID);
       Promise
           .resolve(
               medicationOrder.setMedicationAdministrations(fhirServiceStub))
           .then(help => {
             expect(medicationOrder.firstAdministration)
                 .toEqual(earliestAdministration);
             expect(medicationOrder.lastAdmininistration)
                 .toEqual(latestAdministration);
           });
     });

  it('should annotate medication administrations', () => {
    const medicationOrder = new MedicationOrder(vancMedConcept, REQUEST_ID);
    Promise
        .resolve(medicationOrder.setMedicationAdministrations(fhirServiceStub))
        .then(help => {
          const annotated =
              medicationOrder.administrationsForOrder.resourceList;
          expect(annotated.length).toEqual(3);

          expect(annotated[0].medAdministration)
              .toEqual(earliestAdministration);
          expect(annotated[0].previousDose).toBeUndefined();

          expect(annotated[1].medAdministration).toEqual(middleAdministration);
          expect(annotated[1].previousDose).toEqual(annotated[0]);

          expect(annotated[2].medAdministration).toEqual(latestAdministration);
          expect(annotated[2].previousDose).toEqual(annotated[1]);
        });
  });
});

describe('MedicationOrderSet', () => {
  it('should get high and low doses', () => {
    const order = makeMedicationOrder();
    const order2 = makeMedicationOrder();

    const medAdmin1 =
        makeMedicationAdministration(DateTime.utc(1965, 3, 22).toString(), 92);
    const medAdmin2 =
        makeMedicationAdministration(DateTime.utc(1965, 3, 23).toString(), 19);

    const medAdmin1Order2 =
        makeMedicationAdministration(DateTime.utc(1965, 3, 25).toString(), 23);
    const medAdmin2Order2 =
        makeMedicationAdministration(DateTime.utc(1965, 3, 26).toString(), 17);

    // Set administrations manually to avoid FHIR call.
    order.administrationsForOrder = new MedicationAdministrationSet(
        // annotations not important for this test
        [medAdmin1, medAdmin2].map(x => new AnnotatedAdministration(x)));
    order.firstAdministration = medAdmin1;
    order.lastAdmininistration = medAdmin2;

    order2.administrationsForOrder =
        new MedicationAdministrationSet([medAdmin1Order2, medAdmin2Order2].map(
            x => new AnnotatedAdministration(x)));
    order2.firstAdministration = medAdmin1Order2;
    order2.lastAdmininistration = medAdmin2Order2;

    const medOrderSet = new MedicationOrderSet([order, order2]);
    expect(medOrderSet.minDose).toEqual(17);
    expect(medOrderSet.maxDose).toEqual(92);
  });

  it('should get units', () => {
    const medAdmin1 =
        makeMedicationAdministration(DateTime.utc(1965, 3, 22).toString(), 92);
    const medAdmin2 =
        makeMedicationAdministration(DateTime.utc(1965, 3, 23).toString(), 19);

    // Set administrations manually to avoid FHIR call.
    const order = makeMedicationOrder();
    order.administrationsForOrder =
        new MedicationAdministrationSet([medAdmin1, medAdmin2].map(
            // annotations not important for this test
            x => new AnnotatedAdministration(x)));
    order.firstAdministration = medAdmin1;
    order.lastAdmininistration = medAdmin2;

    const medOrderSet = new MedicationOrderSet([order]);
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

    const order = makeMedicationOrder();
    order.administrationsForOrder =
        new MedicationAdministrationSet(medicationAdministrations.map(
            // annotations not important for this test
            x => new AnnotatedAdministration(x)));
    order.firstAdministration = medicationAdministrations[0];
    order.lastAdmininistration = medicationAdministrations[0];

    const order2 = makeMedicationOrder();
    order2.administrationsForOrder =
        new MedicationAdministrationSet(medicationAdministrations2.map(
            // annotations not important for this test
            x => new AnnotatedAdministration(x)));
    order2.firstAdministration = medicationAdministrations2[0];
    order2.lastAdmininistration = medicationAdministrations2[0];

    expect(() => {
      const x = new MedicationOrderSet([order, order2]);
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
              {system: RxNormCode.CODING_STRING, code: '1596450'},
            ],
            text: 'Gentamicin'
          }
        },
        REQUEST_ID)];

    const order = makeMedicationOrder();
    order.administrationsForOrder =
        new MedicationAdministrationSet(medicationAdministrations.map(
            // annotations not important for this test
            x => new AnnotatedAdministration(x)));
    const order2 = makeMedicationOrder();
    order2.administrationsForOrder =
        new MedicationAdministrationSet(medicationAdministrations2.map(
            // annotations not important for this test
            x => new AnnotatedAdministration(x)));

    expect(() => {
      const x = new MedicationOrderSet([order, order2]);
    }).toThrowError();
  });
});
/* tslint:enable:object-literal-shorthand*/
