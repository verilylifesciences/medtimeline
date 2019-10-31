// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {HttpClientModule} from '@angular/common/http';
import {SimpleChange} from '@angular/core';
import {async, ComponentFixture, TestBed} from '@angular/core/testing';
import {MatCardModule} from '@angular/material/card';
import {MatExpansionModule} from '@angular/material/expansion';
import {MatIconModule} from '@angular/material/icon';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import {MatTooltipModule} from '@angular/material/tooltip';
import {DomSanitizer} from '@angular/platform-browser';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {DateTime, Interval} from 'luxon';
import {ChartsModule} from 'ng2-charts';
import {ResourceCodeCreator} from 'src/app/conceptmappings/resource-code-creator';
import {ResourceCodeManager} from 'src/app/conceptmappings/resource-code-manager';
import {FhirService} from 'src/app/fhir-server/fhir.service';
import {Axis} from 'src/app/graphs/graphtypes/axis';
import {AxisGroup} from 'src/app/graphs/graphtypes/axis-group';
import {DiagnosticGraphComponent} from 'src/app/graphs/graphtypes/diagnostic-graph/diagnostic-graph.component';
import {ChartType} from 'src/app/graphs/graphtypes/graph/graph.component';
import {LineGraphComponent} from 'src/app/graphs/graphtypes/linegraph/linegraph.component';
import {MicrobioGraphComponent} from 'src/app/graphs/graphtypes/microbio-graph/microbio-graph.component';
import {ScatterplotComponent} from 'src/app/graphs/graphtypes/scatterplot/scatterplot.component';
import {StepGraphComponent} from 'src/app/graphs/graphtypes/stepgraph/stepgraph.component';
import {labResult} from 'src/app/conceptmappings/resource-codes/display-grouping';
import {LOINCCode, LOINCCodeGroup} from 'src/app/conceptmappings/resource-codes/loinc-code';
import {StubFhirService} from 'src/app/utils/test_utils';
import {UI_CONSTANTS, UI_CONSTANTS_TOKEN} from 'src/constants';

import {CardComponent} from '../card/card.component';

import {MultiGraphCardComponent} from './multigraphcard.component';

describe('MultiGraphCardComponent', () => {
  let component: MultiGraphCardComponent;
  let fixture: ComponentFixture<MultiGraphCardComponent>;
  let hemoglobin;

  beforeEach(async(() => {
    TestBed
        .configureTestingModule({
          imports: [
            BrowserAnimationsModule, MatCardModule, MatIconModule,
            MatProgressSpinnerModule, ChartsModule, MatTooltipModule,
            MatExpansionModule, HttpClientModule
          ],
          declarations: [
            MultiGraphCardComponent, LineGraphComponent, StepGraphComponent,
            ScatterplotComponent, MicrobioGraphComponent,
            DiagnosticGraphComponent, CardComponent
          ],
          providers: [
            {provide: FhirService, useClass: StubFhirService},
            ResourceCodeCreator, ResourceCodeManager,
            {provide: UI_CONSTANTS_TOKEN, useValue: UI_CONSTANTS}
          ],
        })
        .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MultiGraphCardComponent);

    component = fixture.componentInstance;
    component.dateRange =
        Interval.fromDateTimes(DateTime.utc(), DateTime.utc().plus({days: 2}));
    hemoglobin = new LOINCCodeGroup(
        TestBed.get(FhirService), 'lbl', [LOINCCode.fromCodeString('718-7')],
        labResult, ChartType.LINE);
    component.axisGroup = new AxisGroup([new Axis(
        TestBed.get(FhirService), TestBed.get(DomSanitizer), hemoglobin,
        'Hemoglobin')]);
    component.id = 'id';
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('on date change should retrieve data and render graph', (done: DoneFn) => {
    const dateRange =
        Interval.fromDateTimes(DateTime.utc(), DateTime.utc().plus({days: 2}));
    component.ngOnChanges({dateRange: new SimpleChange(null, dateRange, true)});

    Promise
        .all(component.axisGroup.axes.map(
            axis => axis.updateDateRange(dateRange)))
        .then(() => {
          fixture.detectChanges();
          const axis = component.axisGroup.axes[0];
          expect(axis.displayConcept).toEqual(labResult);
          expect(axis.label).toEqual('Hemoglobin');
          done();
        });
  });

  it('should emit event to remove card', async(() => {
       fixture.detectChanges();
       spyOn(component.removeEvent, 'emit');
       const button = fixture.debugElement.nativeElement.querySelector(
           'mat-icon.removeCardButton');
       button.click();
       fixture.whenStable().then(() => {
         expect(component.removeEvent.emit).toHaveBeenCalledWith({
           id: component.id
         });
       });
     }));
});
