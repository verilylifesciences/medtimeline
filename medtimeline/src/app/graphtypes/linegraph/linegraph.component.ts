// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {Component, forwardRef, Input} from '@angular/core';
import {DomSanitizer} from '@angular/platform-browser';
import * as d3 from 'd3';
import {LineGraphData} from 'src/app/graphdatatypes/linegraphdata';

import {GraphComponent} from '../graph/graph.component';
import {RenderedChart} from '../graph/renderedchart';

@Component({
  selector: 'app-linegraph',
  templateUrl: '../graph/graph.component.html',
  styleUrls: ['../graph.css'],
  providers: [
    {provide: GraphComponent, useExisting: forwardRef(() => LineGraphComponent)}
  ]
})
export class LineGraphComponent extends GraphComponent<LineGraphData> {
  @Input() showTicks: boolean;

  constructor(readonly sanitizer: DomSanitizer) {
    super(sanitizer, (axis, id) => new RenderedChart(axis, id));
  }
  /**
   * @override
   */
  generateChart() {
    this.adjustYAxisConfig();
    this.generateBasicChart();
    this.adjustDataDependent();

    // Ensure that a line is not drawn through points with "null" values.
    this.chartConfiguration.line = {connectNull: false};
  }

  /**
   * Adjusts the y-axis configuration for the chart.
   */
  adjustYAxisConfig() {
    // Give labels to each series and make a map of x-values to y-values.
    let min;
    let max;
    if (this.data.yAxisDisplayBounds[0] > this.data.yAxisDisplayBounds[1]) {
      // No min or max set due to no data.
      min = 0;
      max = 10;
    } else {
      min = this.data.yAxisDisplayBounds[0];
      max = this.data.yAxisDisplayBounds[1];
    }

    this.yAxisConfig = {
      min: min,
      max: max,
      padding: {top: 20, bottom: 20},
      tick: {
        count: 5,
        format: d => {
          // We add padding to our y-axis tick labels so that all y-axes of the
          // charts rendered on the page can be aligned.
          return (d)
              .toLocaleString('en-us', {
                minimumFractionDigits: this.data.precision,
                maximumFractionDigits: this.data.precision
              })
              .trim();
        }
      },
    };
  }

  /**
   * Adjusts the data-dependent fields of the chart's configuration.
   */
  adjustDataDependent() {
    // Check if there are any data points in the time range.
    this.dataPointsInDateRange =
        this.data.dataPointsInRange(this.xAxis.dateRange);
    // If tick values aren't set, calculate the values.
    if (!this.chartConfiguration.axis.y.tick.values) {
      this.chartConfiguration.axis.y.tick.values = this.findYAxisValues(
          this.data.yAxisDisplayBounds[0], this.data.yAxisDisplayBounds[1]);
    }

    if (this.chartConfiguration.axis.y.tick.values.length === 0) {
      // The dataset is empty. We show padded tick marks to align the y axis
      // with the rest of the charts' axes.
      for (let i = 0; i < 5; i++) {
        this.chartConfiguration.axis.y.tick.values.push(i);
      }
    }
  }

  // Manually find y axis tick values based on the min and max display bounds.
  private findYAxisValues(min: number, max: number): number[] {
    // Evenly space out 5 numbers between the min and max (display bounds).
    const difference = max - min;
    const spacing = difference / 4;
    const values = [];
    for (let curr = min; curr <= max; curr += spacing) {
      values.push(curr);
    }
    return values;
  }

  onRendered() {
    if (!this.showTicks) {
      d3.select('#' + this.chartDivId)
          .selectAll('.c3-axis-y .tick')
          .style('display', 'none');
    }
    this.addYNormalRange();
  }

  /**
   * Adds y normal ranges to the graph.
   */
  private addYNormalRange() {
    // Only LineGraphData has y normal bounds.
    if (!(this.data instanceof LineGraphData)) {
      return;
    }
    // If there's more than one series on this graph we don't mark a normal
    // region because they might not be the same.
    if (this.data.series.length !== 1) {
      return;
    }
    const yBounds = this.data.series[0].yNormalBounds;
    // If there aren't bounds, there's nothing to add.
    if (!yBounds) {
      return;
    }

    const self = this;
    this.renderedChart.addToRenderQueue(() => {
      self.renderedChart.setYNormalBoundMarkers(yBounds);
    });
    this.renderedChart.addToRenderQueue(() => {
      self.renderedChart.addYRegion(
          {axis: 'y', start: yBounds[0], end: yBounds[1]});
    });
  }
}
