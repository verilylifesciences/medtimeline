// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {async, ComponentFixture, fakeAsync, TestBed} from '@angular/core/testing';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {MatCheckboxModule, MatExpansionModule, MatFormFieldModule, MatInputModule, MatRadioModule, MatToolbarModule} from '@angular/material';
import {MatIconModule} from '@angular/material/icon';
import {By, DomSanitizer} from '@angular/platform-browser';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {ActivatedRoute, Router} from '@angular/router';
import {UI_CONSTANTS, UI_CONSTANTS_TOKEN} from 'src/constants';

import {ResourceCodeManager} from '../clinicalconcepts/resource-code-manager';
import {DebuggerComponent} from '../debugger/debugger.component';
import {FhirService} from '../fhir.service';
import {StubFhirService} from '../test_utils';

import {SetupComponent} from './setup.component';

const resourceCodeManagerStub =
    new ResourceCodeManager(new StubFhirService(), TestBed.get(DomSanitizer));
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
            MatExpansionModule
          ],
          providers: [
            {provide: ResourceCodeManager, useValue: resourceCodeManagerStub},
            {provide: ActivatedRoute, useValue: {}},
            {provide: Router, useValue: {}},
            {provide: FhirService, useValue: new StubFhirService()},
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

  it('should filter concepts based on input', fakeAsync(() => {
       const userInput = 'Bi';
       const filtered = component.filter(userInput);
       expect(filtered.length).toEqual(1);
       const element = filtered[0];
       expect(element[0].label).toEqual('Lab Results');
       expect(element[1].length).toEqual(2);
       expect(element[1][0].label).toEqual('Bilirubin, Direct');
       expect(element[1][1].label).toEqual('Bilirubin, Total');
     }));

  it('should have radio buttons for each time option', () => {
    const buttons = fixture.debugElement.queryAll(By.css('mat-radio-button'));
    const buttonText = [];
    buttons.forEach((button) => {
      buttonText.push(button.nativeElement.textContent.trim());
    });
    const timeOptions = [
      UI_CONSTANTS.LAST_MONTH, UI_CONSTANTS.LAST_ONE_DAY,
      UI_CONSTANTS.LAST_SEVEN_DAYS, UI_CONSTANTS.LAST_THREE_DAYS,
      UI_CONSTANTS.LAST_THREE_MONTHS
    ];
    for (let i = 0; i < timeOptions.length; i++) {
      expect(buttonText).toContain(timeOptions[i]);
    }
  });
});
