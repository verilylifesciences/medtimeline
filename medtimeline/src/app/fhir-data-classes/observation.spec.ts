// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {DateTime} from 'luxon';
import {LOINCCode} from '../clinicalconcepts/loinc-code';

import {Observation} from './observation';
import {OBSERVATION_INTERPRETATION_VALUESET_URL} from './observation-interpretation-valueset';

describe('Observation', () => {
  const observationCodingString = {
    code: {
      coding: [{system: LOINCCode.CODING_STRING, code: '8310-5'}],
      text: 'Temperature'
    }
  };

  const codingString = {
    code: {
      coding: [
        {system: 'not loinc', code: '2744-1'},
        {system: LOINCCode.CODING_STRING, code: '8310-5'}
      ],
      text: 'Temperature'
    },
  };

  const interpretationString = {
    interpretation: {
      coding: [{
        system: OBSERVATION_INTERPRETATION_VALUESET_URL,
        code: 'NEGORFLORA',
        display:
            'This doesn\'t matter because it gets looked up in the valueset'
      }]
    }
  };

  it('should get loinc code from json', () => {
    const observation =
        new Observation({...codingString, valueQuantity: {value: 103}});
    expect(observation.codes).toBeDefined();
    expect(observation.codes.length).toEqual(1);
    expect(observation.codes[0]).toBe(LOINCCode.fromCodeString('8310-5'));
  });

  it('should get timestamp from effectiveDateTime', () => {
    const timestampString = '2012-08-04T11:00:00.000Z';
    const observation = new Observation({
      effectiveDateTime: timestampString,
      ...observationCodingString,
      valueQuantity: {value: 103},
    });
    expect(observation.timestamp).toBeDefined();
    expect(observation.timestamp)
        .toEqual(DateTime.fromISO(timestampString).toUTC());
  });

  it('should get timestamp from issued if effectiveDateTime absent', () => {
    const timestampString = '2012-08-05T11:00:00.000Z';
    const observation = new Observation({
      issued: timestampString,
      ...observationCodingString,
      valueQuantity: {value: 96},
    });
    expect(observation.timestamp).toBeDefined();
    expect(observation.timestamp)
        .toEqual(DateTime.fromISO(timestampString).toUTC());
  });

  it('should prefer effectiveDateTime over issued time', () => {
    const effectiveTimeString = '1957-01-14T11:00:00.000Z';
    const issuedTimeString = '2012-08-05T11:00:00.000Z';
    const observation = new Observation({
      effectiveDateTime: effectiveTimeString,
      issued: issuedTimeString,
      ...observationCodingString,
      valueQuantity: {value: 105},
    });
    expect(observation.timestamp).toBeDefined();
    expect(observation.timestamp)
        .toEqual(DateTime.fromISO(effectiveTimeString).toUTC());
  });

  it('should get value from json', () => {
    const observation = new Observation(
        {'valueQuantity': {'value': 101}, ...observationCodingString});
    expect(observation.value).toBeDefined();
    expect(observation.value.value).toEqual(101);
  });


  it('should set precision from json', () => {
    const observation = new Observation(
        {'valueQuantity': {'value': 101.54}, ...observationCodingString});
    expect(observation.precision).toBeDefined();
    expect(observation.precision).toEqual(2);
  });

  it('should set normal range from JSON', () => {
    const observation = new Observation({
      referenceRange: [{low: {value: 10.0}, high: {value: 20.0}}],
      ...observationCodingString,
      valueQuantity: {value: 103},
    });
    expect(observation.normalRange).toBeDefined();
    expect(observation.normalRange[0]).toEqual(10);
    expect(observation.normalRange[1]).toEqual(20);
  });


  it('should not set normal range from JSON unless high and low provided',
     () => {
       const observation = new Observation({
         referenceRange: [{text: '< 20', high: {value: 20.0}}],
         ...observationCodingString,
         valueQuantity: {value: 100},
       });
       expect(observation.normalRange).toBeUndefined();
     });

  it('should get label from json', () => {
    const observation = new Observation(
        {...observationCodingString, valueQuantity: {value: 97}});
    expect(observation.label).toBeDefined();
    expect(observation.label).toEqual('Temperature');
  });


  /*
  TODO(b/119673528): Work out which labels we're going to use for BCH, then
  re-enable.
  it('should raise error if LOINC label does not match observation label',
     () => {
       const constructor = () => {
         const observation = new Observation({
           code: {
             coding: [{system: LOINCCode.CODING_STRING, code: '8310-5'}],
             text: 'Not the temperature label'
           }
         });
       };
       expect(constructor).toThrowError();
     });
  */

  it('should get the result from json', () => {
    const observation = new Observation(
        {...observationCodingString, valueCodeableConcept: {text: 'red'}});
    expect(observation.result).toBeDefined();
    expect(observation.result).toEqual('red');
  });

  it('should get interpretation code from json', () => {
    const observation = new Observation({
      ...codingString,
      valueQuantity: {value: 103},
      ...interpretationString
    });
    expect(observation.interpretation).toBeDefined();
    expect(observation.interpretation.code).toEqual('NEGORFLORA');
    expect(observation.interpretation.display).toBe('Negative or Flora');
  });

  it('should set inner components from json', () => {
    const observation = new Observation({
      ...observationCodingString,
      component: [{...observationCodingString, valueQuantity: {value: 100}}]
    });
    expect(observation.innerComponents.length).toEqual(1);
  });
});
