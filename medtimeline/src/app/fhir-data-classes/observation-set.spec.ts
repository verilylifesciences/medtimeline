// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {HttpClientModule} from '@angular/common/http';
import {async, TestBed} from '@angular/core/testing';
import {DateTime} from 'luxon';

import {LOINCCode} from '../clinicalconcepts/loinc-code';
import {ResourceCodeCreator} from '../conceptmappings/resource-code-creator';
import {ResourceCodeManager} from '../conceptmappings/resource-code-manager';

import {AnnotatedObservation} from './annotated-observation';
import {Observation} from './observation';
import {ObservationSet} from './observation-set';

const REQUEST_ID = '1234';

describe('ObservationSet', () => {
  const observationCodingString = {
    code: {
      coding: [{system: LOINCCode.CODING_STRING, code: '8310-5'}],
      text: 'Temperature'
    }
  };

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientModule],
      providers: [
        {provide: ResourceCodeManager, useClass: ResourceCodeManager},
        {provide: ResourceCodeCreator, useClass: ResourceCodeCreator},
      ]
    });
    Promise.all((TestBed.get(ResourceCodeCreator) as ResourceCodeCreator)
                    .loadConfigurationFromFiles.values());
  }));

  it('should throw error with non-matching labels', () => {
    const observations = [
      new AnnotatedObservation(new Observation(
          {...observationCodingString, valueQuantity: {value: 93}},
          REQUEST_ID)),
      new AnnotatedObservation(new Observation(
          {
            code: {
              coding: [{system: LOINCCode.CODING_STRING, code: '4092-3'}],
              text: 'Vancomycin Level, Trough/Pre'
            },
            valueQuantity: {value: 90}
          },
          REQUEST_ID))
    ];
    const constructor = () => {
      const obsSet = new ObservationSet(observations);
    };
    expect(constructor).toThrowError();
  });

  it('should set normal range with corresponding timestamps', () => {
    const observations = [
      new AnnotatedObservation(new Observation(
          {
            referenceRange: [{low: {value: 10.0}, high: {value: 20.0}}],
            ...observationCodingString,
            valueQuantity: {value: 93},
            effectiveDateTime: DateTime.utc(2016, 1, 14).toISO(),
          },
          REQUEST_ID)),
      new AnnotatedObservation(new Observation(
          {
            referenceRange: [{low: {value: 10.0}, high: {value: 26.0}}],
            ...observationCodingString,
            valueQuantity: {value: 93},
            effectiveDateTime: DateTime.utc(2016, 1, 15).toISO(),
          },
          REQUEST_ID))
    ];
    const obsSet = new ObservationSet(observations);
    expect(obsSet.normalRanges.size).toEqual(2);
    const values = Array.from(obsSet.normalRanges.values());
    expect(values[0]).toEqual([10, 20]);
    expect(values[1]).toEqual([10, 26]);
  });

  it('should get the label text', () => {
    const observations = [
      new AnnotatedObservation(new Observation(
          {...observationCodingString, valueQuantity: {value: 98}},
          REQUEST_ID)),
      new AnnotatedObservation(new Observation(
          {...observationCodingString, valueQuantity: {value: 99}},
          REQUEST_ID)),
    ];
    const obsSet = new ObservationSet(observations);
    expect(obsSet.label).toBe('Temperature');
  });
  it('should set anyQualitative as true if any Observations have qualitative results',
     () => {
       const observations = [
         new AnnotatedObservation(new Observation(
             {...observationCodingString, valueCodeableConcept: {text: 'red'}},
             REQUEST_ID)),
         new AnnotatedObservation(new Observation(
             {
               ...observationCodingString,
               valueQuantity: {value: 101},
             },
             REQUEST_ID))
       ];
       const obsSet = new ObservationSet(observations);
       expect(obsSet.anyQualitative).toBeTruthy();
     });

  it('should set anyQualitative as false if all Observations do not have qualitative results',
     () => {
       const observations = [
         new AnnotatedObservation(new Observation(
             {
               ...observationCodingString,
               valueQuantity: {value: 102},
             },
             REQUEST_ID)),
         new AnnotatedObservation(new Observation(
             {
               ...observationCodingString,
               valueQuantity: {value: 101},
             },
             REQUEST_ID))
       ];
       const obsSet = new ObservationSet(observations);
       expect(obsSet.anyQualitative).toBeFalsy();
     });
});
