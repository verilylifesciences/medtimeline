// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {Component, forwardRef} from '@angular/core';
import {DomSanitizer} from '@angular/platform-browser';
import * as c3 from 'c3';
import {DateTime} from 'luxon';
import {LineGraphData} from 'src/app/graphdatatypes/linegraphdata';

import {GraphComponent, Y_AXIS_TICK_MAX} from '../graph/graph.component';
import {DiscreteObservationTooltip} from '../tooltips/observation-tooltips';

@Component({
  selector: 'app-linegraph',
  templateUrl: '../graph/graph.component.html',
  styleUrls: ['../graph.css'],
  providers: [
    {provide: GraphComponent, useExisting: forwardRef(() => LineGraphComponent)}
  ]
})
export class LineGraphComponent extends GraphComponent<LineGraphData> {
  constructor(readonly sanitizer: DomSanitizer) {
    super(sanitizer);
  }
  /**
   * @returns the c3.ChartConfiguration object to generate the c3 chart.
   * @override
   */
  generateChart(): c3.ChartConfiguration {
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

    const yAxisConfig: c3.YAxisConfiguration = {
      min,
      max,
      padding: {top: 20, bottom: 20},
      tick: {
        count: 5,
        format: d => {
          // We add padding to our y-axis tick labels so that all y-axes of the
          // charts rendered on the page can be aligned.
          return (d)
              .toLocaleString(
                  'en-us', {minimumFractionDigits: 2, maximumFractionDigits: 2})
              .trim()
              .padStart(Y_AXIS_TICK_MAX, '\xa0');
        }
      },
      label: this.data.unit
    };

    let graph = this.generateBasicChart(yAxisConfig);

    // Some things are only valid if there are y-axis normal bounds. We
    // also only show normal bounds if there's one data series on the
    // axis.
    // These customizations are based on this.data, which is a type specific for
    // LineGraphData, and could not be generalized in the abstract GraphCard
    // class.
    if (this.data.series.length > 0) {
      const yBounds = this.data.series[0].yNormalBounds;
      if (this.data.series.length === 1 && yBounds) {
        graph = this.addYRegionOnChart(graph, yBounds);
      }
    }

    // Check if there are any data points in the time range.
    this.noDataPointsInDateRange =
        !GraphComponent.dataPointsInRange(this.data.series, this.dateRange);

    const self = this;
    // If tick values aren't set, calculate the values.
    if (!graph.axis.y.tick.values) {
      graph.axis.y.tick.values = this.findYAxisValues(
          this.data.yAxisDisplayBounds[0], this.data.yAxisDisplayBounds[1]);
    }

    if (graph.axis.y.tick.values.length === 0) {
      // The dataset is empty. We show padded tick marks to align the y axis
      // with the rest of the charts' axes.
      for (let i = 0; i < 5; i++) {
        graph.axis.y.tick.values.push(i);
      }
    }
    const yValues = graph.axis.y.tick.values;
    const needToWrap =
        yValues.some(value => value.toString().length > Y_AXIS_TICK_MAX);
    // Replace the tick label's initially displayed values to padded strings so
    // that the axis is aligned.
    if (needToWrap) {
      graph.axis.x.tick.format = function(d) {
        return ''.trim().padStart(Y_AXIS_TICK_MAX, '\xa0');
      };
    }
    this.yAxisTickDisplayValues = yValues.map(
        value => value.toLocaleString(
            'en-us', {minimumFractionDigits: 2, maximumFractionDigits: 2}));
    return graph;
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
}
