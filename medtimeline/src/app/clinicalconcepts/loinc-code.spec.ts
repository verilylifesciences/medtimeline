// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {of} from 'rxjs';

import {Observation} from '../fhir-data-classes/observation';
import {ChartType} from '../graphtypes/graph/graph.component';

import {vitalSign} from './display-grouping';
import {LOINCCode, LOINCCodeGroup} from './loinc-code';

describe('LOINCCodeGroup', () => {
  it('should correctly separate list of Observations into ObservationSets if ' +
         'inner components are present',
     (done: DoneFn) => {
       const observations: Observation[][] = [[
         new Observation({
           code: {
             text: 'BP',
             coding: [{system: LOINCCode.CODING_STRING, code: '55284-4'}]
           },
           valueQuantity: {value: 97},
         }),
         new Observation({
           code: {
             text: 'BP',
             coding: [{system: LOINCCode.CODING_STRING, code: '55284-4'}]
           },
           valueQuantity: {value: 98},
         }),
         new Observation({
           code: {
             text: 'BP',
             coding: [{system: LOINCCode.CODING_STRING, code: '55284-4'}]
           },
           component: [{
             code: {
               coding: [{system: LOINCCode.CODING_STRING, code: '55284-4'}],
               text: 'Diastolic BP'
             },
             valueQuantity: {value: 69}
           }]
         })
       ]];

       const fhirServiceStub: any = {
         getObservationsForCodeGroup(id: string) {
           return of(observations).toPromise();
         }
       };

       const loincGroup = new LOINCCodeGroup(
           fhirServiceStub, 'label', [], vitalSign, ChartType.LINE);
       Promise.resolve(loincGroup.getResourceFromFhir(this.interval))
           .then(result => {
             // We should have two ObservationSets; one for the first two
             // Observations corresponding to BP that have values, and one for
             // the inner component of the last Observation.
             expect(result.length).toEqual(2);
             expect(result[0].label).toEqual('BP');
             expect(result[0].resourceList.length).toEqual(2);
             expect(result[1].label).toEqual('Diastolic BP');
             expect(result[1].resourceList.length).toEqual(1);
             done();
           });
     });

  it('should return one observation set for each observation type',
     (done: DoneFn) => {
       const observationsOfDifferentCodes: Observation[][] = [[
         new Observation({
           code: {
             text: 'Vanc Pk',
             coding: [{system: LOINCCode.CODING_STRING, code: '4090-7'}]
           },
           valueQuantity: {value: 97},
         }),
         new Observation({
           code: {
             text: 'Vanc Pk',
             coding: [{system: LOINCCode.CODING_STRING, code: '4090-7'}]
           },
           valueQuantity: {value: 98},
         }),
         new Observation({
           code: {
             text: 'Vanc Tr',
             coding: [{system: LOINCCode.CODING_STRING, code: '4092-3'}]
           },
           valueQuantity: {value: 1},
         }),
         new Observation({
           code: {
             text: 'Vanc Tr',
             coding: [{system: LOINCCode.CODING_STRING, code: '4092-3'}]
           },
           valueQuantity: {value: 2},
         }),
         new Observation({
           code: {
             text: 'Vanc',
             coding: [{system: LOINCCode.CODING_STRING, code: '20578-1'}]
           },
           valueQuantity: {value: 1},
         }),
         new Observation({
           code: {
             text: 'Vanc',
             coding: [{system: LOINCCode.CODING_STRING, code: '20578-1'}]
           },
           valueQuantity: {value: 2},
         })
       ]];

       const fhirServiceStub: any = {
         getObservationsForCodeGroup(id: string) {
           return of(observationsOfDifferentCodes).toPromise();
         }
       };

       const loincGroup = new LOINCCodeGroup(
           fhirServiceStub, 'label',
           [
             LOINCCode.fromCodeString('4090-7'),
             LOINCCode.fromCodeString('4092-3'),
             LOINCCode.fromCodeString('20578-1')
           ],
           vitalSign, ChartType.LINE);
       Promise.resolve(loincGroup.getResourceFromFhir(this.interval))
           .then(result => {
             // We should have three observation sets, one for each concept in
             // the LOINCCodeGroup.
             expect(result.length).toEqual(3);
             // Each one of those series should have the two datapoints we
             // passed.
             for (const series of result) {
               expect(series.resourceList.length).toBe(2);
             }
             done();
           });
     });
});
