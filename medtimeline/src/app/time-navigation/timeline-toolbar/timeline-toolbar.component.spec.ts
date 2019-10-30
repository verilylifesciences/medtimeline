// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {HttpClientModule} from '@angular/common/http';
import {async, ComponentFixture, TestBed} from '@angular/core/testing';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
// tslint:disable-next-line:max-line-length
import {MatAutocompleteModule, MatDialog, MatDialogRef, MatFormFieldModule, MatIconModule, MatInputModule, MatListModule, MatMenuModule, MatTooltipModule} from '@angular/material';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {NgxDaterangepickerMd} from 'ngx-daterangepicker-material';
import {UI_CONSTANTS, UI_CONSTANTS_TOKEN} from 'src/constants';

import {ResourceCodeCreator} from '../../conceptmappings/resource-code-creator';
import {ResourceCodeManager} from '../../conceptmappings/resource-code-manager';
import {DataSelectorElementComponent} from '../../data-selector-element/data-selector-element.component';
import {FhirService} from '../../fhir-server/fhir.service';
import {StubFhirService} from '../../test_utils';

import {TimelineToolbarComponent} from './timeline-toolbar.component';

describe('TimelineToolbarComponent', () => {
  let component: TimelineToolbarComponent;
  let fixture: ComponentFixture<TimelineToolbarComponent>;

  beforeEach(async(() => {
    TestBed
        .configureTestingModule({
          declarations:
              [TimelineToolbarComponent, DataSelectorElementComponent],
          imports: [
            MatMenuModule, MatTooltipModule, MatIconModule, MatListModule,
            MatAutocompleteModule, NgxDaterangepickerMd.forRoot(),
            MatFormFieldModule, MatInputModule, FormsModule,
            ReactiveFormsModule, BrowserAnimationsModule, HttpClientModule
          ],
          providers: [
            {provide: FhirService, useClass: StubFhirService},
            {provide: ResourceCodeManager, useClass: ResourceCodeManager},
            {provide: ResourceCodeCreator, useClass: ResourceCodeCreator},
            {provide: MatDialogRef, useValue: {}},
            {provide: MatDialog, useValue: {}},
            {provide: UI_CONSTANTS_TOKEN, useValue: UI_CONSTANTS}
          ]
        })
        .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TimelineToolbarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
