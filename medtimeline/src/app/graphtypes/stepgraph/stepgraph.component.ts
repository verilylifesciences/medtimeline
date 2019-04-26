// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {Component, forwardRef, Inject} from '@angular/core';
import {DomSanitizer} from '@angular/platform-browser';
import {MicrobioGraphData} from 'src/app/graphdatatypes/microbiographdata';
import {UI_CONSTANTS_TOKEN} from 'src/constants';
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
  constructor(
      readonly sanitizer: DomSanitizer,
      @Inject(UI_CONSTANTS_TOKEN) readonly uiConstants: any) {
    super(sanitizer, uiConstants);
  }
  /**
   * The maximum characters for a y-axis tick label.
   */
  readonly Y_AXIS_TICK_MAX_LENGTH = 12;

  /**
   * Adjusts the y-axis configuration for the chart.
   */
  prepareForChartConfiguration() {
    this.chartOptions.scales.yAxes[0].type = 'category';
    this.chartOptions.scales.yAxes[0].gridLines = {
      display: true,
      drawOnChartArea: true
    };

    // Set up the data points.
    const yValuesForEndpoints = [];
    for (const series of this.data.series) {
      // Since the categorical labels may be long, we truncate the label names.
      // We also have to re-map the coordinates to the truncated names so
      // that they may be plotted correctly along the categorical axis.
      series.coordinates.forEach(pt => {
        const lines = wordwrap(this.Y_AXIS_TICK_MAX_LENGTH)(pt[1]).split('\n');
        const truncatedLabel = lines[0] + (lines.length > 1 ? '...' : '');
        yValuesForEndpoints.push(truncatedLabel);
        pt[1] = truncatedLabel;
      });
    }
    let allLabels = Array.from(new Set(yValuesForEndpoints));
    // Show the labels alphabetically along the y-axis.
    allLabels = allLabels.sort();
    // Add blank labels to the top and bottom of the graph to add some padding.
    allLabels.push('\t');
    allLabels.unshift('\t');

    this.chartOptions.scales.yAxes[0]['labels'] = allLabels;
  }
  adjustGeneratedChartConfiguration() {}
}
