// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {DateTime, Interval} from 'luxon';

import {AnnotatedObservation} from '../fhir-data-classes/annotated-observation';
import {Observation} from '../fhir-data-classes/observation';
import {ObservationSet} from '../fhir-data-classes/observation-set';
import {ChartType} from '../graphtypes/graph/graph.component';
import {StubFhirService} from '../test_utils';

import {labResult} from './display-grouping';
import {LOINCCode} from './loinc-code';
import {CachedResourceCodeGroup, ResourceCode, ResourceCodeGroup} from './resource-code-group';
import {ResourceCodeManager} from './resource-code-manager';

const interval = Interval.fromDateTimes(
    DateTime.fromISO('2012-08-04T11:00:00.000Z').toUTC(),
    DateTime.fromISO('2012-08-05T11:00:00.000Z').toUTC());

const REQUEST_ID = '1234';
const returnedObservations: AnnotatedObservation[] = [
  new AnnotatedObservation(new Observation(
      {
        code: {
          text: 'Temperature',
          coding: [{system: LOINCCode.CODING_STRING, code: '8310-5'}]
        },
        valueQuantity: {value: 97},
        effectiveDateTime: '2012-08-04T12:00:00.000Z'
      },
      REQUEST_ID)),
  new AnnotatedObservation(new Observation(
      {
        code: {
          text: 'Temperature',
          coding: [{system: LOINCCode.CODING_STRING, code: '8310-5'}]
        },
        valueQuantity: {value: 98},
        effectiveDateTime: '2012-08-04T15:00:00.000Z'
      },
      REQUEST_ID))
];
const returnedObservationSets =
    new Array(new ObservationSet(returnedObservations));

class StubCachedResourceCodeGroup extends
    CachedResourceCodeGroup<ObservationSet, AnnotatedObservation> {
  getResourceFromFhir(dateRange: Interval): Promise<AnnotatedObservation[]> {
    return Promise.resolve(returnedObservations);
  }
  formatRawResults(rawResults: AnnotatedObservation[]):
      Promise<ObservationSet[]> {
    return Promise.resolve(new Array(new ObservationSet(rawResults)));
  }
}

describe('ResourceCodeGroup', () => {
  it('should correctly determine whether it should be shown if any ResourceCode is marked as default.',
     () => {
       // These ResourceCodes have mixed showByDefault fields.
       const resourceCodes = ResourceCodeManager.labLoincs;
       const resourceCodeGroup = new ResourceCodeGroup(
           null, 'label', resourceCodes, labResult, ChartType.LINE);
       expect(resourceCodeGroup.showByDefault).toBeTruthy();
     });
});

