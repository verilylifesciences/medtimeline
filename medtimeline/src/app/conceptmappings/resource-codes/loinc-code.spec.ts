// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

// Disable this check because it's for IE 11 compatibility and we're not worried
// about that in our testing code.
/* tslint:disable:object-literal-shorthand*/

import {DateTime, Interval} from 'luxon';

import {AnnotatedObservation} from '../../fhir-resources/annotated/annotated-observation';
import {Observation} from '../../fhir-resources/observation';
import {OBSERVATION_INTERPRETATION_VALUESET_URL, ObservationInterpretation} from '../../fhir-resources/observation-interpretation-valueset';
import {ChartType} from '../../graphs/graphtypes/graph/graph.component';

import {vitalSign} from './display-grouping';
import {LOINCCode, LOINCCodeGroup} from './loinc-code';
import {ResourceCode} from './resource-code-group';

const REQUEST_ID = '1234';
const EFFECTIVE_DATETIME = '2012-08-04T12:00:00.000Z';
const INTERVAL = Interval.fromDateTimes(
    DateTime.fromISO('2012-08-04T11:00:00.000Z').toUTC(),
    DateTime.fromISO('2012-08-05T11:00:00.000Z').toUTC());

describe('LOINCCodeGroup', () => {
  it('should correctly separate list of Observations into ObservationSets if ' +
         'inner components are present',
     (done: DoneFn) => {
       const observations: Observation[][] = [[
         new Observation(
             {
               code: {
                 text: 'ALT',
                 coding: [{system: LOINCCode.CODING_STRING, code: '1742-6'}]
               },
               valueQuantity: {value: 97},
               effectiveDateTime: EFFECTIVE_DATETIME
             },
             REQUEST_ID),
         new Observation(
             {
               code: {
                 text: 'ALT',
                 coding: [{system: LOINCCode.CODING_STRING, code: '1742-6'}]
               },
               valueQuantity: {value: 98},
               effectiveDateTime: EFFECTIVE_DATETIME
             },
             REQUEST_ID),
         new Observation(
             {
               code: {
                 text: 'ALT',
                 coding: [{system: LOINCCode.CODING_STRING, code: '1742-6'}]
               },
               component: [{
                 code: {
                   coding: [{system: LOINCCode.CODING_STRING, code: '8462-4'}],
                   text: 'Diastolic Blood Pressure'
                 },
                 valueQuantity: {value: 69},
                 effectiveDateTime: EFFECTIVE_DATETIME
               }],
               effectiveDateTime: EFFECTIVE_DATETIME
             },
             REQUEST_ID)
       ]];

       const fhirServiceStub: any = {
         getObservationsForCodeGroup(id: string) {
           return Promise.resolve(observations);
         }
       };

       const loincGroup = new LOINCCodeGroup(
           fhirServiceStub, 'label', [], vitalSign, ChartType.LINE);
       Promise.resolve(loincGroup.getResourceSet(INTERVAL)).then(result => {
         // We should have two ObservationSets; one for the first two
         // Observations corresponding to BP that have values, and one for
         // the inner component of the last Observation.
         expect(result.length).toEqual(2);
         expect(result[0].label).toEqual('ALT');
         expect(result[0].resourceList.length).toEqual(2);
         expect(result[1].label).toEqual('Diastolic Blood Pressure');
         expect(result[1].resourceList.length).toEqual(1);
         done();
       });
     });

  it('should return one observation set for each observation type',
     (done: DoneFn) => {
       const observationsOfDifferentCodes: Observation[][] = [[
         new Observation(
             {
               code: {
                 text: 'ALT',
                 coding: [{system: LOINCCode.CODING_STRING, code: '1742-6'}]
               },
               valueQuantity: {value: 97},
               effectiveDateTime: EFFECTIVE_DATETIME
             },
             REQUEST_ID),
         new Observation(
             {
               code: {
                 text: 'ALT',
                 coding: [{system: LOINCCode.CODING_STRING, code: '1742-6'}]
               },
               valueQuantity: {value: 98},
               effectiveDateTime: EFFECTIVE_DATETIME
             },
             REQUEST_ID),
         new Observation(
             {
               code: {
                 text: 'Bilirubin, Direct',
                 coding: [{system: LOINCCode.CODING_STRING, code: '1968-7'}]
               },
               valueQuantity: {value: 1},
               effectiveDateTime: EFFECTIVE_DATETIME
             },
             REQUEST_ID),
         new Observation(
             {
               code: {
                 text: 'Bilirubin, Direct',
                 coding: [{system: LOINCCode.CODING_STRING, code: '1968-7'}]
               },
               valueQuantity: {value: 2},
               effectiveDateTime: EFFECTIVE_DATETIME
             },
             REQUEST_ID),
         new Observation(
             {
               code: {
                 text: 'Basophil',
                 coding: [{system: LOINCCode.CODING_STRING, code: '706-2'}]
               },
               valueQuantity: {value: 1},
               effectiveDateTime: EFFECTIVE_DATETIME
             },
             REQUEST_ID),
         new Observation(
             {
               code: {
                 text: 'Basophil',
                 coding: [{system: LOINCCode.CODING_STRING, code: '706-2'}]
               },
               valueQuantity: {value: 2},
               effectiveDateTime: EFFECTIVE_DATETIME
             },
             REQUEST_ID)
       ]];

       const fhirServiceStub: any = {
         getObservationsForCodeGroup(id: string) {
           return Promise.resolve(observationsOfDifferentCodes);
         }
       };

       const loincGroup = new LOINCCodeGroup(
           fhirServiceStub, 'label',
           [
             LOINCCode.fromCodeString('1742-6'),
             LOINCCode.fromCodeString('1968-7'),
             LOINCCode.fromCodeString('706-2')
           ],
           vitalSign, ChartType.LINE);
       Promise.resolve(loincGroup.getResourceSet(INTERVAL)).then(result => {
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

  it('should work for qualitative results', (done: DoneFn) => {
    const obs = new Observation(
        {
          code: {
            text: 'Vanc Pk',
            coding: [{system: LOINCCode.CODING_STRING, code: '4090-7'}]
          },
          valueCodeableConcept: {text: 'textresult'},
          effectiveDateTime: EFFECTIVE_DATETIME
        },
        REQUEST_ID);
    const fhirServiceStub: any = {
      getObservationsForCodeGroup(id: string): Promise<Observation[][]> {
        return Promise.resolve([[obs]]);
      }
    };

    const loincGroup = new LOINCCodeGroup(
        fhirServiceStub, 'label',
        [
          ResourceCode.fromCodeString('4090-7'),
        ],
        vitalSign, ChartType.LINE,
        (o: Observation, range: Interval): Promise<AnnotatedObservation> => {
          return Promise.resolve(
              new AnnotatedObservation(o, [['annotation 1', 'annotation a']]));
        });

    loincGroup.getResourceSet(INTERVAL).then(rscSet => {
      expect(rscSet.length).toEqual(1);
      const obsSet = rscSet[0];

      expect(obsSet.resourceList.length).toEqual(1);
      const o = obsSet.resourceList[0];

      expect(o.annotationValues).toEqual([['annotation 1', 'annotation a']]);
      expect(o.observation.result).toBe('textresult');
      done();
    });
  });


  it('should work for interpretation results', (done: DoneFn) => {
    const obs = new Observation(
        {
          code: {
            text: 'Vanc Pk',
            coding: [{system: LOINCCode.CODING_STRING, code: '4090-7'}]
          },
          interpretation: {
            coding:
                [{system: OBSERVATION_INTERPRETATION_VALUESET_URL, code: '<'}]
          },
          effectiveDateTime: EFFECTIVE_DATETIME
        },
        REQUEST_ID);
    const fhirServiceStub: any = {
      getObservationsForCodeGroup(id: string): Promise<Observation[][]> {
        return Promise.resolve([[obs]]);
      }
    };

    const loincGroup = new LOINCCodeGroup(
        fhirServiceStub, 'label',
        [
          ResourceCode.fromCodeString('4090-7'),
        ],
        vitalSign, ChartType.LINE,
        (o: Observation, range: Interval): Promise<AnnotatedObservation> => {
          return Promise.resolve(
              new AnnotatedObservation(o, [['annotation 1', 'annotation a']]));
        });

    loincGroup.getResourceSet(INTERVAL).then(rscSet => {
      expect(rscSet.length).toEqual(1);
      const obsSet = rscSet[0];

      expect(obsSet.resourceList.length).toEqual(1);
      const o = obsSet.resourceList[0];

      expect(o.annotationValues).toEqual([['annotation 1', 'annotation a']]);
      expect(o.observation.interpretation)
          .toEqual(ObservationInterpretation.codeToObject.get('<'));
      done();
    });
  });

  it('should make annotated observation if a function is passed through for that',
     (done: DoneFn) => {
       const obs = new Observation(
           {
             code: {
               text: 'Vanc Pk',
               coding: [{system: LOINCCode.CODING_STRING, code: '4090-7'}]
             },
             valueQuantity: {value: 97},
             effectiveDateTime: EFFECTIVE_DATETIME
           },
           REQUEST_ID);
       const fhirServiceStub: any = {
         getObservationsForCodeGroup(id: string): Promise<Observation[][]> {
           return Promise.resolve([[obs]]);
         }
       };

       const loincGroup = new LOINCCodeGroup(
           fhirServiceStub, 'label',
           [
             ResourceCode.fromCodeString('4090-7'),
           ],
           vitalSign, ChartType.LINE,
           (o: Observation, range: Interval): Promise<AnnotatedObservation> => {
             return Promise.resolve(new AnnotatedObservation(
                 o, [['annotation 1', 'annotation a']]));
           });

       loincGroup.getResourceFromFhir(INTERVAL).then(results => {
         expect(results.length).toEqual(1);
         for (const o of results) {
           expect(o.annotationValues).toEqual([
             ['annotation 1', 'annotation a']
           ]);
         }
         done();
       });
     });
});
/* tslint:enable:object-literal-shorthand*/
