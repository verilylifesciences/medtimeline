// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {async, ComponentFixture, TestBed} from '@angular/core/testing';
import {DomSanitizer} from '@angular/platform-browser';
import * as d3 from 'd3';
import {negFinalMB, posFinalMB} from 'src/app/clinicalconcepts/display-grouping';
import {DiagnosticReportStatus} from 'src/app/fhir-data-classes/diagnostic-report';
import {CHECK_RESULT_CODE, NEGFLORA_CODE} from 'src/app/fhir-data-classes/observation-interpretation-valueset';

import {MicrobioGraphComponent} from './microbio-graph.component';

describe('MicrobioGraphComponent', () => {
  let component: MicrobioGraphComponent;
  let fixture: ComponentFixture<MicrobioGraphComponent>;

  beforeEach(async(() => {
    TestBed
        .configureTestingModule(
            {declarations: [MicrobioGraphComponent], providers: [DomSanitizer]})
        .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MicrobioGraphComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO(b/129973741): fix these tests and re-enable
  xit('should color positive and negative point fills correctly', () => {
    const jsonCircles = [
      {
        'x_axis': 30,
        'y_axis': 30,
        'radius': 20,
        'color': 'green',
        id: CHECK_RESULT_CODE
      },
      {
        'x_axis': 70,
        'y_axis': 70,
        'radius': 20,
        'color': 'purple',
        id: NEGFLORA_CODE
      },
    ];

    const container =
        d3.select('body').append('svg').attr('width', 200).attr('height', 200);
    container.attr('id', component.chartDivId);

    const c = container.selectAll('circle')
                  .data(jsonCircles)
                  .enter()
                  .append('circle');

    component.onRendered();

    const circles = container.selectAll('circle');
    expect(circles
               .filter(function(d, i) {
                 return i === 0;
               })
               .style('fill'))
        .toEqual(posFinalMB.fill.toString());
    expect(circles
               .filter(function(d, i) {
                 return i === 1;
               })
               .style('fill'))
        .toEqual(negFinalMB.fill.toString());

    expect(component).toBeTruthy();
  });

  // TODO(b/129973741): fix these tests and re-enable
  xit('should have no fill and only stroke for preliminary points', () => {
    const jsonCircles = [
      {
        'x_axis': 30,
        'y_axis': 30,
        'radius': 20,
        'color': 'green',
        id: CHECK_RESULT_CODE + DiagnosticReportStatus.Preliminary.toString()
      },
      {
        'x_axis': 70,
        'y_axis': 70,
        'radius': 20,
        'color': 'purple',
        id: NEGFLORA_CODE + DiagnosticReportStatus.Preliminary.toString()
      },
    ];

    const container =
        d3.select('body').append('svg').attr('width', 200).attr('height', 200);
    container.attr('id', component.chartDivId);

    const c = container.selectAll('circle')
                  .data(jsonCircles)
                  .enter()
                  .append('circle');

    component.onRendered();

    const circles = container.selectAll('circle');
    const posPrelim = circles.filter(function(d, i) {
      return i === 0;
    });
    expect(posPrelim.style('fill')).toEqual('transparent');
    expect(posPrelim.style('stroke')).toEqual(posFinalMB.fill.toString());


    const negPrelim = circles.filter(function(d, i) {
      return i === 1;
    });
    expect(negPrelim.style('fill')).toEqual('transparent');

    expect(negPrelim.style('stroke')).toEqual(negFinalMB.fill.toString());

    expect(component).toBeTruthy();
  });
});