describe('CachedResourceCodeGroup', () => {
  it('if all uncached should call FHIR service a single time and cache should be updated',
     (done: DoneFn) => {
       const stub = new StubCachedResourceCodeGroup(
           new StubFhirService(), 'rsc_label', new Array<ResourceCode>(),
           undefined /* concept group */, ChartType.SCATTER);

       spyOn(stub, 'getResourceFromFhir').and.callThrough();
       const result = stub.getResourceSet(interval);

       result.then(res => {
         expect(res).toEqual(returnedObservationSets);
         //
         expect(stub.dataCache.get('2012-08-04')).toEqual(returnedObservations);
         expect(stub.dataCache.get('2012-08-04')).toEqual(returnedObservations);
         expect(stub.dataCache.get('2012-08-05')).toEqual(new Array());
         expect(stub.getResourceFromFhir).toHaveBeenCalledTimes(1);
         done();
       });
     });

  it('if all days in date range are cached, should not call for the FHIR resource again.',
     (done: DoneFn) => {
       const stub = new StubCachedResourceCodeGroup(
           new StubFhirService(), 'rsc_label', new Array<ResourceCode>(),
           undefined /* concept group */, ChartType.SCATTER);

       spyOn(stub, 'getResourceFromFhir').and.callThrough();

       stub.getResourceSet(interval)
           .then(result => {
             expect(result).toEqual(returnedObservationSets);
           })
           .then(x => {
             return stub.getResourceSet(interval);
           })
           .then(result => {
             expect(result).toEqual(returnedObservationSets);
             // The FHIR call should have only been called once. The first
             // time it got stored in the cache; the second time since the
             // value was in the cache it shouldn't have been called.
             expect(stub.getResourceFromFhir).toHaveBeenCalledTimes(1);
             done();
           });
     });

  it('if today is requested, it should not be added to the cache.',
     (done: DoneFn) => {
       const stub = new StubCachedResourceCodeGroup(
           new StubFhirService(), 'rsc_label', new Array<ResourceCode>(),
           undefined /* concept group */, ChartType.SCATTER);
       const now = DateTime.utc();
       const todaysObservations: AnnotatedObservation[] =
           [new AnnotatedObservation(new Observation(
               {
                 code: {
                   text: 'Temperature',
                   coding: [{system: LOINCCode.CODING_STRING, code: '8310-5'}]
                 },
                 valueQuantity: {value: 97},
                 effectiveDateTime: now.toISOTime()
               },
               REQUEST_ID))];

       const myspy = spyOn(stub, 'getResourceFromFhir')
                         .and.returnValue(Promise.resolve(todaysObservations));

       // just get data for today.
       const result = stub.getResourceSet(
           Interval.fromDateTimes(now.startOf('day'), now.endOf('day')));

       result.then(res => {
         expect(stub.getResourceFromFhir).toHaveBeenCalledTimes(1);
         expect(myspy.calls.count()).toBe(1);
         expect(res).toEqual(new Array(new ObservationSet(todaysObservations)));
         expect(Array.from(stub.dataCache.keys())).toEqual(new Array());
         done();
       });
     });

  it('if part of a date range is in the cache, call FHIR for dates not in the cache.',
     (done: DoneFn) => {
       const stub = new StubCachedResourceCodeGroup(
           new StubFhirService(), 'rsc_label', new Array<ResourceCode>(),
           undefined /* concept group */, ChartType.SCATTER);
       stub.dataCache.set('2012-08-06', new Array());
       const intervalToGet = Interval.fromDateTimes(
           DateTime.fromISO('2012-08-04T00:00:00.000Z').toUTC(),
           DateTime.fromISO('2012-08-07T23:00:00.000Z').toUTC());

       const secondCallReturnObservations =
           [new AnnotatedObservation(new Observation(
               {
                 code: {
                   text: 'Temperature',
                   coding: [{system: LOINCCode.CODING_STRING, code: '8310-5'}]
                 },
                 valueQuantity: {value: 97},
                 effectiveDateTime: '2012-08-07T12:00:00.000Z'
               },
               REQUEST_ID))];
       spyOn(stub, 'getResourceFromFhir')
           .and.returnValues(
               Promise.resolve(returnedObservations),
               Promise.resolve(secondCallReturnObservations));
       const result = stub.getResourceSet(intervalToGet);

       result.then(res => {
         //  expect(res).toEqual(returnedObservationSets);
         expect(stub.dataCache.get('2012-08-04')).toEqual(returnedObservations);
         expect(stub.dataCache.get('2012-08-05')).toEqual(new Array());
         expect(stub.dataCache.get('2012-08-06')).toEqual(new Array());
         expect(stub.dataCache.get('2012-08-07'))
             .toEqual(secondCallReturnObservations);
         expect(stub.getResourceFromFhir).toHaveBeenCalledTimes(2);
         done();
       });
     });

  it('if an error is raised when data is fetched, the error is bubbled and the cache is unchanged.',
     (done: DoneFn) => {
       const stub = new StubCachedResourceCodeGroup(
           new StubFhirService(), 'rsc_label', new Array<ResourceCode>(),
           undefined /* concept group */, ChartType.SCATTER);
       stub.dataCache.set('2012-08-06', new Array());
       const intervalToGet = Interval.fromDateTimes(
           DateTime.fromISO('2012-08-04T00:00:00.000Z').toUTC(),
           DateTime.fromISO('2012-08-08T00:00:00.000Z').toUTC());
       // throw an error the second time getResourceFromFhir is called.
       spyOn(stub, 'getResourceFromFhir')
           .and.returnValues(
               Promise.resolve(returnedObservations),
               Promise.reject(Error('error')));
       stub.getResourceSet(intervalToGet).catch(err => {
         expect(Array.from(stub.dataCache.keys()).length).toEqual(1);
         expect(stub.dataCache.get('2012-08-06')).toEqual(new Array());
         expect(stub.getResourceFromFhir).toHaveBeenCalledTimes(2);
         done();
       });
     });

  it('if an error is raised when data is formatted, the error is bubbled but the cache is updated.',
     (done: DoneFn) => {
       const stub = new StubCachedResourceCodeGroup(
           new StubFhirService(), 'rsc_label', new Array<ResourceCode>(),
           undefined /* concept group */, ChartType.SCATTER);
       spyOn(stub, 'formatRawResults')
           .and.returnValue(Promise.reject(Error('error')));
       stub.getResourceSet(interval).catch(err => {
         expect(stub.dataCache.get('2012-08-04')).toEqual(returnedObservations);
         expect(stub.dataCache.get('2012-08-05')).toEqual(new Array());
         done();
       });
     });

  it('if a result does not have a timestamp, the error is bubbled and the cache is unchanged.',
     (done: DoneFn) => {
       const stub = new StubCachedResourceCodeGroup(
           new StubFhirService(), 'rsc_label', new Array<ResourceCode>(),
           undefined /* concept group */, ChartType.SCATTER);

       const observationsNoTimestamp =
           [new AnnotatedObservation(new Observation(
               {
                 code: {
                   text: 'Temperature',
                   coding: [{system: LOINCCode.CODING_STRING, code: '8310-5'}]
                 },
                 valueQuantity: {value: 97},
               },
               REQUEST_ID))];
       spyOn(stub, 'getResourceFromFhir')
           .and.returnValue(Promise.resolve(observationsNoTimestamp));
       stub.getResourceSet(interval).catch(err => {
         expect(Array.from(stub.dataCache.keys()).length).toEqual(0);
         done();
       });
     });
});
