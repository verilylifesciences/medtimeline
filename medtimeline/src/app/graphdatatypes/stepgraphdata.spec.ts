// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

// Disable this check because it's for IE 11 compatibility and we're not worried
// about that in our testing code.
/* tslint:disable:object-literal-shorthand*/

import {HttpClient, HttpClientModule} from '@angular/common/http';
import {async, TestBed} from '@angular/core/testing';
import {DomSanitizer} from '@angular/platform-browser';
import {DateTime, Interval} from 'luxon';

import {ResourceCodeCreator} from '../conceptmappings/resource-code-creator';
import {AnnotatedMedicationOrder, MedicationOrderSet} from '../fhir-data-classes/medication-order';
import {makeMedicationAdministration, makeMedicationOrder} from '../test_utils';

import {StepGraphData} from './stepgraphdata';

describe('StepGraphData', () => {
  const dateRangeStart = '2018-09-09T00:00:00.00';
  const dateRangeEnd = '2018-09-18T00:00:00.00';
  const dateRange = Interval.fromDateTimes(
      DateTime.fromISO(dateRangeStart), DateTime.fromISO(dateRangeEnd));
  const admin1Time = '2018-09-10T11:00:00.000Z';
  const admin2Time = '2018-09-12T11:00:00.000Z';
  let medicationAdministrations;


  beforeEach(async(() => {
    TestBed.configureTestingModule({imports: [HttpClientModule]})
        .compileComponents();
    const rcm = new ResourceCodeCreator(TestBed.get(HttpClient));
    Promise.all(rcm.loadConfigurationFromFiles.values());

    medicationAdministrations = [
      makeMedicationAdministration(admin1Time),
      makeMedicationAdministration(admin2Time)
    ];
  }));


  it('StepGraphData.fromMedicationOrderSetList should correctly calculate' +
         ' the data as the end point series',
     () => {
       const earliestMedicationOrder = new AnnotatedMedicationOrder(
           makeMedicationOrder(), medicationAdministrations);
       const medOrderSet = new MedicationOrderSet([earliestMedicationOrder]);

       const data = StepGraphData.fromMedicationOrderSetList(
           [medOrderSet], dateRange, TestBed.get(DomSanitizer));
       const endpointSeries = data.series;
       // The adminSeries holds both the adminSeries and the
       // endpointSeries; it's redundantly stored due to the constraints
       // of inheritance from graphData and all the stuff that's needed
       // to make things like custom legends work.
       expect(endpointSeries.length).toEqual(1);
       // for the administration series
       expect(endpointSeries[0].coordinates.map(c => c[0])).toEqual([
         DateTime.fromISO(admin1Time).toUTC(),
         DateTime.fromISO(admin2Time).toUTC()
       ]);
     });

  it('StepGraphData.fromMedicationOrderSetList should not include units',
     () => {
       const earliestMedicationOrder = new AnnotatedMedicationOrder(
           makeMedicationOrder(), medicationAdministrations);
       const medOrderSet = new MedicationOrderSet([earliestMedicationOrder]);
       const data = StepGraphData.fromMedicationOrderSetList(
           [medOrderSet], dateRange, TestBed.get(DomSanitizer));
       data.series.forEach(series => expect(series.unit).toBeUndefined());
     });
});

/* tslint:enable:object-literal-shorthand*/
