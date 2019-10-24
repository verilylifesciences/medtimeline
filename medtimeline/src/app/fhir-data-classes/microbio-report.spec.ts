// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {BCHMicrobioCode, BCHMicrobioCodeGroup} from '../clinicalconcepts/bch-microbio-code';
import {microbio} from '../clinicalconcepts/display-grouping';
import {LOINCCode} from '../clinicalconcepts/loinc-code';
import {ChartType} from '../graphtypes/graph/graph.component';

import {DiagnosticReportStatus} from './diagnostic-report';
import {MicrobioReport} from './microbio-report';
import {Observation} from './observation';
import {Specimen} from './specimen';

const REQUEST_ID = '1234';

const SAMPLE_MICROBIO_JSON = {
  'resourceType': 'Bundle',
  'id': '0dbc0f3c-2c32-4724-908c-05f145264882',
  'meta': {'lastUpdated': '2019-03-30T15:50:22.685-04:00'},
  'type': 'searchset',
  'total': 7,
  'link': [{'relation': 'self', 'url': 'XXXXXXX'}],
  'entry': [
    {
      'fullUrl': 'https://xxxxx',
      'resource': {
        'resourceType': 'DiagnosticReport',
        'id': '4795107183',
        'contained': [
          {
            'resourceType': 'Specimen',
            'id': '1',
            'type': {'text': 'Incision'},
            'collection': {
              'collectedDateTime': '2019-02-12T21:02:00-05:00',
              'bodySite': {'text': 'Chest'}
            }
          },
          {
            'resourceType': 'Observation',
            'id': '2',
            'code': {
              'coding': [{
                'system': 'http://cerner.com/bch_mapping/',
                'code': 'microbio-report-test-other-1',
                'display': 'microbio-report-test-other-1'
              }]
            },
            'interpretation': {
              'coding': [{
                'system':
                    'http://hl7.org/fhir/ValueSet/observation-interpretation',
                'code': 'CHECKRESULT',
                'display': 'Check Result'
              }]
            }
          }
        ],
        'status': 'final',
        'category': {
          'coding': [{'system': 'http://hl7.org/fhir/v2/0074', 'code': 'MB'}]
        },
        'subject': {'reference': 'Patient/XXXXXXX'},
        'encounter': {'reference': 'Encounter/80367166'},
        'issued': '2019-02-13T11:04:43.000-05:00',
        'specimen': [{'reference': '#1'}],
        'result': [{'reference': '#2'}]
      }
    },
    {
      'fullUrl': 'https://xxxxx',
      'resource': {
        'resourceType': 'DiagnosticReport',
        'id': '4795106415',
        'contained': [
          {
            'resourceType': 'Specimen',
            'id': '1',
            'type': {'text': 'Other Fluid'},
            'collection': {
              'collectedDateTime': '2019-02-12T20:59:00-05:00',
              'bodySite': {'text': 'Shoulder L'}
            }
          },
          {
            'resourceType': 'Observation',
            'id': '2',
            'code': {
              'coding': [{
                'system': 'http://cerner.com/bch_mapping/',
                'code': 'microbio-report-test-other-2',
                'display': 'microbio-report-test-other-2'
              }]
            },
            'interpretation': {
              'coding': [{
                'system':
                    'http://hl7.org/fhir/ValueSet/observation-interpretation',
                'code': 'CHECKRESULT',
                'display': 'Check Result'
              }]
            }
          }
        ],
        'status': 'final',
        'category': {
          'coding': [{'system': 'http://hl7.org/fhir/v2/0074', 'code': 'MB'}]
        },
        'subject': {'reference': 'Patient/XXXXXXX'},
        'encounter': {'reference': 'Encounter/80367166'},
        'issued': '2019-02-13T08:17:42.000-05:00',
        'specimen': [{'reference': '#1'}],
        'result': [{'reference': '#2'}]
      }
    },
    {
      'fullUrl': 'https://xxxxx',
      'resource': {
        'resourceType': 'DiagnosticReport',
        'id': '4795105974',
        'contained': [
          {
            'resourceType': 'Specimen',
            'id': '1',
            'type': {'text': 'Blood'},
            'collection': {'collectedDateTime': '2019-02-11T13:00:00-05:00'}
          },
          {
            'resourceType': 'Observation',
            'id': '2',
            'code': {
              'coding': [{
                'system': 'http://cerner.com/bch_mapping/',
                'code': 'microbio-report-test-blood-1',
                'display': 'microbio-report-test-blood-1'
              }]
            },
            'interpretation': {
              'coding': [{
                'system':
                    'http://hl7.org/fhir/ValueSet/observation-interpretation',
                'code': 'NEGORFLORA',
                'display': 'Neg or Flora'
              }]
            }
          }
        ],
        'status': 'final',
        'category': {
          'coding': [{'system': 'http://hl7.org/fhir/v2/0074', 'code': 'MB'}]
        },
        'subject': {'reference': 'Patient/XXXXXXX'},
        'encounter': {'reference': 'Encounter/80367166'},
        'issued': '2019-02-13T06:38:41.000-05:00',
        'specimen': [{'reference': '#1'}],
        'result': [{'reference': '#2'}]
      }
    }
  ]
};

