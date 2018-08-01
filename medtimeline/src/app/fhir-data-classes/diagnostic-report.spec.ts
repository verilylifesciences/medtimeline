// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {LOINCCode} from '../clinicalconcepts/loinc-code';
import {DiagnosticReport, DiagnosticReportStatus} from './diagnostic-report';
import {Observation} from './observation';
import {Specimen} from './specimen';

const specimen1 = {
  resourceType: 'Specimen',
  id: 'specimen_id',
  type: {text: 'specimen_source_type'},
  collection: {
    collectedPeriod:
        {start: '2018-08-31T13:48:00-04:00', end: '2018-09-21T13:48:00-04:00'}
  }
};

const specimen2 = {
  resourceType: 'Specimen',
  id: 'specimen_id2',
  type: {text: 'specimen_source_type2'},
  collection: {
    collectedPeriod:
        {start: '1965-03-22T13:48:00-04:00', end: '1965-03-25T13:48:00-04:00'}
  }
};

const observation1 = {
  resourceType: 'Observation',
  code: {
    coding: [{system: LOINCCode.CODING_STRING, code: '8310-5'}],
    text: 'Temperature'
  },
  valueQuantity: {value: 103}
};

describe('DiagnosticReport', () => {
  const drString = {
    id: 'dr_id',
    status: 'final',
    contained: [specimen1, specimen2, observation1]
  };

  it('should get ID from json if it is present', () => {
    const dr = new DiagnosticReport(drString);
    expect(dr.id).toBe('dr_id');
  });

  it('should raise an error if there is no status', () => {
    expect(() => {
      const dr = new DiagnosticReport({
        id: 'dr_id',
        contained: [{
          resourceType: 'Specimen',
          id: 'specimen_id',
          type: {text: 'specimen_source_type'},
          collection: {
            collectedPeriod: {
              start: '2018-08-31T13:48:00-04:00',
              end: '2018-09-21T13:48:00-04:00'
            }
          }
        }]
      });
    }).toThrowError();
  });

  it('should get status from json if it is present', () => {
    const dr = new DiagnosticReport(drString);
    expect(dr.status).toBe(DiagnosticReportStatus.Final);
  });

  it('should get contained specimens from json if they are present', () => {
    const dr = new DiagnosticReport(drString);
    expect(dr.specimens.length).toBe(2);
    expect(dr.specimens).toEqual([
      new Specimen(specimen1), new Specimen(specimen2)
    ]);
  });

  it('should get contained observations from json if they are present', () => {
    const dr = new DiagnosticReport(drString);
    expect(dr.results.length).toBe(1);
    expect(dr.results).toEqual([new Observation(observation1)]);
  });
});
