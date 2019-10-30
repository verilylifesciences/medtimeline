// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {HttpClientModule} from '@angular/common/http';
import {async, ComponentFixture, TestBed} from '@angular/core/testing';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {MatNativeDateModule} from '@angular/material';
import {MatAutocompleteModule} from '@angular/material/autocomplete';
import {MatCardModule} from '@angular/material/card';
import {MatCheckboxModule} from '@angular/material/checkbox';
import {MatDatepickerModule} from '@angular/material/datepicker';
import {MAT_DIALOG_DATA, MatDialog} from '@angular/material/dialog';
import {MatDividerModule} from '@angular/material/divider';
import {MatExpansionModule} from '@angular/material/expansion';
import {MatIconModule} from '@angular/material/icon';
import {MatInputModule} from '@angular/material/input';
import {MatListModule} from '@angular/material/list';
import {MatMenuModule} from '@angular/material/menu';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import {MatRadioModule} from '@angular/material/radio';
import {MatSnackBar, MatSnackBarModule} from '@angular/material/snack-bar';
import {MatToolbarModule} from '@angular/material/toolbar';
import {MatTooltipModule} from '@angular/material/tooltip';
import {By, DomSanitizer} from '@angular/platform-browser';
import {BrowserModule} from '@angular/platform-browser';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {DateTime, Interval} from 'luxon';
import {ChartsModule} from 'ng2-charts';
import {DragulaService} from 'ng2-dragula';
import {NgxDaterangepickerMd} from 'ngx-daterangepicker-material';
import {of} from 'rxjs';
import {UI_CONSTANTS, UI_CONSTANTS_TOKEN} from 'src/constants';

import {CardComponent} from '../cardtypes/card/card.component';
import {CustomizableTimelineComponent} from '../cardtypes/customizable-timeline/customizable-timeline.component';
import {MultiGraphCardComponent} from '../cardtypes/multigraphcard/multigraphcard.component';
import {TextboxcardComponent} from '../cardtypes/textboxcard/textboxcard.component';
import {ResourceCodeCreator} from '../conceptmappings/resource-code-creator';
import {ResourceCodeManager} from '../conceptmappings/resource-code-manager';
import {DataSelectorElementComponent} from '../data-selector-element/data-selector-element.component';
import {DataSelectorMenuComponent} from '../data-selector-menu/data-selector-menu.component';
import {DebuggerComponent} from '../debugger/debugger.component';
import {DeleteDialogComponent} from '../dialogs/delete-dialog/delete-dialog.component';
import {FhirService} from '../fhir-server/fhir.service';
import {CustomizableData} from '../graphdatatypes/customizabledata';
import {CustomizableGraphAnnotation} from '../graphtypes/customizable-graph/customizable-graph-annotation';
import {CustomizableGraphComponent} from '../graphtypes/customizable-graph/customizable-graph.component';
import {DiagnosticGraphComponent} from '../graphtypes/diagnostic-graph/diagnostic-graph.component';
import {LineGraphComponent} from '../graphtypes/linegraph/linegraph.component';
import {MicrobioGraphComponent} from '../graphtypes/microbio-graph/microbio-graph.component';
import {ScatterplotComponent} from '../graphtypes/scatterplot/scatterplot.component';
import {StepGraphComponent} from '../graphtypes/stepgraph/stepgraph.component';
import {SetupDataService} from '../setup-data.service';
import {StubFhirService} from '../test_utils';
import {TimelineControllerComponent} from '../time-navigation/timeline-controller/timeline-controller.component';
import {TimelineToolbarComponent} from '../time-navigation/timeline-toolbar/timeline-toolbar.component';

import {CardcontainerComponent} from './cardcontainer.component';

const resourceCodeManagerStub =
    new ResourceCodeManager(TestBed.get(DomSanitizer));

