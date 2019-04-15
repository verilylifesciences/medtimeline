// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import * as d3 from 'd3';
import {DateTime, Interval} from 'luxon';

import {RenderedChart} from './renderedchart';

/**
 * Represents an already-rendered customizable chart. This provides a lot of
 * the d3 operations for dealing with the customizable timeline.
 */
export class RenderedCustomizableChart extends RenderedChart {
  hoveringOverPoint = false;
  inEditMode = true;
  initialized = false;

  constructor(dateRange: Interval, chartDivId: string) {
    super(dateRange, chartDivId);
  }

  initialize(addPointHandler: (selfCoords: [number, number], parentCoords: [
               number, number
             ]) => any) {
    if (this.initialized) {
      return;
    }
    const self = this;

    /* We need the "any" declaration in order to access the
    internals of the chart without throwing an error. */
    const chart: any = this.generatedChart;

    if (!chart) {
      return;
    }

    // Show a focus line corresponding to the correct x-value when hovering
    // anywhere on the chart.
    chart.internal.main.on('mousemove', function() {
      if (self.inEditMode) {
        const coordinates = d3.mouse(this);
        // Remove all other timestamps
        d3.select(chart.element)
            .select('.c3-xgrid-focus')
            .selectAll('text')
            .remove();
        self.showFocusLine(chart, coordinates);
      }
    });

    // Clear gridlines when not hovering over the chart.
    chart.internal.main.on('mouseout', function() {
      // clear all x-axis gridlines.
      chart.xgrids([]);
      // Remove all other timestamps
      d3.select(chart.element)
          .select('.c3-xgrid-focus')
          .selectAll('text')
          .remove();
    });

    // Logic to add a point when clicking on the chart.
    chart.internal.main.on('click', function() {
      if (self.inEditMode && !self.hoveringOverPoint) {
        const coordinates = d3.mouse(this);
        const parentCoordinates = d3.mouse(document.body);
        addPointHandler(coordinates, parentCoordinates);
      }
    });
    // Send the chart to the back, allowing points to be displayed on top of the
    // axis.
    const chartLayer = d3.select(chart.element).select('.c3-chart');
    const chartLayerNode: any = chartLayer.node();
    const chartLayerParentNode = chartLayerNode.parentNode;
    const removedNode = chartLayer.remove();
    chartLayerParentNode.appendChild(removedNode.node());
    chartLayer.attr('clip-path', null);

    // Don't show the y-axis, but still set values so that the width is adjusted
    // & aligned with other charts.
    d3.select(chart.element).select('.c3-axis-y').style('visibility', 'hidden');
    this.initialized = true;
  }

  loadNewData(columnsToLoad) {
    this.generatedChart.load({columns: columnsToLoad});
  }

  /**
   * Show a focus line with the timestamps when moving the mouse around the
   * chart.
   */
  private showFocusLine(chart: any, coordinates: number[]) {
    const focusEl = d3.select(chart.element).select('line.c3-xgrid-focus');
    focusEl.attr('x1', coordinates[0]);
    focusEl.attr('x2', coordinates[0]);
    const timestamp =
        DateTime.fromJSDate(chart.internal.x.invert(coordinates[0]));
    // See time on hover
    d3.select(chart.element)
        .select('g.c3-xgrid-focus')
        .append('text')
        .attr('text-anchor', 'end')
        .attr('transform', 'rotate(-90)')
        .attr('x', 0)
        .attr('y', coordinates[0])
        .attr('dx', -4)
        .attr('dy', -5)
        .style('opacity', 1)
        .text(
            timestamp.toLocal().toLocaleString() + ' ' +
            timestamp.toLocal().toLocaleString(DateTime.TIME_24_SIMPLE));
  }

  /**
   * Translates the x-axis position to its corresponding timestamp.
   */
  getClickCoordinate(clickX: number): DateTime {
    return (this.generatedChart as any).internal.x.invert(clickX);
  }

  /**
   * Inserts the initial div for the tooltip.
   */
  insertInitialTooltip(millis: number): [any, string] {
    const chart: any = this.generatedChart;
    const xCoordinate = chart.internal.x(millis) + '';

    return [
      chart.internal.selectChart.style('position', 'relative')
          .append('div')
          .attr('class', 'tooltip-whole-' + millis),
      xCoordinate
    ];
  }
}
