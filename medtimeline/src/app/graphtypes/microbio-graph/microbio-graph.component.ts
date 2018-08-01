// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {Component, forwardRef} from '@angular/core';
import {DomSanitizer} from '@angular/platform-browser';
import * as d3 from 'd3';
import {DateTime} from 'luxon';
import {DisplayGrouping} from 'src/app/clinicalconcepts/display-grouping';
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
    graph.data.color = function(color, d) {
      // Set the color as red if the interpretation is "check result", and
      // set as blue if "negative". For all other interpretations, set as grey.
      let setColor;
      // TODO(b/122263182): Make a constants file that holds colors
      // corresponding to various Observation interpretations.
      if (d.id.includes(CHECK_RESULT_CODE)) {
        setColor = 'red';
      } else if (d.id.includes(NEGFLORA_CODE) || d.id.includes(NEG_CODE)) {
        setColor = 'blue';
      } else {
        setColor = 'grey';
      }
      // Set the stroke color for the points corresponding to this series,
      // in case they are open circles.
      const point = d3.select('#' + self.chartDivId)
                        .select('.c3-circles-' + d.id)
                        .selectAll('circle')
                        .style('stroke', setColor);
      return setColor;
    };
    // This allows for the styling of various points to remain constant after
    // legend manipulation.
    graph.transition = {duration: null};
    return graph;
  }

  regenerateChart() {
    super.regenerateChart();

    if (this.data) {
      if (this.data.seriesToDisplayGroup) {
        this.setCustomLegend(this.data.seriesToDisplayGroup);
      }
      this.stylePrelimPoints();
    }
  }

  // Set the style of the points (open or closed circle) based on the status
  // of the report each point corresponds to.
  private stylePrelimPoints() {
    for (const reportId of Array.from(this.data.idMap.keys())) {
      const report: any = this.data.idMap.get(reportId);
      const status = report.status;
      // We only style the point differently if the status of the report is
      // preliminary.
      const className = 'c3-circles-' + reportId;
      if (status === DiagnosticReportStatus.Preliminary) {
        d3.select('#' + this.chartDivId)
            .select('[class*=' + className + ']')
            .selectAll('circle')
            .style('stroke-width', '2px')
            .style('fill', 'transparent');
      }
    }
  }

  // Toggle the display of various points on the chart, and style various points
  // based on report status. This method is called after the user clicks on a
  // particular displayGroup in the legend.
  toggleDisplayGroup(displayGroup: DisplayGrouping) {
    this.chart.toggle(this.displayGroupToSeries.get(displayGroup));
    this.wrapYAxisLabels();
    this.stylePrelimPoints();
  }
}
