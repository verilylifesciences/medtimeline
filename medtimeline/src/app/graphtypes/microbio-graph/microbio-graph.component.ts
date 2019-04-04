// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {Component, forwardRef} from '@angular/core';
import {DomSanitizer} from '@angular/platform-browser';
import * as d3 from 'd3';
import {negFinalMB, negPrelimMB, posFinalMB, posPrelimMB} from 'src/app/clinicalconcepts/display-grouping';
import {DiagnosticReportStatus} from 'src/app/fhir-data-classes/diagnostic-report';
import {CHECK_RESULT_CODE} from 'src/app/fhir-data-classes/observation-interpretation-valueset';

import {GraphComponent} from '../graph/graph.component';
import {StepGraphComponent} from '../stepgraph/stepgraph.component';

@Component({
  selector: 'app-microbio-graph',
  templateUrl: '../graph/graph.component.html',
  styleUrls: ['../graph.css'],
  providers: [{
    provide: GraphComponent,
    useExisting: forwardRef(() => MicrobioGraphComponent)
  }]
})
export class MicrobioGraphComponent extends StepGraphComponent {
  constructor(sanitizer: DomSanitizer) {
    super(sanitizer);
  }

  adjustGeneratedChartConfiguration() {
    super.adjustGeneratedChartConfiguration();
    this.chartConfiguration.data.type = 'scatter';
    this.chartConfiguration.point = {r: 5};
  }

  /**
   * Every time the graph is rendered, go back and find all the preliminary
   * points and make sure their fill is transparent and there is a border
   * around it.
   */
  onRendered() {
    const circles: d3.Selection<any, any, any, any> =
        d3.select('#' + this.chartDivId).selectAll('.c3-target');
    const posCircles: d3.Selection<any, any, any, any> =
        circles
            .filter((d) => {
              return d.id.includes(CHECK_RESULT_CODE);
            })
            .style('fill', posFinalMB.fill.toString());
    const negCircles: d3.Selection<any, any, any, any> =
        circles
            .filter((d) => {
              return !d.id.includes(CHECK_RESULT_CODE);
            })
            .style('fill', negFinalMB.fill.toString());

    // Make prelim circles transparent-filled.
    const prelimCircles: d3.Selection<any, any, any, any> =
        circles
            .filter((d) => {
              return d.id.includes(
                  DiagnosticReportStatus.Preliminary.toString());
            })
            .style('fill', 'transparent')
            .style('stroke-width', '2px');
    prelimCircles
        .filter((d) => {
          return d.id.includes(CHECK_RESULT_CODE);
        })
        .style('stroke', posPrelimMB.outline.toString());
    prelimCircles
        .filter((d) => {
          return !d.id.includes(CHECK_RESULT_CODE);
        })
        .style('stroke', negPrelimMB.outline.toString());
    circles.style('opacity', 1);
  }
}
