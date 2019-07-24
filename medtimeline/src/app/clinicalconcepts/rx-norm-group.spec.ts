// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {DateTime, Interval} from 'luxon';

import {MedicationAdministration} from '../fhir-data-classes/medication-administration';
import {MedicationOrder} from '../fhir-data-classes/medication-order';
import {ChartType} from '../graphtypes/graph/graph.component';
import {StubFhirService} from '../test_utils';

import {DisplayGrouping} from './display-grouping';
import {RxNormCode} from './rx-norm';
import {RxNormCodeGroup} from './rx-norm-group';

const interval = Interval.fromDateTimes(
    DateTime.fromISO('2012-08-04T11:00:00.000Z').toUTC(),
    DateTime.fromISO('2012-08-07T11:00:00.000Z').toUTC());

const REQUEST_ID = '1234';

const orderAAdmins = [
  new MedicationAdministration(
      {
        effectiveTimeDateTime: '2012-08-04T11:00:00.000Z',
        medicationReference: {display: 'vancomycin'},
        dosage: {
          quantity: {value: 50, unit: 'mg'},
          route: {text: 'oral'},
          text: '50 mg tablet daily'
        },
        medicationCodeableConcept: {
          coding: [{system: RxNormCode.CODING_STRING, code: '11124'}],
          text: 'vancomycin'
        },
        prescription: {reference: 'OrderA'}
      },
      REQUEST_ID),
  new MedicationAdministration(
      {
        effectiveTimeDateTime: '2012-08-05T11:00:00.000Z',
        medicationReference: {display: 'vancomycin'},
        dosage: {
          quantity: {value: 50, unit: 'mg'},
          route: {text: 'oral'},
          text: '50 mg tablet daily'
        },
        medicationCodeableConcept: {
          coding: [{system: RxNormCode.CODING_STRING, code: '11124'}],
          text: 'vancomycin'
        },
        prescription: {reference: 'OrderA'}
      },
      REQUEST_ID),
];

const orderBAdmins = [new MedicationAdministration(
    {
      effectiveTimeDateTime: '2012-08-06T11:00:00.000Z',
      medicationReference: {display: 'vancomycin'},
      dosage: {
        quantity: {value: 10, unit: 'mg'},
        route: {text: 'oral'},
        text: '10 mg tablet daily'
      },
      medicationCodeableConcept: {
        coding: [{system: RxNormCode.CODING_STRING, code: '11124'}],
        text: 'vancomycin'
      },
      prescription: {reference: 'OrderB'}
    },
    REQUEST_ID)];

const medicationOrderA = new MedicationOrder(
    {
      medicationCodeableConcept: {
        coding: [
          {system: RxNormCode.CODING_STRING, code: '11124'},
        ],
        text: 'Vancomycin'
      },
      id: 'OrderA',
      status: 'completed'
    },
    REQUEST_ID);

const medicationOrderB = new MedicationOrder(
    {
      medicationCodeableConcept: {
        coding: [
          {system: RxNormCode.CODING_STRING, code: '11124'},
        ],
        text: 'Vancomycin'
      },
      id: 'OrderB',
      status: 'active'
    },
    REQUEST_ID);

class RxStubFhirService extends StubFhirService {
  getMedicationAdministrationsWithCode(code: RxNormCode, dateRange: Interval):
      Promise<MedicationAdministration[]> {
    // Only return a partial set for each drug so that we ensure all the calls
    // work to get all administrations for the orders.
    if (code === RxNormCode.fromCodeString('11124')) {
      return Promise.resolve([orderAAdmins[0], orderBAdmins[0]]);
    }
  }

  getMedicationOrderWithId(id: string): Promise<MedicationOrder> {
    if (id === 'OrderA') {
      return Promise.resolve(medicationOrderA);
    } else if (id === 'OrderB') {
      return Promise.resolve(medicationOrderB);
    }
    throw Error('Bad medication order ID: ' + id);
  }

