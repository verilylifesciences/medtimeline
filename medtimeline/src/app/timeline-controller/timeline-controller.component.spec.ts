// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {DebugElement} from '@angular/core';
import {async, ComponentFixture, TestBed} from '@angular/core/testing';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {MatDatepickerModule, MatFormFieldModule, MatIconModule, MatInput, MatInputModule, MatNativeDateModule} from '@angular/material';
import {By} from '@angular/platform-browser';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {Interval} from 'luxon';
import * as moment from 'moment';
import {NgxDaterangepickerMd} from 'ngx-daterangepicker-material';
import {APP_TIMESPAN} from 'src/constants';

import {Encounter} from '../fhir-data-classes/encounter';
import {FhirService} from '../fhir.service';
import {StubFhirService} from '../test_utils';

import {TimelineControllerComponent} from './timeline-controller.component';

// TODO(b/121206822): better coverage for various encounter scenarios
describe('TimelineControllerComponent with encounters', () => {
  let component: TimelineControllerComponent;
  let fixture: ComponentFixture<TimelineControllerComponent>;

  class StubFhirServiceWithEncounters extends StubFhirService {
    getEncountersForPatient(dateRange: Interval) {
      return Promise.resolve([
        new Encounter({
          identifier: 'encounter1',
          period: {
            start: '1988-03-23T00:11:00.000Z',
            end: '1988-03-28T00:23:00.000Z'
          }
        }),
        new Encounter({
          identifier: 'encounter2',
          period: {
            start: '1987-05-13T00:00:00.000Z',
            end: '1987-05-20T00:00:00.000Z'
          }
        })
      ]);
    }
  }

  beforeEach(async(() => {
    TestBed
        .configureTestingModule({
          imports: [
            MatDatepickerModule, MatNativeDateModule, MatInputModule,
            ReactiveFormsModule, NoopAnimationsModule, MatFormFieldModule,
            FormsModule, MatIconModule, NgxDaterangepickerMd.forRoot()
          ],
          declarations: [TimelineControllerComponent],
          providers: [{
            provide: FhirService,
            useValue: new StubFhirServiceWithEncounters()
          }]
        })
        .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TimelineControllerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should not allow calendar to go back before date range covered by encounters',
     (done: DoneFn) => {
       fixture.whenStable().then(x => {
         expect(component.earliestAvailableDate.toISOString())
             .toBe('1987-05-13T00:00:00.000Z');
         done();
       });
     });
  it('should not allow calendar to advance after current date',
     (done: DoneFn) => {
       fixture.whenStable().then(x => {
         expect(component.latestAvailableDate.toISOString())
             .toEqual(APP_TIMESPAN.end.toISO());

         const calendars: DebugElement[] =
             fixture.debugElement.queryAll(By.directive(MatInput));

         for (const cal of calendars) {
           expect(cal.nativeElement.max)
               .toBe(component.latestAvailableDate.toISOString().split('T')[0]);
         }
         done();
       });
     });
  it('should exclude dates not covered by an encounter', (done: DoneFn) => {
    fixture.whenStable().then(x => {
      component.daysCoveredByAnEncounter =
          new Set<string>(['2012-08-04', '2012-08-05', '2012-08-08']);

      expect(component.filterDates(moment.utc(new Date(2012, 7, 5))))
          .toBe(false);
      expect(component.filterDates(moment.utc(new Date(2012, 7, 6))))
          .toBe(true);
      done();
    });
  });
});

describe('TimelineControllerComponent without encounters', () => {
  let component: TimelineControllerComponent;
  let fixture: ComponentFixture<TimelineControllerComponent>;

  beforeEach(async(() => {
    TestBed
        .configureTestingModule({
          imports: [
            MatDatepickerModule, MatNativeDateModule, MatInputModule,
            ReactiveFormsModule, NoopAnimationsModule, MatFormFieldModule,
            FormsModule, MatIconModule, NgxDaterangepickerMd.forRoot()
          ],
          declarations: [TimelineControllerComponent],
          providers: [{provide: FhirService, useValue: new StubFhirService()}]
        })
        .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TimelineControllerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });
  it('should not allow calendar to go back before app timespan',
     (done: DoneFn) => {
       fixture.whenStable().then(x => {
         // The stub FHIR service doesn't return any encounters, so it should
         // default to the app timerange.
         expect(component.earliestAvailableDate.toISOString())
             .toEqual(APP_TIMESPAN.start.toISO());
         done();
       });
     });
});
