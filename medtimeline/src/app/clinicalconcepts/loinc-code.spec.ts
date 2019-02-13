// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {Interval} from 'luxon';

import {AnnotatedObservation} from '../fhir-data-classes/annotated-observation';
import {Observation} from '../fhir-data-classes/observation';
import {OBSERVATION_INTERPRETATION_VALUESET_URL, ObservationInterpretation} from '../fhir-data-classes/observation-interpretation-valueset';
import {ChartType} from '../graphtypes/graph/graph.component';

import {vitalSign} from './display-grouping';
import {LOINCCode, LOINCCodeGroup} from './loinc-code';
import {ResourceCode} from './resource-code-group';

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
           return Promise.resolve(observations);
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
           return Promise.resolve(observationsOfDifferentCodes);
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

  it('should work for qualitative results', (done: DoneFn) => {
    const obs = new Observation({
      code: {
        text: 'Vanc Pk',
        coding: [{system: LOINCCode.CODING_STRING, code: '4090-7'}]
      },
      valueCodeableConcept: {text: 'textresult'}
    });
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
        vitalSign, ChartType.LINE, true, [80, 200],
        (o: Observation, range: Interval): Promise<AnnotatedObservation> => {
          return Promise.resolve(
              new AnnotatedObservation(o, [['annotation 1', 'annotation a']]));
        });

    loincGroup.getResourceFromFhir(undefined).then(rscSet => {
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
    const obs = new Observation({
      code: {
        text: 'Vanc Pk',
        coding: [{system: LOINCCode.CODING_STRING, code: '4090-7'}]
      },
      interpretation: {
        coding: [{system: OBSERVATION_INTERPRETATION_VALUESET_URL, code: '<'}]
      }
    });
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
        vitalSign, ChartType.LINE, true, [80, 200],
        (o: Observation, range: Interval): Promise<AnnotatedObservation> => {
          return Promise.resolve(
              new AnnotatedObservation(o, [['annotation 1', 'annotation a']]));
        });

    loincGroup.getResourceFromFhir(undefined).then(rscSet => {
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

  it('should set display bounds if there is just one code group', () => {
    const loincGroup = new LOINCCodeGroup(
        undefined /* FHIR service */, 'label',
        /* ESR's bounds are 0-200 */
        [ResourceCode.fromCodeString('30341-2')], vitalSign, ChartType.LINE);
    expect(loincGroup.displayBounds).toEqual([0, 200]);
  });

  it('should not set display bounds if there is more than one code group',
     () => {
       const loincGroup = new LOINCCodeGroup(
           undefined /* FHIR service */, 'label',
           [
             ResourceCode.fromCodeString('30341-2'),
             ResourceCode.fromCodeString('3094-0')
           ],
           vitalSign, ChartType.LINE);
       expect(loincGroup.displayBounds).toBeUndefined();
     });

  it('should set display bounds if there is one explicitly set in constructor',
     () => {
       const loincGroup = new LOINCCodeGroup(
           undefined /* FHIR service */, 'label',
           [
             ResourceCode.fromCodeString('30341-2'),
             ResourceCode.fromCodeString('3094-0')
           ],
           vitalSign, ChartType.LINE, true, [80, 200]);
       expect(loincGroup.displayBounds).toEqual([80, 200]);
     });

  it('should make annotated observation if a function is passed through for that',
     (done: DoneFn) => {
       const obs = new Observation({
         code: {
           text: 'Vanc Pk',
           coding: [{system: LOINCCode.CODING_STRING, code: '4090-7'}]
         },
         valueQuantity: {value: 97},
       });
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
           vitalSign, ChartType.LINE, true, [80, 200],
           (o: Observation, range: Interval): Promise<AnnotatedObservation> => {
             return Promise.resolve(new AnnotatedObservation(
                 o, [['annotation 1', 'annotation a']]));
           });

       loincGroup.getResourceFromFhir(undefined).then(rscSet => {
         expect(rscSet.length).toEqual(1);
         for (const obsSet of rscSet) {
           expect(obsSet.resourceList.length).toEqual(1);
           for (const o of obsSet.resourceList) {
             expect(o.annotationValues).toEqual([
               ['annotation 1', 'annotation a']
             ]);
           }
         }
         done();
       });
     });
});
