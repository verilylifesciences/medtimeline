// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {Component, forwardRef, Input} from '@angular/core';
import {DomSanitizer} from '@angular/platform-browser';
import * as c3 from 'c3';
import * as d3 from 'd3';
import {LineGraphData} from 'src/app/graphdatatypes/linegraphdata';

import {GraphComponent, Y_AXIS_TICK_MAX} from '../graph/graph.component';

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
    super(sanitizer);
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
              .trim()
              .padStart(Y_AXIS_TICK_MAX, '\xa0');
        }
      },
    };
  }

  /**
   * Adjusts the data-dependent fields of the chart's configuration.
   */
  adjustDataDependent() {
    // Some things are only valid if there are y-axis normal bounds. We
    // also only show normal bounds if there's one data series on the
    // axis.
    // These customizations are based on this.data, which is a type specific for
    // LineGraphData, and could not be generalized in the abstract GraphCard
    // class.
    if (this.data.series.length > 0) {
      const yBounds = this.data.series[0].yNormalBounds;
      if (this.data.series.length === 1 && yBounds) {
        this.chartConfiguration =
            this.addYRegionOnChart(this.chartConfiguration, yBounds);
      }
    }
    // Check if there are any data points in the time range.
    this.noDataPointsInDateRange =
        !this.data.dataPointsInRange(this.xAxis.dateRange);
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
    const yValues = this.chartConfiguration.axis.y.tick.values;
    const needToWrap =
        yValues.some(value => value.toString().length > Y_AXIS_TICK_MAX);
    // Due to some weird c3 rendering, we need extra padding for tick marks less
    // than 2 characters long.
    const needExtraPadding =
        yValues.every(value => value.toString().length < 2);
    // Replace the tick label's initially displayed values to padded empty
    // strings so that the axis is aligned. We only do this if we need to wrap
    // axis labels in the first place.
    const extraPadding = 4;
    const padding = needToWrap ?
        Y_AXIS_TICK_MAX :
        (needExtraPadding ? Y_AXIS_TICK_MAX + extraPadding : undefined);
    if (padding) {
      this.chartConfiguration.axis.y.tick.format = function(d) {
        return ''.trim().padStart(padding, '\xa0');
      };
      this.yAxisTickDisplayValues =
          yValues.map(value => value.toLocaleString('en-us', {
            minimumFractionDigits: this.data.precision,
            maximumFractionDigits: this.data.precision
          }));
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
  }
}
