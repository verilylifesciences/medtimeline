// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {LOINCCode} from '../clinicalconcepts/loinc-code';

import {AnnotatedObservation} from './annotated-observation';
import {Observation} from './observation';
import {ObservationSet} from './observation-set';

describe('ObservationSet', () => {
  const observationCodingString = {
    code: {
      coding: [{system: LOINCCode.CODING_STRING, code: '8310-5'}],
      text: 'Temperature'
    }
  };

  it('should throw error with non-matching labels', () => {
    const observations = [
      new AnnotatedObservation(new Observation(
          {...observationCodingString, valueQuantity: {value: 93}})),
      new AnnotatedObservation(new Observation({
        code: {
          coding: [{system: LOINCCode.CODING_STRING, code: '4092-3'}],
          text: 'Vanc Tr'
        },
        valueQuantity: {value: 90}
      }))
    ];
    const constructor = () => {
      const obsSet = new ObservationSet(observations);
    };
    expect(constructor).toThrowError();
  });

  it('should not set normal range with nonmatching ranges', () => {
    const observations = [
      new AnnotatedObservation(new Observation({
        referenceRange: [{low: {value: 0.0}, high: {value: 30.0}}],
        ...observationCodingString,
        valueQuantity: {value: 94},
      })),
      new AnnotatedObservation(new Observation({
        referenceRange: [{low: {value: 10.0}, high: {value: 20.0}}],
        ...observationCodingString,
        valueQuantity: {value: 92}
      }))
    ];
    const obsSet = new ObservationSet(observations);
    expect(obsSet.normalRange).toBeUndefined();
  });

  it('should set normal range with matching ranges', () => {
    const observations = [
      new AnnotatedObservation(new Observation(
          {
            referenceRange: [{low: {value: 10.0}, high: {value: 20.0}}],
            ...observationCodingString,
            valueQuantity: {value: 93},
          },
          )),
      new AnnotatedObservation(new Observation({
        referenceRange: [{low: {value: 10.0}, high: {value: 20.0}}],
        ...observationCodingString,
        valueQuantity: {value: 93}
      }))
    ];
    const obsSet = new ObservationSet(observations);
    expect(obsSet.normalRange).toEqual([10, 20]);
  });

  it('should get the label text', () => {
    const observations = [
      new AnnotatedObservation(new Observation(
          {...observationCodingString, valueQuantity: {value: 98}})),
      new AnnotatedObservation(new Observation(
          {...observationCodingString, valueQuantity: {value: 99}})),
    ];
    const obsSet = new ObservationSet(observations);
    expect(obsSet.label).toBe('Temperature');
  });
  it('should set anyQualitative as true if any Observations have qualitative results',
     () => {
       const observations = [
         new AnnotatedObservation(new Observation({
           ...observationCodingString,
           valueCodeableConcept: {text: 'red'}
         })),
         new AnnotatedObservation(new Observation({
           ...observationCodingString,
           valueQuantity: {value: 101},
         }))
       ];
       const obsSet = new ObservationSet(observations);
       expect(obsSet.anyQualitative).toBeTruthy();
     });

  it('should set anyQualitative as false if all Observations do not have qualitative results',
     () => {
       const observations = [
         new AnnotatedObservation(new Observation({
           ...observationCodingString,
           valueQuantity: {value: 102},
         })),
         new AnnotatedObservation(new Observation({
           ...observationCodingString,
           valueQuantity: {value: 101},
         }))
       ];
       const obsSet = new ObservationSet(observations);
       expect(obsSet.anyQualitative).toBeFalsy();
     });
});
