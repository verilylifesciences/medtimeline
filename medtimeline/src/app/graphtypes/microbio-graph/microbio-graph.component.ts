// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {Component, forwardRef} from '@angular/core';
import {DomSanitizer} from '@angular/platform-browser';
import * as d3 from 'd3';
import {DateTime} from 'luxon';
import {DisplayGrouping, negFinalMB, negPrelimMB, posFinalMB, posPrelimMB} from 'src/app/clinicalconcepts/display-grouping';
import {DiagnosticReportStatus} from 'src/app/fhir-data-classes/diagnostic-report';
import {CHECK_RESULT_CODE, NEG_CODE, NEGFLORA_CODE} from 'src/app/fhir-data-classes/observation-interpretation-valueset';

import {GraphComponent} from '../graph/graph.component';
import {StepGraphComponent} from '../stepgraph/stepgraph.component';
import {MicrobioTooltip} from '../tooltips/microbio-tooltips';

@Component({
  selector: 'app-microbio-graph',
  templateUrl: '../graph/graph.component.html',
  // TODO(b/117575935): These styles need to be extracted and generalized
  styleUrls: ['../../cardtypes/cardstyles.css'],
  providers: [{
    provide: GraphComponent,
    useExisting: forwardRef(() => MicrobioGraphComponent)
  }]
})
export class MicrobioGraphComponent extends StepGraphComponent {
  constructor(private microbioSanitizer: DomSanitizer) {
    super(microbioSanitizer);
  }


  /**
   * @returns the c3.ChartConfiguration object to generate the c3 chart.
   * @override
   */
  generateChart(): c3.ChartConfiguration {
    const self = this;
    const graph = super.generateChart();
    graph.tooltip = {
      contents: (d, defaultTitleFormat, defaultValueFormat, color) => {
        for (const value of d) {
          const reportId = value.id.substr(0, value.id.indexOf('-'));
          const report: any = self.data.idMap.get(reportId);
          if (report) {
            return new MicrobioTooltip(
                       report, DateTime.fromJSDate(value.x),
                       this.microbioSanitizer)
                .getTooltip();
          }
        }
        return null;
      }
    };
    graph.data.type = 'scatter';
    graph.point = {r: 5};
    return graph;
  }

  /**
   * Every time the graph is rendered, go back and find all the preliminary
   * points and make sure their fill is transparent and there is a border
   * around it.
   */
  onRendered(graphObject) {
    // Apply colors. This will be handled better when we work on the legends.
    const posCircles: d3.Selection<any, any, any, any> =
        graphObject.getCircles()
            .filter((d) => {
              return d.id.includes(CHECK_RESULT_CODE);
            })
            .style('fill', posFinalMB.color.toString());
    const negCircles: d3.Selection<any, any, any, any> =
        graphObject.getCircles()
            .filter((d) => {
              return !d.id.includes(CHECK_RESULT_CODE);
            })
            .style('fill', negFinalMB.color.toString());

    // Make prelim circles transparent-filled.
    const prelimCircles: d3.Selection<any, any, any, any> =
        graphObject.getCircles()
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
        .style('stroke', posPrelimMB.color.toString());
    prelimCircles
        .filter((d) => {
          return !d.id.includes(CHECK_RESULT_CODE);
        })
        .style('stroke', negPrelimMB.color.toString());
  }

  // Toggle the display of various points on the chart, and style various points
  // based on report status. This method is called after the user clicks on a
  // particular displayGroup in the legend.
  toggleDisplayGroup(displayGroup: DisplayGrouping) {
    this.chart.toggle(this.displayGroupToSeries.get(displayGroup));
    this.wrapYAxisLabels();
  }
}