  getMedicationAdministrationsWithOrder(id: string, code: RxNormCode):
      Promise<MedicationAdministration[]> {
    if (id === 'OrderA') {
      return Promise.resolve(orderAAdmins);
    } else if (id === 'OrderB') {
      return Promise.resolve(orderBAdmins);
    }
    throw Error('Bad medication order ID: ' + id);
  }
}

describe('RxNormGroup', () => {
  it('should do all the calls to get all the orders and admins',
     (done: DoneFn) => {
       const rxNormGroup = new RxNormCodeGroup(
           new RxStubFhirService(), 'antibiotics',
           [RxNormCode.fromCodeString('11124')],
           new DisplayGrouping('lbl', 'red'), ChartType.LINE);

       rxNormGroup.getResourceSet(interval).then(rxNorms => {
         // Check to see that each rxNorm got its correct orders and
         // administrations.
         const vanc: RxNormCode =
             rxNorms.filter(x => x.codeString === '11124')[0];
         expect(vanc).toBeDefined();
         expect(vanc.orders.resourceList.length).toBe(2);

         const vancOrderA =
             vanc.orders.resourceList.filter(x => x.orderId === 'OrderA')[0];
         expect(vancOrderA).toBeDefined();
         const vancOrderB =
             vanc.orders.resourceList.filter(x => x.orderId === 'OrderB')[0];
         expect(vancOrderB).toBeDefined();

         expect(vancOrderA.administrationsForOrder.resourceList.map(
                    x => x.medAdministration))
             .toEqual(orderAAdmins);

         expect(vancOrderB.administrationsForOrder.resourceList.map(
                    x => x.medAdministration))
             .toEqual(orderBAdmins);
         done();
       });
     });

  it('should only cache orders that are completed/stopped', (done: DoneFn) => {
    const rxNormGroup = new RxNormCodeGroup(
        new RxStubFhirService(), 'antibiotics',
        [RxNormCode.fromCodeString('11124')], new DisplayGrouping('lbl', 'red'),
        ChartType.LINE);

    rxNormGroup.getResourceSet(interval).then(rxNorms => {
      expect(rxNormGroup.medicationOrderCache.has('OrderA')).toBe(true);
      expect(rxNormGroup.medicationOrderCache.has('OrderB')).toBe(false);
      expect(rxNormGroup.medicationOrderCache.get('OrderA'))
          .toEqual(medicationOrderA);
      done();
    });
  });

  it('should not call getMedicationOrderWithId for orders that have been cached.',
     (done: DoneFn) => {
       const fhirService = new RxStubFhirService();
       const rxNormGroup = new RxNormCodeGroup(
           fhirService, 'antibiotics', [RxNormCode.fromCodeString('11124')],
           new DisplayGrouping('lbl', 'red'), ChartType.LINE);

       rxNormGroup.medicationOrderCache.set('OrderA', medicationOrderA);
       spyOn(fhirService, 'getMedicationOrderWithId').and.callThrough();

       rxNormGroup.getResourceSet(interval).then(rxNorms => {
         expect(fhirService.getMedicationOrderWithId).toHaveBeenCalledTimes(1);
         expect(fhirService.getMedicationOrderWithId)
             .toHaveBeenCalledWith('OrderB');
         // check that even with medication Orders coming from the cache,
         // the final results are correct.
         const vanc: RxNormCode =
             rxNorms.filter(x => x.codeString === '11124')[0];
         expect(vanc).toBeDefined();
         expect(vanc.orders.resourceList.length).toBe(2);

         const vancOrderA =
             vanc.orders.resourceList.filter(x => x.orderId === 'OrderA')[0];
         expect(vancOrderA).toBeDefined();
         const vancOrderB =
             vanc.orders.resourceList.filter(x => x.orderId === 'OrderB')[0];
         expect(vancOrderB).toBeDefined();

         expect(vancOrderA.administrationsForOrder.resourceList.map(
                    x => x.medAdministration))
             .toEqual(orderAAdmins);

         expect(vancOrderB.administrationsForOrder.resourceList.map(
                    x => x.medAdministration))
             .toEqual(orderBAdmins);
         done();
       });
     });
});
