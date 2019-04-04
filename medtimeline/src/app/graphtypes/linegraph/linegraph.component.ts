// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {Component, forwardRef, Input} from '@angular/core';
import {DomSanitizer} from '@angular/platform-browser';
import * as d3 from 'd3';
import {LineGraphData} from 'src/app/graphdatatypes/linegraphdata';
import {ABNORMAL} from 'src/app/theme/bch_colors';

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
    this.generateBasicChart();
    this.adjustDataDependent();

    // Ensure that a line is not drawn through points with "null" values.
    this.chartConfiguration.line = {connectNull: false};
  }

  prepareForChartConfiguration() {
    if (this.data.yAxisDisplayBounds) {
      this.yAxisConfig.min = this.data.yAxisDisplayBounds[0];
      this.yAxisConfig.max = this.data.yAxisDisplayBounds[1];
    }
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

    if (this.data.yAxisDisplayBounds) {
      this.yAxisConfig.min = this.data.yAxisDisplayBounds[0];
      this.yAxisConfig.max = this.data.yAxisDisplayBounds[1];
    }

    // If there's just one data series and it has normal bounds, let the colors
    // get set for abnormal points in the series.
    if (this.data.series.length === 1 && this.data.series[0].yNormalBounds) {
      this.chartConfiguration.data.color = (color, d) => {
        return (d.value !== undefined &&
                (d.value < this.data.series[0].yNormalBounds[0] ||
                 d.value > this.data.series[0].yNormalBounds[1])) ?
            ABNORMAL.toString() :
            color;
      };
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
