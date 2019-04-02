// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import * as c3 from 'c3';
import * as d3 from 'd3';
import * as wordwrap from 'wordwrap';

import {DateTimeXAxis} from './datetimexaxis';

/**
 * The maximum characters for a y-axis tick label.
 */
export const Y_AXIS_TICK_MAX = 15;

/**
 * This class holds an already-rendered chart and the operations that take place
 * on the chart after it is rendered.
 */
export class RenderedChart {
  protected generatedChart: c3.ChartAPI;
  private yAxisAlreadyWrapped = false;

  constructor(
      private readonly xAxis: DateTimeXAxis, private readonly chartDivId) {}


  generate(configuration: c3.ChartConfiguration, dataPointsInRange: boolean) {
    this.generatedChart = c3.generate(configuration);
    this.adjustStyle(dataPointsInRange);
  }

  focusOnSeries(toHighlight: string[]) {
    this.generatedChart.focus(toHighlight);
  }

  resetChart() {
    this.generatedChart.revert();
  }

  /**
   * Called after some, or all, parts of the chart are changed, to ensure that
   * the style stays.
   */
  adjustStyle(dataPointsInRange: boolean) {
    if (!dataPointsInRange) {
      this.showNoData();
    }
    this.wrapYAxisLabels();
    this.boldDates();
    this.fixOpacity();
  }

  /**
   * Add an overlay indicating that there are no data points in the date range.
   */
  private showNoData() {
    const emptyContainer =
        d3.select('#' + this.chartDivId).select('.c3-text.c3-empty');
    emptyContainer.text(
        'No data for ' + this.xAxis.dateRange.start.toLocaleString() + '-' +
        this.xAxis.dateRange.end.toLocaleString());
    emptyContainer.attr('class', 'c3-text c3-empty noData');
    // We set the opacity of the y-axis ticks of empty charts to 0 after
    // setting the tick values. We do this instead of not displaying the
    // y-axis altogether to ensure that the left padding of the chart is
    // aligned with all other charts.
    const yAxisTicks = d3.select('#' + this.chartDivId)
                           .selectAll('.c3-axis-y')
                           .selectAll('.tick')
                           .style('opacity', 0);
  }

  /**
   * Inserts wrapped y-axis tick labels.
   */
  private wrapYAxisLabels() {
    if (this.yAxisAlreadyWrapped) {
      return;
    }
    this.yAxisAlreadyWrapped = true;
    d3.select('#' + this.chartDivId)
        .selectAll('.c3-axis-y')
        .selectAll('.tick text')
        .each(function() {
          // Get the text element.
          const labelElement = d3.select(this);
          const lines =
              wordwrap(Y_AXIS_TICK_MAX)(d3.select(this).text()).split(/\n/);
          // let tspan = labelElement;
          const lineHeight = 10;
          // startDy is an attribute indicating how much to shift the first
          // line of the label by in the y direction. The standard dy for a
          // tick text is 3. Figure out the optimal starting dy such that half
          // of the words are displayed above the tick, and half below.
          const dyInterval = 7;
          const startDy = 3 - (Math.floor(lines.length / 2) * dyInterval);
          let tspan =
              labelElement.text(null).append('tspan').attr('x', -9).attr(
                  'dy', startDy);
          // Append a new tspan for each line of the label.
          for (const line of lines) {
            tspan.text(line);
            tspan = labelElement.append('tspan').attr('x', -9).attr(
                'dy', lineHeight);
          }
        });
  }

  /**
   * Bolds the date portion of each x-axis tick label, and removes unnecessary
   * labels.
   */
  private boldDates() {
    const self = this;
    d3.select('#' + this.chartDivId)
        .selectAll('.c3-axis-x')
        .selectAll('.tick text')
        .each(function() {
          // We get x (the x position), dy (how much to shift vertically), and
          // dx (how much to shift horiztontally) of the tspan inside text
          const dy = d3.select(this).select('tspan').attr('dy');
          const dx = d3.select(this).select('tspan').attr('dx');
          const x = d3.select(this).select('tspan').attr('x');
          const textSplit = d3.select(this).text().split(' ');
          const text = d3.select(this).text();
          const tspan = d3.select(this)
                            .text(null)
                            .append('tspan')
                            .attr('x', x)
                            .attr('dx', dx)
                            .attr('dy', dy)
                            .style('font-weight', 'bolder');
          // Only add the tick label text if it was meant to be
          // displayed.
          if (self.xAxis.xAxisLabels.length > 0 &&
              self.xAxis.xAxisLabels.includes(text)) {
            tspan.text(
                textSplit[0]);  // Set the 'bold' tspan's content as the date.
            d3.select(this).append('tspan').text(
                ' ' + textSplit[1]);  // Add an additional tspan for the time.
          }
        });
  }

  /**
   * Let all points show with full opacity.
   */
  private fixOpacity() {
    d3.select('#' + this.chartDivId).selectAll('.c3-circle').each(function(d) {
      if (d3.select(this).style('opacity') === '0.5') {
        d3.select(this).style('opacity', 1);
      }
    });
  }

  /**
   * Update to show event lines on the rendered chart.
   */
  updateEventlines(eventLines) {
    this.generatedChart.xgrids(eventLines.currentValue);
  }
}
