// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {HttpClientModule} from '@angular/common/http';
import {async, ComponentFixture, fakeAsync, TestBed} from '@angular/core/testing';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
// tslint:disable-next-line:max-line-length
import {MatAutocompleteModule, MatFormFieldModule, MatIconModule, MatInputModule, MatListModule, MatMenuModule, MatTooltipModule} from '@angular/material';
import {DomSanitizer} from '@angular/platform-browser';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {UI_CONSTANTS, UI_CONSTANTS_TOKEN} from 'src/constants';

import {ConceptFileConfiguration} from '../conceptmappings/concept-file-configuration';
import {ResourceCodeCreator} from '../conceptmappings/resource-code-creator';
import {ResourceCodeManager} from '../conceptmappings/resource-code-manager';
import {labResult, vitalSign} from '../conceptmappings/resource-codes/display-grouping';
import {LOINCCode, LOINCCodeGroup} from '../conceptmappings/resource-codes/loinc-code';
import {FhirService} from '../fhir-server/fhir.service';
import {Axis} from '../graphs/graphtypes/axis';
import {AxisGroup} from '../graphs/graphtypes/axis-group';
import {ChartType} from '../graphs/graphtypes/graph/graph.component';
import {StubFhirService} from '../utils/test_utils';

import {DataSelectorElementComponent} from './data-selector-element/data-selector-element.component';
import {DataSelectorMenuComponent} from './data-selector-menu.component';

describe('DataSelectorMenuComponent', () => {
  let component: DataSelectorMenuComponent;
  let fixture: ComponentFixture<DataSelectorMenuComponent>;

  beforeEach(async(() => {
    TestBed
        .configureTestingModule({
          declarations:
              [DataSelectorMenuComponent, DataSelectorElementComponent],
          imports: [
            MatMenuModule, MatTooltipModule, MatIconModule, MatListModule,
            MatAutocompleteModule, MatFormFieldModule, FormsModule,
            ReactiveFormsModule, MatInputModule, BrowserAnimationsModule,
            HttpClientModule
          ],
          providers: [
            {provide: FhirService, useClass: StubFhirService},
            ResourceCodeCreator,
            ResourceCodeManager,
            {provide: UI_CONSTANTS_TOKEN, useValue: UI_CONSTANTS},
            {
              provide: ConceptFileConfiguration,
              useValue: new ConceptFileConfiguration()
            },

          ]
        })
        .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DataSelectorMenuComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should filter concepts based on input', fakeAsync(() => {
       const fhirStub = TestBed.get(FhirService);
       const axis1 = new Axis(
           fhirStub, TestBed.get(DomSanitizer),
           new LOINCCodeGroup(
               fhirStub, 'Bilirubin, Direct',
               [LOINCCode.fromCodeString('1968-7')], labResult,
               ChartType.LINE));
       const axis2 = new Axis(
           fhirStub, TestBed.get(DomSanitizer),
           new LOINCCodeGroup(
               fhirStub, 'Bilirubin, Total',
               [LOINCCode.fromCodeString('1975-2')], labResult,
               ChartType.LINE));
       const axis3 = new Axis(
           fhirStub, TestBed.get(DomSanitizer),
           new LOINCCodeGroup(
               fhirStub, 'Some vital sign',
               [LOINCCode.fromCodeString('8310-5')], vitalSign,
               ChartType.LINE));
       const axisG1 = new AxisGroup([axis1], 'Bilirubin, Direct', labResult);
       const axisG2 = new AxisGroup([axis2], 'Bilirubin, Total', labResult);
       const axisG3 = new AxisGroup([axis3], 'Some vital sign', labResult);

       const userInput = 'Bil';

       const filtered = component.filter(userInput, [axisG1, axisG2, axisG3]);
       expect(filtered.length).toEqual(2);
       expect(new Set(filtered.map(x => x.label))).toEqual(new Set([
         'Bilirubin, Direct', 'Bilirubin, Total'
       ]));
     }));
});
