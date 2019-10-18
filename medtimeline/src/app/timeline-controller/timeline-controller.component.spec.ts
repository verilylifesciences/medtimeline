// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {DebugElement} from '@angular/core';
import {async, ComponentFixture, TestBed} from '@angular/core/testing';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
// tslint:disable-next-line:max-line-length
import {MatDatepickerModule, MatFormFieldModule, MatIconModule, MatInput, MatInputModule, MatNativeDateModule, MatTooltipModule} from '@angular/material';
import {By} from '@angular/platform-browser';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import * as moment from 'moment';
import {NgxDaterangepickerMd} from 'ngx-daterangepicker-material';
import {APP_TIMESPAN, UI_CONSTANTS, UI_CONSTANTS_TOKEN} from 'src/constants';

import {Encounter} from '../fhir-data-classes/encounter';
import {FhirService} from '../fhir.service';
import {StubFhirService} from '../test_utils';

import {TimelineControllerComponent} from './timeline-controller.component';

const REQUEST_ID = '1234';

const encounters = [
  new Encounter(
      {
        identifier: 'encounter1',
        period:
            {start: '1988-03-23T00:11:00.000Z', end: '1988-03-28T00:23:00.000Z'}
      },
      REQUEST_ID),
  new Encounter(
      {
        identifier: 'encounter2',
        period:
            {start: '1987-05-13T00:00:00.000Z', end: '1987-05-20T00:00:00.000Z'}
      },
      REQUEST_ID)
];

describe('TimelineControllerComponent with encounters', () => {
  let component: TimelineControllerComponent;
  let fixture: ComponentFixture<TimelineControllerComponent>;

  beforeEach(async(() => {
    TestBed
        .configureTestingModule({
          imports: [
            MatDatepickerModule, MatNativeDateModule, MatInputModule,
            ReactiveFormsModule, NoopAnimationsModule, MatFormFieldModule,
            FormsModule, MatIconModule, NgxDaterangepickerMd.forRoot(),
            MatTooltipModule
          ],
          declarations: [TimelineControllerComponent],
          providers: [{provide: UI_CONSTANTS_TOKEN, useValue: UI_CONSTANTS}]
        })
        .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TimelineControllerComponent);
    component = fixture.componentInstance;
    component.encounters = encounters;
    component.selectedDateRange = encounters[0].period;
    fixture.detectChanges();
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
  it('should correctly set ranges as the list of encounters',
     (done: DoneFn) => {
       fixture.whenStable().then(x => {
         for (const encounter of encounters) {
           const label =
               moment(encounter.period.start.startOf('day').toJSDate())
                   .format('MM/DD/YYYY') +
               '-' +
               moment(encounter.period.end.startOf('day').toJSDate())
                   .format('MM/DD/YYYY');
           expect(component.datePickerRanges[label]).toBeDefined();
           expect(component.datePickerRanges[label][0].valueOf())
               .toEqual(encounter.period.start.startOf('day').toMillis());
           expect(component.datePickerRanges[label][1].valueOf())
               .toEqual(encounter.period.end.endOf('day').toMillis());
         }
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
            FormsModule, MatIconModule, NgxDaterangepickerMd.forRoot(),
            MatTooltipModule
          ],
          declarations: [TimelineControllerComponent],
          providers: [
            {provide: FhirService, useClass: StubFhirService},
            {provide: UI_CONSTANTS_TOKEN, useValue: UI_CONSTANTS}
          ]
        })
        .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TimelineControllerComponent);
    component = fixture.componentInstance;
    component.selectedDateRange = encounters[0].period;
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
