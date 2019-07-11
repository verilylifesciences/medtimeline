// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {async, TestBed} from '@angular/core/testing';
import {DomSanitizer} from '@angular/platform-browser';
import {DateTime} from 'luxon';

import {DiagnosticReport} from '../fhir-data-classes/diagnostic-report';
import {FhirService} from '../fhir.service';
import {Tooltip} from '../graphtypes/tooltips/tooltip';
import {makeDiagnosticReports} from '../test_utils';
import * as Colors from 'src/app/theme/verily_colors';

import {MicrobioGraphData} from './microbiographdata';

const REQUEST_ID = '1234';

describe('MicrobioGraphData', () => {
  let fhirServiceStub: any;

  beforeEach(async(() => {
    TestBed.configureTestingModule(
        {providers: [{provide: FhirService, useValue: fhirServiceStub}]});
    fhirServiceStub = {};
  }));

  it('fromDiagnosticReports should correctly calculate a ' +
         'LabeledSeries for each DiagnosticReport.',
     () => {
       const diagnosticReports = makeDiagnosticReports();
       const stepgraphdata = MicrobioGraphData.fromDiagnosticReports(
           diagnosticReports, TestBed.get(DomSanitizer));
       // All the endpoint series are also in the master series list.
       expect(stepgraphdata.series.length).toEqual(5);
     });

  it('fromDiagnosticReports should correctly calculate ' +
         'time and position for each Diagnostic Report Observation',
     () => {
       const diagnosticReports = makeDiagnosticReports();
       const stepgraphdata = MicrobioGraphData.fromDiagnosticReports(
           diagnosticReports, TestBed.get(DomSanitizer));
       const series1 = stepgraphdata.series[0];
       expect(series1.coordinates[0]).toEqual([
         DateTime.fromISO('2018-08-31T13:48:00.000-04:00'),
         'Ova and Parasite Exam'
       ]);
       const series2 = stepgraphdata.series[1];
       expect(series2.coordinates[0]).toEqual([
         DateTime.fromISO('2018-08-31T13:48:00.000-04:00'),
         'Salmonella and Shigella Culture'
       ]);
     });


  it('fromDiagnosticReports should make tooltip for multiple reports at same timestamp',
     () => {
       const mb1 = {
         contained: [
           {
             collection: {collectedDateTime: '2019-02-14T17:34:43-05:00'},
             id: '1',
             resourceType: 'Specimen',
             type: {text: 'BAL'}
           },
           {
             code: {
               coding: [{
                 code: 'KOHFUNGALSTAIN',
                 display: 'KOH Fungal Stain',
                 system: 'http://cerner.com/bch_mapping/'
               }]
             },
             id: '2',
             interpretation: {
               coding: [{
                 code: 'NEGORFLORA',
                 display: 'Neg or Flora',
                 system:
                     'http://hl7.org/fhir/ValueSet/observation-interpretation'
               }]
             },
             resourceType: 'Observation'
           }
         ],
         id: '4795108019',
         resourceType: 'DiagnosticReport',
         result: [{'reference': '#2'}],
         specimen: [{'reference': '#1'}],
         status: 'final',
       };
       const mb2 = {
         category:
             {coding: [{code: 'MB', system: 'http://hl7.org/fhir/v2/0074'}]},
         contained: [
           {
             collection: {collectedDateTime: '2019-02-14T17:34:43-05:00'},
             id: '1',
             resourceType: 'Specimen',
             type: {text: 'BAL'}
           },
           {
             code: {
               coding: [{
                 code: 'FUNGUSCULTURE',
                 display: 'Fungus Culture',
                 system: 'http://cerner.com/bch_mapping/'
               }]
             },
             id: '2',
             interpretation: {
               coding: [{
                 code: 'NEGORFLORA',
                 display: 'Neg or Flora',
                 system:
                     'http://hl7.org/fhir/ValueSet/observation-interpretation'
               }]
             },
             resourceType: 'Observation'
           }
         ],
         encounter: {reference: 'Encounter/80367178'},
         id: '4795108015',
         issued: '2019-02-14T12:36:30.000-05:00',
         resourceType: 'DiagnosticReport',
         result: [{reference: '#2'}],
         specimen: [{reference: '#1'}],
         status: 'partial',
         subject: {reference: 'Patient/XXXXXXX'}
       };

       const stepgraphdata = MicrobioGraphData.fromDiagnosticReports(
           [
             new DiagnosticReport(mb1, REQUEST_ID),
             new DiagnosticReport(mb2, REQUEST_ID)
           ],
           TestBed.get(DomSanitizer));

       expect(stepgraphdata.tooltipMap.size).toBe(1);
       const mbKey = DateTime.fromISO('2019-02-14T17:34:43-05:00')
                         .toUTC()
                         .toMillis()
                         .toString();
       expect(stepgraphdata.tooltipMap.has(mbKey)).toBeTruthy();
       expect(stepgraphdata.tooltipMap.get(mbKey))
           .toEqual(
               '<table class="c3-tooltip"><tbody><tr><th colspan="2">' +
               Tooltip.formatTimestamp(
                   DateTime.fromISO('2019-02-14T17:34:43-05:00')) +
               '</th></tr>' +
               '<tr><th colspan="2">Result set</th></tr>' +
               '<tr><td class="name"><span style="background-color: ' +
               'rgb(40, 97, 255); ' + Tooltip.TOOLTIP_NORMAL_CSS + '"></span>' +
               '<div style="display: inline-block;">KOH Fungal Stain</div></td>' +
               '<td class="value">Negative or Flora</td></tr>' +
               '<tr><td class="name">Status</td>' +
               '<td class="value">Final</td></tr>' +
               '<tr><td class="name">Specimen</td>' +
               '<td class="value">BAL</td></tr></tbody></table>' +
               '<table class="c3-tooltip"><tbody>' +
               '<tr><th colspan="2">Result set</th></tr>' +
               '<tr><td class="name"><span style="background-color: ' +
               'rgb(195, 132, 25); ' + Tooltip.TOOLTIP_NORMAL_CSS + '"></span>' +
               '<div style="display: inline-block;">Fungus Culture</div></td>' +
               '<td class="value">Negative or Flora</td></tr>' +
               '<tr><td class="name">Status</td>' +
               '<td class="value">Partial</td></tr>' +
               '<tr><td class="name">Specimen</td>' +
               '<td class="value">BAL</td></tr></tbody></table>');
     });

  it('should generate tooltip text correctly when abnormal values exist', () => {
    const mb1 = {
      category:
          {coding: [{code: 'MB', system: 'http://hl7.org/fhir/v2/0074'}]},
      contained: [
        {
          collection: {collectedDateTime: '2019-02-14T17:34:43-05:00'},
          id: '1',
          resourceType: 'Specimen',
          type: {text: 'BAL'}
        },
        {
          code: {
            coding: [{
              code: 'FUNGUSCULTURE',
              display: 'Fungus Culture',
              system: 'http://cerner.com/bch_mapping/'
            }]
          },
          id: '2',
          interpretation: {
            coding: [{
              code: 'CHECKRESULT',
              display: 'Check Result',
              system:
                  'http://hl7.org/fhir/ValueSet/observation-interpretation'
            }]
          },
          resourceType: 'Observation'
        }
      ],
      encounter: {reference: 'Encounter/80367178'},
      id: '4795108015',
      issued: '2019-02-14T12:36:30.000-05:00',
      resourceType: 'DiagnosticReport',
      result: [{reference: '#2'}],
      specimen: [{reference: '#1'}],
      status: 'partial',
      subject: {reference: 'Patient/XXXXXXX'}
    };
    const diagnosticReports = [new DiagnosticReport(mb1, REQUEST_ID)];
    const stepgraphdata = MicrobioGraphData.fromDiagnosticReports(
        diagnosticReports, TestBed.get(DomSanitizer));
    const mbKey = DateTime.fromISO('2019-02-14T17:34:43-05:00')
        .toUTC().toMillis().toString();
    expect(stepgraphdata.tooltipMap.has(mbKey)).toBeTruthy();
    expect(stepgraphdata.tooltipMap.get(mbKey)).toEqual(
          '<table class="c3-tooltip"><tbody>' +
          '<tr><th colspan="2">' +
          Tooltip.formatTimestamp(DateTime.fromISO('2019-02-14T17:34:43-05:00')) +
          '</th></tr>' +
          '<tr><th colspan="2">Result set</th></tr>' +
          '<tr><td class="name" style="color: ' + Colors.ABNORMAL + '">' +
          '<span style="' + Tooltip.TOOLTIP_ABNORMAL_CSS + 'rgb(195, 132, 25)">' +
          '</span><div style="display: inline-block;">Fungus Culture</div></td>' +
          '<td class="value" style="color: ' + Colors.ABNORMAL + '">Check result</td></tr>' +
          '<tr><td class="name">Status</td><td class="value">Partial</td></tr>' +
          '<tr><td class="name">Specimen</td><td class="value">BAL</td></tr></tbody></table>');

  });
});
