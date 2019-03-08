// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {async, ComponentFixture, TestBed} from '@angular/core/testing';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
// tslint:disable-next-line:max-line-length
import {MAT_DIALOG_DATA, MatAutocompleteModule, MatDatepickerModule, MatDividerModule, MatListModule, MatMenuModule, MatNativeDateModule, MatProgressSpinnerModule, MatSnackBar, MatSnackBarModule, MatToolbarModule} from '@angular/material';
import {MatCardModule} from '@angular/material/card';
import {MatIconModule} from '@angular/material/icon';
import {MatInputModule} from '@angular/material/input';
import {By} from '@angular/platform-browser';
import {BrowserModule} from '@angular/platform-browser';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {DateTime} from 'luxon';
import {DragulaService} from 'ng2-dragula';
import {NgxDaterangepickerMd} from 'ngx-daterangepicker-material';

import {CardComponent} from '../cardtypes/card/card.component';
import {CustomizableTimelineComponent} from '../cardtypes/customizable-timeline/customizable-timeline.component';
import {MultiGraphCardComponent} from '../cardtypes/multigraphcard/multigraphcard.component';
import {TextboxcardComponent} from '../cardtypes/textboxcard/textboxcard.component';
import {ResourceCodeManager} from '../clinicalconcepts/resource-code-manager';
import {DataSelectorElementComponent} from '../data-selector-element/data-selector-element.component';
import {DataSelectorMenuComponent} from '../data-selector-menu/data-selector-menu.component';
import {FhirService} from '../fhir.service';
import {CustomizableData} from '../graphdatatypes/customizabledata';
import {CustomizableGraphAnnotation} from '../graphtypes/customizable-graph/customizable-graph-annotation';
import {CustomizableGraphComponent} from '../graphtypes/customizable-graph/customizable-graph.component';
import {LineGraphComponent} from '../graphtypes/linegraph/linegraph.component';
import {MicrobioGraphComponent} from '../graphtypes/microbio-graph/microbio-graph.component';
import {ScatterplotComponent} from '../graphtypes/scatterplot/scatterplot.component';
import {StepGraphComponent} from '../graphtypes/stepgraph/stepgraph.component';
import {StubFhirService} from '../test_utils';
import {TimelineControllerComponent} from '../timeline-controller/timeline-controller.component';
import {TimelineToolbarComponent} from '../timeline-toolbar/timeline-toolbar.component';

import {CardcontainerComponent} from './cardcontainer.component';

const resourceCodeManagerStub = new ResourceCodeManager(new StubFhirService());

describe('CardcontainerComponent', () => {
  let component: CardcontainerComponent;
  let fixture: ComponentFixture<CardcontainerComponent>;
  let dataSelectorMenu: DataSelectorMenuComponent;
  let timelineToolbar: TimelineToolbarComponent;

  beforeEach(async(() => {
    TestBed
        .configureTestingModule({
          imports: [
            MatCardModule, MatIconModule, MatListModule, MatDividerModule,
            MatDatepickerModule, MatNativeDateModule, MatAutocompleteModule,
            MatInputModule, FormsModule, ReactiveFormsModule, BrowserModule,
            BrowserAnimationsModule, MatProgressSpinnerModule, MatMenuModule,
            NgxDaterangepickerMd.forRoot(), MatToolbarModule, MatSnackBarModule
          ],
          declarations: [
            CardcontainerComponent, TextboxcardComponent,
            TimelineControllerComponent, MultiGraphCardComponent,
            CustomizableGraphComponent, LineGraphComponent, StepGraphComponent,
            ScatterplotComponent, MicrobioGraphComponent,
            CustomizableTimelineComponent, TimelineToolbarComponent,
            DataSelectorElementComponent, DataSelectorMenuComponent,
            CardComponent
          ],
          providers: [
            {provide: FhirService, useValue: new StubFhirService()},
            {provide: ResourceCodeManager, useValue: resourceCodeManagerStub},
            DragulaService, {provide: MAT_DIALOG_DATA, useValue: {}},
            {provide: MatSnackBar, useValue: {}}
          ],
        })
        .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CardcontainerComponent);
    component = fixture.componentInstance;
    dataSelectorMenu =
        fixture.debugElement.query(By.directive(DataSelectorMenuComponent))
            .componentInstance;
    timelineToolbar =
        fixture.debugElement.query(By.directive(TimelineToolbarComponent))
            .componentInstance;
    fixture.detectChanges();
  });

  it('should create', async(() => {
       fixture.whenStable().then(x => expect(component).toBeTruthy());
     }));

  it('should listen for event to add card', () => {
    const displayedConceptsOriginalSize = component.displayedConcepts.length;
    dataSelectorMenu.addCard.emit('Temperature');
    fixture.whenStable().then(() => {
      expect(component.displayedConcepts.length)
          .toEqual(displayedConceptsOriginalSize + 1);
    });
  });

  it('should listen for event to add textbox', () => {
    const displayedConceptsOriginalSize = component.displayedConcepts.length;
    dataSelectorMenu.addTextbox.emit();
    fixture.whenStable().then(() => {
      expect(component.displayedConcepts.length)
          .toEqual(displayedConceptsOriginalSize + 1);
    });
  });

  it('should listen for event to add textbox', () => {
    const displayedConceptsOriginalSize = component.displayedConcepts.length;
    timelineToolbar.addTextbox.emit();
    fixture.whenStable().then(() => {
      expect(component.displayedConcepts.length)
          .toEqual(displayedConceptsOriginalSize + 1);
    });
  });

  it('should calculate eventlines correctly', () => {
    const dateTime = DateTime.fromISO('2012-08-04T11:00:00.000Z');
    const eventlinesOriginalSize = component.eventlines.length;
    const initialData = CustomizableData.defaultEmptySeries();
    initialData.addPointToSeries(
        0, new CustomizableGraphAnnotation(dateTime, 'title!'));
    component.updateEventLines(
        {data: initialData, id: component.displayedConcepts[0].id});
    expect(component.eventlines.length).toEqual(eventlinesOriginalSize + 1);
    expect(component.eventlines).toEqual([
      {class: 'color000000', text: 'title!', value: dateTime.toMillis()}
    ]);
  });

  it('should calculate eventlines correctly with more than one custom timeline',
     () => {
       const initialData = CustomizableData.defaultEmptySeries();
       const dateTime1 = DateTime.fromISO('2012-08-04T11:00:00.000Z');
       const dateTime2 = DateTime.fromISO('2012-08-20T11:00:00.000Z');
       const eventlinesOriginalSize = component.eventlines.length;
       initialData.addPointToSeries(
           0, new CustomizableGraphAnnotation(dateTime1, 'title!'));
       component.updateEventLines(
           {data: initialData, id: component.displayedConcepts[0].id});
       expect(component.eventlines.length).toEqual(eventlinesOriginalSize + 1);
       expect(component.eventlines).toEqual([
         {class: 'color000000', text: 'title!', value: dateTime1.toMillis()}
       ]);

       component.displayedConcepts.push(
           {concept: 'customTimeline', id: 'uniqueID'});
       const data2 = CustomizableData.defaultEmptySeries();
       data2.addPointToSeries(
           0, new CustomizableGraphAnnotation(dateTime2, 'another title!'));
       component.updateEventLines({data: data2, id: 'uniqueID'});
       expect(component.eventlines.length).toEqual(eventlinesOriginalSize + 2);
       expect(component.eventlines).toEqual([
         {class: 'color000000', text: 'title!', value: dateTime1.toMillis()}, {
           class: 'color000000',
           text: 'another title!',
           value: dateTime2.toMillis()
         }
       ]);
     });
});
