// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {Component, forwardRef} from '@angular/core';
import {DomSanitizer} from '@angular/platform-browser';
import {MicrobioGraphData} from 'src/app/graphdatatypes/microbiographdata';
import * as wordwrap from 'wordwrap';

import {StepGraphData} from '../../graphdatatypes/stepgraphdata';
import {GraphComponent} from '../graph/graph.component';

@Component({
  selector: 'app-stepgraph',
  templateUrl: '../graph/graph.component.html',
  styleUrls: ['../graph.css'],
  providers: [
    {provide: GraphComponent, useExisting: forwardRef(() => StepGraphComponent)}
  ]
})
export class StepGraphComponent extends
    GraphComponent<StepGraphData|MicrobioGraphData> {
  constructor(readonly sanitizer: DomSanitizer) {
    super(sanitizer);
  }
  /**
   * The maximum characters for a y-axis tick label.
   */
  readonly Y_AXIS_TICK_MAX_LENGTH = 15;

  /**
   * Adjusts the y-axis configuration for the chart.
   */
  prepareForChartConfiguration() {
    this.chartOptions.scales.yAxes[0].type = 'category';

    // Set up the data points.
    const s = [];
    const yValuesForEndpoints = [];
    for (const series of this.data.endpointSeries) {
      s.push({
        data: series.coordinates.map(pt => {
          const lines =
              wordwrap(this.Y_AXIS_TICK_MAX_LENGTH)(pt[1]).split('\n');
          const truncatedLabel = lines[0] + (lines.length > 1 ? '...' : '');
          yValuesForEndpoints.push(truncatedLabel);
          return {x: pt[0].toISO(), y: truncatedLabel};
        }),
        label: series.label,
        // Do not fill the area under the line.
        fill: false
      });
      this.chartColors.push({
        backgroundColor: series.legendInfo.fill,
        borderColor: series.legendInfo.fill,
        pointBackgroundColor: series.legendInfo.fill,
        pointBorderColor: series.legendInfo.outline,
      });
    }
    if (s.length > 0) {
      this.chartData = s;
    }

    // Set the categorical labels for the y-axis.
    const allYValues =
        this.data.dataSeries.map(series => series.coordinates.map(c => c[1]))
            .reduce((p, n) => p.concat(n), [])
            .concat(yValuesForEndpoints);

    // Word wrap all the y-text so that it doesn't have problems.
    const allLabels = Array.from(new Set(allYValues));
    // Add blank labels to the top and bottom of the graph to add some padding.
    allLabels.push('\t');
    allLabels.unshift('\t');

    this.chartOptions.scales.yAxes[0]['labels'] = allLabels;
  }

  adjustGeneratedChartConfiguration() {}
}
