// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

// Disable this check because it's for IE 11 compatibility and we're not worried
// about that in our testing code.
/* tslint:disable:object-literal-shorthand*/

import {async, ComponentFixture, TestBed} from '@angular/core/testing';
import {DomSanitizer} from '@angular/platform-browser';
import {DateTime, Interval} from 'luxon';
import {ChartsModule} from 'ng2-charts';

import {MedicationOrderSet} from '../../fhir-data-classes/medication-order';
import {StepGraphData} from '../../graphdatatypes/stepgraphdata';
import {makeMedicationAdministration, makeMedicationOrder} from '../../test_utils';

import {StepGraphComponent} from './stepgraph.component';

// TODO(b/116157058): Add more test coverage for StepGraphCardComponent.
describe('StepGraphComponent', () => {
  let component: StepGraphComponent;
  let fixture: ComponentFixture<StepGraphComponent>;
  let fhirServiceStub: any;

  const dateRange = Interval.fromDateTimes(
      DateTime.fromISO('2018-09-11T00:00:00.00'),
      DateTime.fromISO('2018-09-18T00:00:00.00'));

  beforeEach(async(() => {
    TestBed
        .configureTestingModule(
            {declarations: [StepGraphComponent], imports: [ChartsModule]})
        .compileComponents();
    fhirServiceStub = {
      getMedicationAdministrationsWithOrder(id: string) {
        const medicationAdministrations = [
          makeMedicationAdministration('2018-09-10T11:00:00.000Z'),
          makeMedicationAdministration('2018-09-12T11:00:00.000Z')
        ];
        return Promise.resolve(medicationAdministrations);
      }
    };
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(StepGraphComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should calculate endpoints correctly', (done: DoneFn) => {
    const earliestMedicationOrder = makeMedicationOrder();
    const latestMedicationOrder = makeMedicationOrder();

    earliestMedicationOrder.setMedicationAdministrations(fhirServiceStub)
        .then(() => {
          return earliestMedicationOrder.setMedicationAdministrations(
              fhirServiceStub);
        })
        .then(() => {
          const fhirServiceStubAdjustedDates: any = {
            getMedicationAdministrationsWithOrder(id: string) {
              const medicationAdministrations = [
                makeMedicationAdministration('2018-09-14T11:00:00.000Z'),
                makeMedicationAdministration('2018-09-30T11:00:00.000Z')
              ];
              return Promise.resolve(medicationAdministrations);
            }
          };
          return latestMedicationOrder.setMedicationAdministrations(
              fhirServiceStubAdjustedDates);
        })
        .then(result => {
          const medOrderSet = new MedicationOrderSet(
              [earliestMedicationOrder, latestMedicationOrder]);
          component.data = StepGraphData.fromMedicationOrderSetList(
              [medOrderSet], dateRange, TestBed.get(DomSanitizer));
          component.dateRange = dateRange;
          component.generateChart();
          // The date range requested is 9/11 to 9/18, while the orders are from
          // 9/10 to 9/12 and 9/14 to 9/30. So the only endpoints that we want
          // visible on the chart are 9/12 and 9/14, since they are in the time
          // range.
          // We should get two endpoints series--one for each order.
          expect(component.chartData.length).toEqual(1);
          // The first one should contain the first order's final endpoint.
          expect(component.chartData[0].data).toEqual([
            {x: '2018-09-12T11:00:00.000Z', y: 'vancomycin'},
            {x: '2018-09-14T11:00:00.000Z', y: 'vancomycin'}
          ]);
          done();
        });
  });
});

/* tslint:enable:object-literal-shorthand*/
