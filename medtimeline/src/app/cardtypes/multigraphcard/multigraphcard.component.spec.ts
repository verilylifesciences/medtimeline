// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {async, ComponentFixture, TestBed} from '@angular/core/testing';
import {MatProgressSpinnerModule} from '@angular/material';
import {MatCardModule} from '@angular/material/card';
import {MatIconModule} from '@angular/material/icon';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {labResult} from 'src/app/clinicalconcepts/display-grouping';
import {ResourceCodesForCard} from 'src/app/clinicalconcepts/resource-code-manager';
import {FhirService} from 'src/app/fhir.service';
import {LineGraphComponent} from 'src/app/graphtypes/linegraph/linegraph.component';
import {MicrobioGraphComponent} from 'src/app/graphtypes/microbio-graph/microbio-graph.component';
import {ScatterplotComponent} from 'src/app/graphtypes/scatterplot/scatterplot.component';
import {StepGraphComponent} from 'src/app/graphtypes/stepgraph/stepgraph.component';
import {CardComponent} from '../card/card.component';
import {MultiGraphCardComponent} from './multigraphcard.component';

describe('MultiGraphCardComponent', () => {
  let component: MultiGraphCardComponent;
  let fixture: ComponentFixture<MultiGraphCardComponent>;
  let fhirServiceStub: any;

  beforeEach(async(() => {
    fhirServiceStub = {};
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
            {provide: FhirService, useValue: fhirServiceStub},
          ],
        })
        .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MultiGraphCardComponent);
    component = fixture.componentInstance;
    component.resourceCodeGroups = new ResourceCodesForCard([], '', labResult);
    component.id = 'id';
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should emit event to remove card', async(() => {
       fixture.detectChanges();
       spyOn(component.onRemove, 'emit');
       const button = fixture.debugElement.nativeElement.querySelector(
           'mat-icon.removeCardButton');
       button.click();
       fixture.whenStable().then(() => {
         expect(component.onRemove.emit).toHaveBeenCalledWith(component.id);
       });
     }));
});
