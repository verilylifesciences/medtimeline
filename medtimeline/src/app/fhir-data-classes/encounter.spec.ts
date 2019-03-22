// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {DateTime, Interval} from 'luxon';

import {Encounter} from './encounter';

describe('Encounter', () => {
  it('should throw error if json is not of type Encounter', () => {
    const constructor = () => {
      const x = new Encounter({});
    };
    expect(constructor).toThrowError();
  });

  it('should get label from json', () => {
    const testEncounter = {
      class: 'inpatient',
      id: '4027918',
      patient: {display: 'Smart, Joe', reference: 'Patient/4342010'},
      period:
          {start: '2018-10-01T06:00:00.000Z', end: '2018-10-10T06:00:00.000Z'},
      resourceType: 'Encounter',
    };

    const encounter = new Encounter(testEncounter);
    expect(encounter.encounterId).toEqual('4027918');
  });

  it('should get start and end date from json if they are there', () => {
    const testEncounter = {
      class: 'inpatient',
      id: '4027918',
      patient: {display: 'Smart, Joe', reference: 'Patient/4342010'},
      period:
          {start: '2018-10-01T06:00:00.000Z', end: '2018-10-10T06:00:00.000Z'},
      'resourceType': 'Encounter',
    };

    const encounter = new Encounter(testEncounter);
    expect(encounter.period)
        .toEqual(Interval.fromDateTimes(
            DateTime.fromISO('2018-10-01T06:00:00.000Z').toLocal(),
            DateTime.fromISO('2018-10-10T06:00:00.000Z').toLocal()));
  });

  it('should set end date to now if it isn\'t there', () => {
    const testEncounter = {
      class: 'inpatient',
      id: '4027918',
      patient: {display: 'Smart, Joe', reference: 'Patient/4342010'},
      period: {
        start: '2018-10-01T06:00:00.000Z',
      },
      resourceType: 'Encounter',
    };

    const encounter = new Encounter(testEncounter);
    expect(encounter.period.start)
        .toEqual(DateTime.fromISO('2018-10-01T06:00:00.000Z').toLocal());
    expect(encounter.period.end.toMillis())
        // accept differences up to 100ms
        .toBeCloseTo(DateTime.utc().toMillis(), -3);
  });

  it('should set end date to now if it is in the future', () => {
    const testEncounter = {
      class: 'inpatient',
      id: '4027918',
      patient: {display: 'Smart, Joe', reference: 'Patient/4342010'},
      period: {
        start: '2018-10-01T06:00:00.000Z',
        end: '2200-10-01T06:00:00.000Z',
      },
      resourceType: 'Encounter',
    };

    const encounter = new Encounter(testEncounter);
    expect(encounter.period.start)
        .toEqual(DateTime.fromISO('2018-10-01T06:00:00.000Z').toLocal());
    expect(encounter.period.end.toMillis())
        // accept differences up to 100ms
        .toBeCloseTo(DateTime.utc().toMillis(), -3);
  });

  it('should require a start date', () => {
    const testEncounter = {
      class: 'inpatient',
      id: '4027918',
      patient: {display: 'Smart, Joe', reference: 'Patient/4342010'},
      period: {
        end: '2018-10-01T06:00:00.000Z',
      },
      resourceType: 'Encounter',
    };

    const constructor = () => {
      const encounter = new Encounter(testEncounter);
    };
    expect(constructor).toThrowError();
  });

  it('should throw an error if start time is after end time', () => {
    const testEncounter = {
      class: 'inpatient',
      id: '4027918',
      patient: {display: 'Smart, Joe', reference: 'Patient/4342010'},
      period: {
        start: '2018-09-01T06:00:00.000Z',
        end: '2018-10-01T06:00:00.000Z',
      },
      resourceType: 'Encounter',
    };

    const constructor = () => {
      const encounter = new Encounter(testEncounter);
    };
    expect(constructor).toThrowError();
  });

  it('should throw an error if start time is in the future', () => {
    const testEncounter = {
      class: 'inpatient',
      id: '4027918',
      patient: {display: 'Smart, Joe', reference: 'Patient/4342010'},
      period: {
        start: '2200-09-01T06:00:00.000Z',
        end: '2018-10-01T06:00:00.000Z',
      },
      resourceType: 'Encounter',
    };

    const constructor = () => {
      const encounter = new Encounter(testEncounter);
    };
    expect(constructor).toThrowError();
  });
});
