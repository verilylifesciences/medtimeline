// Copyright 2019 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {OverlayContainer} from '@angular/cdk/overlay';
import {Inject} from '@angular/core';
import {async, ComponentFixture, inject, TestBed} from '@angular/core/testing';
import {MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef, MatIconModule} from '@angular/material';
import {DomSanitizer} from '@angular/platform-browser';
import {BrowserDynamicTestingModule} from '@angular/platform-browser-dynamic/testing';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {DateTime, Interval} from 'luxon';
import {ChartsModule} from 'ng2-charts';
import {AnnotatedDiagnosticReport} from 'src/app/fhir-data-classes/annotated-diagnostic-report';
import {DiagnosticReport} from 'src/app/fhir-data-classes/diagnostic-report';
import {DiagnosticGraphData} from 'src/app/graphdatatypes/diagnosticgraphdata';
import {makeDiagnosticReports} from 'src/app/test_utils';
import {UI_CONSTANTS, UI_CONSTANTS_TOKEN} from 'src/constants';

import {AnnotatedTooltip} from '../tooltips/annotated-tooltip';

import {DiagnosticGraphComponent} from './diagnostic-graph.component';
import {DiagnosticGraphDialogComponent} from './diagnostic-graph.dialog.component';

class StubDiagnosticGraphComponent extends DiagnosticGraphComponent {
  annotatedDiagnosticReport: AnnotatedDiagnosticReport[];

  constructor(
      diagnosticGraphDialog: MatDialog,
      @Inject(UI_CONSTANTS_TOKEN) readonly uiConstants: any) {
    super(TestBed.get(DomSanitizer), diagnosticGraphDialog, uiConstants);
    this.annotatedDiagnosticReport = makeDiagnosticReports().map(
        report => new AnnotatedDiagnosticReport(report));
    this.data = DiagnosticGraphData.fromDiagnosticReports(
        this.annotatedDiagnosticReport, this.sanitizer);
  }
}

describe('DiagnosticGraphComponent', () => {
  let annotatedDiagnosticReports: AnnotatedDiagnosticReport[];
  const dateRange = Interval.fromDateTimes(
      DateTime.utc(2019, 2, 10), DateTime.utc(2019, 2, 15));

  let component: DiagnosticGraphComponent;

  let dialogComponent: DiagnosticGraphDialogComponent;
  let dialogFixture: ComponentFixture<DiagnosticGraphDialogComponent>;

  let dialog: MatDialog;
  let overlayContainer: OverlayContainer;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [DiagnosticGraphComponent, DiagnosticGraphDialogComponent],
      imports: [
        ChartsModule, MatIconModule, MatDialogModule, BrowserAnimationsModule
      ],
      providers: [
        {provide: UI_CONSTANTS_TOKEN, useValue: UI_CONSTANTS},
        {provide: MatDialogRef, useValue: {}}, {provide: MAT_DIALOG_DATA}
      ]
    });
    TestBed.overrideModule(
        BrowserDynamicTestingModule,
        {set: {entryComponents: [DiagnosticGraphDialogComponent]}});

    component = new StubDiagnosticGraphComponent(dialog, UI_CONSTANTS_TOKEN);

    dialogFixture = TestBed.createComponent(DiagnosticGraphDialogComponent);
    dialogComponent = dialogFixture.componentInstance;

    dialogFixture.detectChanges();

    TestBed.compileComponents();
  }));

  beforeEach(() => {
    annotatedDiagnosticReports = makeDiagnosticReports().map(
        report => new AnnotatedDiagnosticReport(report));

    component.dateRange = dateRange;
    component.data = DiagnosticGraphData.fromDiagnosticReports(
        annotatedDiagnosticReports, TestBed.get(DomSanitizer));
    component.generateChart();
  });

  beforeEach(inject(
      [MatDialog, OverlayContainer], (d: MatDialog, oc: OverlayContainer) => {
        dialog = d;
        overlayContainer = oc;
      }));

  afterEach(() => {
    overlayContainer.ngOnDestroy();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should populate chartData correctly', () => {
    expect(component.chartData.map(d => d.label)).toEqual(['1-RAD', '2-CT']);
  });

  it('should create correct TooltipMap', () => {
    const tooltipMap = component.data.tooltipMap;

    for (const report of annotatedDiagnosticReports) {
      const timestamp = report.timestamp;
      const annotatedTT = tooltipMap.get(timestamp.toMillis().toString())[0];
      expect(annotatedTT.additionalAttachment[0])
          .toEqual(report.attachmentHtml);
    }
  });

  it('should create same id for button and for AnnotatedTooltip', () => {
    const tooltipMap = component.data.tooltipMap;
    for (const report of annotatedDiagnosticReports) {
      const timestamp = report.timestamp;
      const annotatedTT = tooltipMap.get(timestamp.toMillis().toString())[0];
      const id = annotatedTT.id;
      expect(annotatedTT.tooltipChart).toContain(id);
    }
  });

  it('should call openDiagnosticGraphDialog() when button on tooltip is clicked',
     () => {
       const tooltipMap = component.data.tooltipMap;
       const spy = spyOn(component, 'openDiagnosticGraphDialog');
       const tooltipArray = new Array<AnnotatedTooltip>();
       const buttonArray = new Array<HTMLButtonElement>();

       for (const report of annotatedDiagnosticReports) {
         const annotatedTT =
             tooltipMap.get(report.timestamp.toMillis().toString())[0];
         tooltipArray.push(annotatedTT);

         // Creating arbitrary button to test the binding of the
         // openDiagnosticGraphDialog to the buttons
         const button = document.createElement('button');
         button.setAttribute('id', annotatedTT.id);
         overlayContainer.getContainerElement().append(button);
         buttonArray.push(button);
       }

       component.addAdditionalElementTooltip(tooltipArray);
       for (const button of buttonArray) {
         button.click();
         expect(spy).toHaveBeenCalled();
       }
     });

  it('should throw error if there are no buttons ' +
         'when addAdditionalElementTooltip() is called',
     () => {
       const tooltipMap = component.data.tooltipMap;
       const tooltipArray = new Array<AnnotatedTooltip>();

       for (const report of annotatedDiagnosticReports) {
         const annotatedTT =
             tooltipMap.get(report.timestamp.toMillis().toString())[0];
         tooltipArray.push(annotatedTT);
       }
       const uniqueID = tooltipArray[0].id;

       expect(() => {
         component.addAdditionalElementTooltip(tooltipArray);
       })
           .toThrowError(
               `The AnnotatedTooltip does not correspond to ` +
               `any buttons on the tooltip. ID: ${uniqueID}`);
     });

  it('should throw error if AnnotatedTooltip has no id ' +
         'when addAdditionalElementTooltip() is called',
     () => {
       const annotatedTTnoID = new AnnotatedTooltip('tooltipChart test string');
       const tooltipArray = [annotatedTTnoID];

       expect(() => {
         component.addAdditionalElementTooltip(tooltipArray);
       }).toThrowError('AnnotatedTooltip has undefined id');
     });
});