describe('CardcontainerComponent', () => {
  let component: CardcontainerComponent;
  let fixture: ComponentFixture<CardcontainerComponent>;
  let dataSelectorMenu: DataSelectorMenuComponent;
  let timelineToolbar: TimelineToolbarComponent;

  // Set up spies for the snackbar and dialog, as they're hard to directly
  // unit test.
  let snackBarSpy;
  let dialogSpy;
  let dialogRefSpyObj;
  let snackbarRefSpyObj;

  beforeEach(async(() => {
    TestBed
        .configureTestingModule({
          imports: [
            MatCardModule,
            MatIconModule,
            MatListModule,
            MatDividerModule,
            MatDatepickerModule,
            MatNativeDateModule,
            MatAutocompleteModule,
            MatInputModule,
            FormsModule,
            ReactiveFormsModule,
            BrowserModule,
            BrowserAnimationsModule,
            MatProgressSpinnerModule,
            MatMenuModule,
            NgxDaterangepickerMd.forRoot(),
            MatToolbarModule,
            MatSnackBarModule,
            MatCheckboxModule,
            MatRadioModule,
            MatTooltipModule,
            ChartsModule,
            MatExpansionModule,
            HttpClientModule
          ],
          declarations: [
            CardcontainerComponent, TextboxcardComponent,
            TimelineControllerComponent, MultiGraphCardComponent,
            CustomizableGraphComponent, LineGraphComponent, StepGraphComponent,
            ScatterplotComponent, MicrobioGraphComponent,
            DiagnosticGraphComponent, CustomizableTimelineComponent,
            TimelineToolbarComponent, DataSelectorElementComponent,
            DataSelectorMenuComponent, CardComponent, DebuggerComponent,
            DeleteDialogComponent
          ],
          providers: [
            {provide: FhirService, useClass: StubFhirService},
            {provide: ResourceCodeManager, useClass: ResourceCodeManager},
            {provide: ResourceCodeCreator, useClass: ResourceCodeCreator},
            {provide: UI_CONSTANTS_TOKEN, useValue: UI_CONSTANTS},
            DragulaService, {provide: MAT_DIALOG_DATA, useValue: {}}, {
              provide: SetupDataService,
              useValue: {
                selectedConcepts: [],
                encounters: [],
                selectedDateRange: Interval.fromDateTimes(
                    DateTime.utc().minus({days: 7}), DateTime.utc())
              }
            }
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
    dialogRefSpyObj =
        jasmine.createSpyObj({open: of({}), afterClosed: of({}), close: null});
    dialogSpy =
        spyOn(TestBed.get(MatDialog), 'open').and.returnValue(dialogRefSpyObj);
    dialogRefSpyObj.componentInstance = {body: ''};

    snackbarRefSpyObj = jasmine.createSpyObj({open: of({}), onAction: of({})});
    snackBarSpy = spyOn(TestBed.get(MatSnackBar), 'open')
                      .and.returnValue(snackbarRefSpyObj);

    fixture.detectChanges();
  });

  it('should create', (() => {
       expect(component).toBeTruthy();
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
    const initialData = CustomizableData.defaultEmptySeries();
    initialData.addPointToSeries(
        new CustomizableGraphAnnotation(dateTime, 'title!'));
    component.updateEventLines(
        {data: initialData, id: component.displayedConcepts[0].id});
    // There should be the original point needed to show the x-axis,
    // plus the new point.
    expect(component.eventlines.length).toEqual(1);
    expect(component.eventlines[0])
        .toEqual(
            {color: '#000000', text: 'title!', value: dateTime.toMillis()});
  });

  it('should calculate eventlines correctly with more than one custom timeline',
     () => {
       const initialData = CustomizableData.defaultEmptySeries();

       const dateTime1 = DateTime.fromISO('2012-08-04T11:00:00.000Z');
       initialData.addPointToSeries(
           new CustomizableGraphAnnotation(dateTime1, 'title!'));
       component.updateEventLines(
           {data: initialData, id: component.displayedConcepts[0].id});
       // There should be the original point needed to show the x-axis,
       // plus the new point.
       expect(component.eventlines.length).toEqual(1);
       // Drop the first point (which anchors the x-axis but isn't ever
       // rendered) for comparison.
       expect(component.eventlines)
           .toContain(
               {color: '#000000', text: 'title!', value: dateTime1.toMillis()});

       component.displayedConcepts.push(
           {concept: 'customTimeline', id: 'uniqueID'});
       const data2 = CustomizableData.defaultEmptySeries();
       const dateTime2 = DateTime.fromISO('2012-08-20T11:00:00.000Z');
       data2.addPointToSeries(
           new CustomizableGraphAnnotation(dateTime2, 'another title!'));
       component.updateEventLines({data: data2, id: 'uniqueID'});


       expect(component.eventlines.length).toEqual(2);
       // Drop the first point (which anchors the x-axis but isn't ever
       // rendered) for comparison.
       expect(component.eventlines)
           .toContain(
               {color: '#000000', text: 'title!', value: dateTime1.toMillis()});
       expect(component.eventlines).toContain({
         color: '#000000',
         text: 'another title!',
         value: dateTime2.toMillis()
       });
     });

  /**
   * Testing this action is difficult because of all the mocks. This is covered
   * well in e2e tests, but this unit test is just a sanity check to make sure
   * the code runs through okay.
   */
  it('should go through all the actions to delete and replace card', () => {
    // Grab the second card and remove it.
    const cardToRemove = component.displayedConcepts[1];
    const origDisplayedConcepts = component.displayedConcepts;

    component.removeDisplayedCard({id: cardToRemove.id});

    // Expect that the delete dialog comes up.
    expect(dialogSpy).toHaveBeenCalled();
    // Expect the dialog to be closed with a result, so that the card is
    // (temporarily) deleted.
    expect(dialogRefSpyObj.afterClosed).toHaveBeenCalled();

    // Expect the snack bar is opened.
    expect(snackBarSpy).toHaveBeenCalledTimes(1);
    // Expect the undo is clicked on the snack bar.
    expect(snackbarRefSpyObj.onAction).toHaveBeenCalled();

    // Expect that, then, the components list doesn't end up changing.
    expect(component.displayedConcepts).toEqual(origDisplayedConcepts);
  });
});
