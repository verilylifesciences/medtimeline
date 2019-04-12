// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {async, ComponentFixture, TestBed} from '@angular/core/testing';
import {MatCardModule, MatDialog, MatIconModule} from '@angular/material';
import {By} from '@angular/platform-browser';
import {DateTime, Interval} from 'luxon';
import {ChartsModule} from 'ng2-charts';
import {FhirService} from 'src/app/fhir.service';
import {CustomizableGraphAnnotation} from 'src/app/graphtypes/customizable-graph/customizable-graph-annotation';
import {CustomizableGraphComponent} from 'src/app/graphtypes/customizable-graph/customizable-graph.component';
import {StubFhirService} from 'src/app/test_utils';

import {CardComponent} from '../card/card.component';

import {CustomizableTimelineComponent} from './customizable-timeline.component';

describe('CustomizableTimelineComponent', () => {
  let component: CustomizableTimelineComponent;
  let fixture: ComponentFixture<CustomizableTimelineComponent>;
  let customGraph: CustomizableGraphComponent;

  beforeEach(async(() => {
    TestBed
        .configureTestingModule({
          imports: [MatCardModule, MatIconModule, ChartsModule],
          declarations: [
            CustomizableTimelineComponent, CustomizableGraphComponent,
            CardComponent
          ],
          providers: [
            {provide: MatDialog, useValue: null},
            {provide: FhirService, useValue: new StubFhirService()}
          ]
        })
        .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CustomizableTimelineComponent);
    component = fixture.componentInstance;
    customGraph =
        fixture.debugElement.query(By.directive(CustomizableGraphComponent))
            .componentInstance;
    component.dateRange = Interval.fromDateTimes(
        DateTime.local(2012, 8, 4, 12), DateTime.local(2012, 8, 15, 12));
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should listen for event to update eventlines', (() => {
       fixture.detectChanges();
       const dateTime = DateTime.fromISO('2012-08-04T11:00:00.000Z');
       spyOn(component.updateEventLines, 'emit');
       customGraph.data.addPointToSeries(
           new CustomizableGraphAnnotation(dateTime, 'title!'));
       customGraph.pointsChanged.emit(customGraph.data);
       expect(component.updateEventLines.emit)
           .toHaveBeenCalledWith({id: component.id, data: component.data});
     }));

  it('should emit event to remove card', (() => {
       fixture.detectChanges();
       spyOn(component.removeEvent, 'emit');
       const button = fixture.debugElement.nativeElement.querySelector(
           'mat-icon.removeCardButton');
       button.click();
       expect(component.removeEvent.emit)
           .toHaveBeenCalledWith({id: component.id, value: component.data});
     }));
});
