// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {Component, forwardRef, Inject} from '@angular/core';
import {DomSanitizer} from '@angular/platform-browser';
import {UI_CONSTANTS_TOKEN} from 'src/constants';

import {DiagnosticGraphData} from '../../graphdatatypes/diagnosticgraphdata';
import {MicrobioGraphData} from '../../graphdatatypes/microbiographdata';
import {StepGraphData} from '../../graphdatatypes/stepgraphdata';
import {GraphComponent} from '../graph/graph.component';

@Component({
  selector: 'app-stepgraph',
  templateUrl: './stepgraph.component.html',
  styleUrls: ['../graph.css'],
  providers: [
    {provide: GraphComponent, useExisting: forwardRef(() => StepGraphComponent)}
  ]
})
export class StepGraphComponent extends
    GraphComponent<StepGraphData|MicrobioGraphData|DiagnosticGraphData> {
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
   * Splits long tick names into multiple lines.
   *
   * To split a label into multiple lines, we turn a string into an array of
   * strings - each gets their own line when rendered.
   *
   * At most will return 2 lines so that the graph labels do not get too
   * crowded.
   *
   * @param ticks Array of current tick markings.
   */
  adjustTickLabels(ticks: string[]): string[][] {
    return ticks.map(tick => {
      const words = tick.split(' ');
      // keeps track of the resulting array corresponding to the label.
      let resultLabel = [];
      // keeps track of the current line we are building.
      let temp = '';
      for (const word of words) {
        // if adding the new word makes the line go over the max line length,
        // we add the temp line to the list of results and restart the temp
        // string with the word.
        if ((temp + word).length > this.Y_AXIS_TICK_MAX_LENGTH) {
          if (temp.length > 0) {
            resultLabel.push(temp);
          }
          temp = word;
        } else {
          temp = temp.length > 0 ? temp + ' ' + word : word;
        }
      }
      // at the end, we push the remaining line to the result.
      if (temp.length > 0) {
        resultLabel.push(temp);
      }

      // in the case that the result label will be more than 2 lines, we only
      // return the first 2 lines so that the graph is not too crowded.
      if (resultLabel.length > 2) {
        resultLabel = resultLabel.splice(0, 2);
        resultLabel[1] += '...';
      }
      return resultLabel;
    });
  }

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
    const allLabelsSet = new Set<string>();
    for (const series of this.data.series) {
      series.coordinates.forEach(pt => {
        allLabelsSet.add(pt[1] as string);
      });
    }
    // Show the labels alphabetically along the y-axis.
    const allLabels = Array.from(allLabelsSet).sort();
    // Add blank labels to the top and bottom of the graph to add some
    // padding.
    allLabels.push('\t');
    allLabels.unshift('\t');
    this.chartOptions.scales.yAxes[0]['labels'] = allLabels;

    // the tick labels as is may be very long so we need to adjust them
    // before they turn into labels. We do this as a callback so that the
    // mapping from data points to the axis still works without adjustment.
    this.chartOptions.scales.yAxes[0].beforeTickToLabelConversion = (scale) => {
      scale.ticks = this.adjustTickLabels(scale.ticks);
      // based on the number of ticks, update the height of the graph
      const height = Math.max(125, (scale.ticks.length) * 35);
      scale.chart.canvas.parentNode.style.height = height + 'px';
    };
  }
  adjustGeneratedChartConfiguration() {}
}
