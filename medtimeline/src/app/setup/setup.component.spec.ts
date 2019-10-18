// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {HttpClientModule} from '@angular/common/http';
import {async, ComponentFixture, TestBed} from '@angular/core/testing';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {MatCheckboxModule, MatExpansionModule, MatFormFieldModule, MatGridListModule, MatInputModule, MatRadioModule, MatToolbarModule} from '@angular/material';
import {MatIconModule} from '@angular/material/icon';
import {DomSanitizer} from '@angular/platform-browser';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {ActivatedRoute, Router} from '@angular/router';
import {UI_CONSTANTS, UI_CONSTANTS_TOKEN} from 'src/constants';

import {DisplayGrouping, labResult, vitalSign} from '../clinicalconcepts/display-grouping';
import {LOINCCode, LOINCCodeGroup} from '../clinicalconcepts/loinc-code';
import {ResourceCodeCreator} from '../conceptmappings/resource-code-creator';
import {ResourceCodeManager} from '../conceptmappings/resource-code-manager';
import {DebuggerComponent} from '../debugger/debugger.component';
import {FhirService} from '../fhir.service';
import {Axis} from '../graphtypes/axis';
import {AxisGroup} from '../graphtypes/axis-group';
import {ChartType} from '../graphtypes/graph/graph.component';
import {StubFhirService} from '../test_utils';

import {SetupComponent} from './setup.component';

describe('SetupComponent', () => {
  let component: SetupComponent;
  let fixture: ComponentFixture<SetupComponent>;

  beforeEach(async(() => {
    TestBed
        .configureTestingModule({
          declarations: [SetupComponent, DebuggerComponent],
          imports: [
            MatToolbarModule, MatCheckboxModule, MatFormFieldModule,
            ReactiveFormsModule, FormsModule, MatInputModule,
            BrowserAnimationsModule, MatIconModule, MatRadioModule,
            MatExpansionModule, MatGridListModule, HttpClientModule
          ],
          providers: [
            {provide: ActivatedRoute, useValue: {}},
            {provide: Router, useValue: {}},
            {provide: FhirService, useClass: StubFhirService},
            {provide: ResourceCodeManager, useClass: ResourceCodeManager},
            {provide: ResourceCodeCreator, useClass: ResourceCodeCreator},
            {provide: UI_CONSTANTS_TOKEN, useValue: UI_CONSTANTS}
          ]
        })
        .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SetupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should filter concepts based on input', ((done: DoneFn) => {
       const fhirStub = TestBed.get(FhirService);
       const displayGroups = new Array<[DisplayGrouping, AxisGroup[]]>();
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

       displayGroups.push([labResult, [axisG1, axisG2]]);
       displayGroups.push([vitalSign, [axisG3]]);

       const userInput = 'Bi';

       const filtered = component.filter(userInput, displayGroups);
       expect(filtered.length).toEqual(1);
       const element = filtered[0];
       expect(element[0].label).toEqual('Lab Results');
       expect(element[1].length).toEqual(2);
       expect(element[1][0].label).toEqual('Bilirubin, Direct');
       expect(element[1][1].label).toEqual('Bilirubin, Total');
       done();
     }));
});
