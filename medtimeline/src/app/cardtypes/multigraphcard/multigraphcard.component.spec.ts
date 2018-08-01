// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {async, ComponentFixture, fakeAsync, TestBed} from '@angular/core/testing';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {MatCheckboxModule, MatProgressSpinnerModule} from '@angular/material';
import {MatCardModule} from '@angular/material/card';
import {MatIconModule} from '@angular/material/icon';
import {MatInputModule} from '@angular/material/input';
import {By} from '@angular/platform-browser';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {labResult} from 'src/app/clinicalconcepts/display-grouping';
import {ResourceCodesForCard} from 'src/app/clinicalconcepts/resource-code-manager';
import {FhirService} from 'src/app/fhir.service';
import {LineGraphComponent} from 'src/app/graphtypes/linegraph/linegraph.component';
import {MicrobioGraphComponent} from 'src/app/graphtypes/microbio-graph/microbio-graph.component';
import {ScatterplotComponent} from 'src/app/graphtypes/scatterplot/scatterplot.component';
import {StepGraphComponent} from 'src/app/graphtypes/stepgraph/stepgraph.component';
import {SELECTED} from 'src/app/theme/bch_colors';

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
            MatInputModule,
            MatIconModule,
            FormsModule,
            ReactiveFormsModule,
            MatProgressSpinnerModule,
            MatCheckboxModule,
          ],
          declarations: [
            MultiGraphCardComponent,
            LineGraphComponent,
            StepGraphComponent,
            ScatterplotComponent,
            MicrobioGraphComponent,
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
       spyOn(component.deleteEvent, 'emit');
       const button = fixture.debugElement.nativeElement.querySelector(
           'mat-icon.removeCardButton');
       button.click();
       fixture.whenStable().then(() => {
         expect(component.deleteEvent.emit).toHaveBeenCalledWith(component.id);
       });
     }));

  it('should correctly toggle background color and emit checkedEvent when checkbox is clicked',
     async(() => {
       fixture.detectChanges();
       const background = fixture.debugElement.query(By.css('#id'));
       spyOn(component.checkedEvent, 'emit');
       component.checkboxChange({checked: true});
       fixture.whenStable().then(() => {
         expect(component.checkedEvent.emit).toHaveBeenCalled();
         expect(background.nativeElement.style.backgroundColor)
             .toEqual('' + SELECTED);
       });
     }));
});
