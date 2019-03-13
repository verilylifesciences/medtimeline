// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {SimpleChange} from '@angular/core';
import {async, ComponentFixture, TestBed} from '@angular/core/testing';
import {MatProgressSpinnerModule} from '@angular/material';
import {MatCardModule} from '@angular/material/card';
import {MatIconModule} from '@angular/material/icon';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {DateTime, Interval} from 'luxon';
import {labResult} from 'src/app/clinicalconcepts/display-grouping';
import {LOINCCode, LOINCCodeGroup} from 'src/app/clinicalconcepts/loinc-code';
import {ResourceCodesForCard} from 'src/app/clinicalconcepts/resource-code-manager';
import {FhirService} from 'src/app/fhir.service';
import {LabeledSeries} from 'src/app/graphdatatypes/labeled-series';
import {ChartType, GraphComponent} from 'src/app/graphtypes/graph/graph.component';
import {LineGraphComponent} from 'src/app/graphtypes/linegraph/linegraph.component';
import {MicrobioGraphComponent} from 'src/app/graphtypes/microbio-graph/microbio-graph.component';
import {ScatterplotComponent} from 'src/app/graphtypes/scatterplot/scatterplot.component';
import {StepGraphComponent} from 'src/app/graphtypes/stepgraph/stepgraph.component';
import {StubFhirService} from 'src/app/test_utils';

import {CardComponent} from '../card/card.component';

import {MultiGraphCardComponent} from './multigraphcard.component';

describe('MultiGraphCardComponent', () => {
  let component: MultiGraphCardComponent;
  let fixture: ComponentFixture<MultiGraphCardComponent>;
  const hemoglobin = new LOINCCodeGroup(
      new StubFhirService(), 'lbl',
      [new LOINCCode('718-7', labResult, 'Hemoglobin', true)], labResult,
      ChartType.LINE, [0, 50], false);

  beforeEach(async(() => {
    TestBed
        .configureTestingModule({
          imports: [
            BrowserAnimationsModule,
            MatCardModule,
            MatIconModule,
            MatProgressSpinnerModule,
          ],
          declarations: [
            MultiGraphCardComponent, LineGraphComponent, StepGraphComponent,
            ScatterplotComponent, MicrobioGraphComponent, CardComponent
          ],
          providers: [
            {provide: FhirService, useValue: new StubFhirService()},
          ],
        })
        .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MultiGraphCardComponent);

    component = fixture.componentInstance;
    component.resourceCodeGroups =
        new ResourceCodesForCard([hemoglobin], '', labResult);
    component.id = 'id';
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('on date change should retrieve data and render graph', (done: DoneFn) => {
    component.dateRange =
        Interval.fromDateTimes(DateTime.utc(), DateTime.utc().plus({days: 2}));
    component.ngOnChanges(
        {dateRange: new SimpleChange(null, component.dateRange, true)});

    Promise.all(component.card.axes.map(axis => axis.getDataFromFhir()))
        .then(() => {
          fixture.detectChanges();
          expect(component.card.axes.length).toEqual(1);

          const axis = component.card.axes[0];
          expect(axis.displayConcept).toEqual(labResult);
          expect(axis.dateRange).toEqual(component.dateRange);
          expect(axis.label).toEqual('lbl');
          expect(component.containedGraphs.length).toEqual(1);

          const containedGraph = component.containedGraphs.first;
          expect(containedGraph.dateRange).toEqual(component.dateRange);
          expect(containedGraph.data.series.length).toEqual(1);
          expect(containedGraph.data.series[0])
              .toEqual(new LabeledSeries('Lab Results', []));
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