const specimen = {
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

const otherCodes = [
  new BCHMicrobioCode(
      'microbio-report-test-other-1', microbio, 'microbio-report-test-other-1'),
  new BCHMicrobioCode(
      'microbio-report-test-other-2', microbio, 'microbio-report-test-other-2'),
];

const respiratoryCodes = [new BCHMicrobioCode(
    'microbio-report-test-resp-1', microbio, 'microbio-report-test-resp-1')];

const bloodCodes = [new BCHMicrobioCode(
    'microbio-report-test-blood-1', microbio, 'microbio-report-test-blood-1')]

describe('MicrobioReport', () => {
  const drString = {
    id: 'dr_id',
    status: 'final',
    contained: [specimen, observation1]
  };

  it('should get ID from json if it is present', () => {
    const dr = new MicrobioReport(drString, REQUEST_ID);
    expect(dr.id).toBe('dr_id');
  });

  it('should raise an error if there is no status', () => {
    expect(() => {
      const dr = new MicrobioReport(
          {
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
          },
          REQUEST_ID);
    }).toThrowError(new RegExp(`Request IDs: ${REQUEST_ID}`));
  });

  it('should raise an error if there are multiple specimens', () => {
    expect(() => {
      const dr = new MicrobioReport(
          {id: 'dr_id', contained: [specimen, specimen2, observation1]},
          REQUEST_ID);
    }).toThrowError(new RegExp(`Request IDs: ${REQUEST_ID}`));
  });

  it('should get status from json if it is present', () => {
    const dr = new MicrobioReport(drString, REQUEST_ID);
    expect(dr.status).toBe(DiagnosticReportStatus.Final);
  });

  it('should get contained specimen from json if it is present', () => {
    const dr = new MicrobioReport(drString, REQUEST_ID);
    expect(dr.specimen).toEqual(new Specimen(specimen, REQUEST_ID));
  });

  it('should get contained observations from json if they are present', () => {
    const dr = new MicrobioReport(drString, REQUEST_ID);
    expect(dr.results.length).toBe(1);
    expect(dr.results).toEqual([new Observation(observation1, REQUEST_ID)]);
  });

  it('parseMicrobioData should parse and filter out results', () => {
    let results = MicrobioReport.parseAndFilterMicrobioData(
        SAMPLE_MICROBIO_JSON,
        new BCHMicrobioCodeGroup(
            this.fhirService, 'Other', otherCodes, microbio,
            ChartType.MICROBIO));

    // There are 2 "other" samples in the returned results.
    expect(results.length).toBe(2);

    results = MicrobioReport.parseAndFilterMicrobioData(
        SAMPLE_MICROBIO_JSON,
        new BCHMicrobioCodeGroup(
            this.fhirService, 'Respiratory', respiratoryCodes, microbio,
            ChartType.MICROBIO));

    // There are no respiratory samples in the data.
    expect(results.length).toBe(0);
  });
});
