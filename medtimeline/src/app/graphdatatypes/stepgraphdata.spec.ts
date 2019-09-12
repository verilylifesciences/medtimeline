// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

// Disable this check because it's for IE 11 compatibility and we're not worried
// about that in our testing code.
/* tslint:disable:object-literal-shorthand*/

import {async, TestBed} from '@angular/core/testing';
import {DomSanitizer} from '@angular/platform-browser';
import {DateTime, Interval} from 'luxon';
import {of} from 'rxjs';

import {RxNormCode} from '../clinicalconcepts/rx-norm';
import {MedicationOrderSet} from '../fhir-data-classes/medication-order';
import {FhirService} from '../fhir.service';
import {makeMedicationAdministration, makeMedicationOrder} from '../test_utils';

import {StepGraphData} from './stepgraphdata';

describe('StepGraphData', () => {
  let fhirServiceStub: any;
  const dateRangeStart = '2018-09-09T00:00:00.00';
  const dateRangeEnd = '2018-09-18T00:00:00.00';
  const dateRange = Interval.fromDateTimes(
      DateTime.fromISO(dateRangeStart), DateTime.fromISO(dateRangeEnd));
  const admin1Time = '2018-09-10T11:00:00.000Z';
  const admin2Time = '2018-09-12T11:00:00.000Z';
  const medicationAdministrations = [
    makeMedicationAdministration(admin1Time),
    makeMedicationAdministration(admin2Time)
  ];

  beforeEach(async(() => {
    TestBed.configureTestingModule(
        {providers: [{provide: FhirService, useValue: fhirServiceStub}]});
    fhirServiceStub = {
      getMedicationAdministrationsWithOrder(id: string, code: RxNormCode) {
        return of(medicationAdministrations).toPromise();
      }
    };
  }));

  it('StepGraphData.fromMedicationOrderSetList should correctly calculate' +
         ' the data as the end point series',
     (done: DoneFn) => {
       const earliestMedicationOrder = makeMedicationOrder();
       earliestMedicationOrder.setMedicationAdministrations(fhirServiceStub);
       Promise
           .resolve(earliestMedicationOrder.setMedicationAdministrations(
               fhirServiceStub))
           .then(result => {
             const medOrderSet =
                 new MedicationOrderSet([earliestMedicationOrder]);

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
             done();
           });
     });

  it('StepGraphData.fromMedicationOrderSetList should not include units',
     () => {
       const earliestMedicationOrder = makeMedicationOrder();
       earliestMedicationOrder.setMedicationAdministrations(fhirServiceStub);
       Promise
           .resolve(earliestMedicationOrder.setMedicationAdministrations(
               fhirServiceStub))
           .then(result => {
             const medOrderSet =
                 new MedicationOrderSet([earliestMedicationOrder]);
             const data = StepGraphData.fromMedicationOrderSetList(
                 [medOrderSet], dateRange, TestBed.get(DomSanitizer));

             data.series.forEach(series => expect(series.unit).toBeUndefined());
           });
     });
});

/* tslint:enable:object-literal-shorthand*/
