// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

// Disable this check because it's for IE 11 compatibility and we're not worried
// about that in our testing code.
/* tslint:disable:object-literal-shorthand*/

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
             text: 'ALT',
             coding: [{system: LOINCCode.CODING_STRING, code: '1742-6'}]
           },
           valueQuantity: {value: 97},
         }),
         new Observation({
           code: {
             text: 'ALT',
             coding: [{system: LOINCCode.CODING_STRING, code: '1742-6'}]
           },
           valueQuantity: {value: 98},
         }),
         new Observation({
           code: {
             text: 'ALT',
             coding: [{system: LOINCCode.CODING_STRING, code: '1742-6'}]
           },
           component: [{
             code: {
               coding: [{system: LOINCCode.CODING_STRING, code: '1742-6'}],
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
             expect(result[0].label).toEqual('ALT');
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
             text: 'ALT',
             coding: [{system: LOINCCode.CODING_STRING, code: '1742-6'}]
           },
           valueQuantity: {value: 97},
         }),
         new Observation({
           code: {
             text: 'ALT',
             coding: [{system: LOINCCode.CODING_STRING, code: '1742-6'}]
           },
           valueQuantity: {value: 98},
         }),
         new Observation({
           code: {
             text: 'Bilirubin, Direct',
             coding: [{system: LOINCCode.CODING_STRING, code: '1968-7'}]
           },
           valueQuantity: {value: 1},
         }),
         new Observation({
           code: {
             text: 'Bilirubin, Direct',
             coding: [{system: LOINCCode.CODING_STRING, code: '1968-7'}]
           },
           valueQuantity: {value: 2},
         }),
         new Observation({
           code: {
             text: 'Basophil',
             coding: [{system: LOINCCode.CODING_STRING, code: '706-2'}]
           },
           valueQuantity: {value: 1},
         }),
         new Observation({
           code: {
             text: 'Basophil',
             coding: [{system: LOINCCode.CODING_STRING, code: '706-2'}]
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
             LOINCCode.fromCodeString('1742-6'),
             LOINCCode.fromCodeString('1968-7'),
             LOINCCode.fromCodeString('706-2')
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
        vitalSign, ChartType.LINE, [80, 200], true,
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
        vitalSign, ChartType.LINE, [80, 200], true,
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
        [ResourceCode.fromCodeString('4537-7')], vitalSign, ChartType.LINE);
    expect(loincGroup.displayBounds).toEqual([0, 200]);
  });

  it('should not set display bounds if there is more than one code group',
     () => {
       const loincGroup = new LOINCCodeGroup(
           undefined /* FHIR service */, 'label',
           [
             ResourceCode.fromCodeString('4537-7'),  // ESR
             ResourceCode.fromCodeString('8867-4')   // Heart rate
           ],
           vitalSign, ChartType.LINE);
       expect(loincGroup.displayBounds).toBeUndefined();
     });

  it('should set display bounds if there is one explicitly set in constructor',
     () => {
       const loincGroup = new LOINCCodeGroup(
           undefined /* FHIR service */,
           'label',
           [
             ResourceCode.fromCodeString('26464-8'),  // WBC
             ResourceCode.fromCodeString('8310-5')    // Temperature
           ],
           vitalSign,
           ChartType.LINE,
           [80, 200],
           true,
       );
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
           vitalSign, ChartType.LINE, [80, 200], true,
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
/* tslint:enable:object-literal-shorthand*/
