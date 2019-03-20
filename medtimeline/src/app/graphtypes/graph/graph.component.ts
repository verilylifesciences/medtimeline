// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {AfterViewInit, Input} from '@angular/core';
import {DomSanitizer} from '@angular/platform-browser';
import * as c3 from 'c3';
import * as d3 from 'd3';
import {Color} from 'd3';
import {DateTime} from 'luxon';
import {GraphData} from 'src/app/graphdatatypes/graphdata';
import {LineGraphData} from 'src/app/graphdatatypes/linegraphdata';
import {v4 as uuid} from 'uuid';

import {DisplayGrouping} from '../../clinicalconcepts/display-grouping';
import * as BCHColors from '../../theme/bch_colors';
import {StandardTooltip} from '../tooltips/tooltip';
import {DateTimeXAxis} from './datetimexaxis';
import {RenderedChart} from './renderedchart';
import {RenderedCustomizableChart} from './renderedcustomizablechart';

export enum ChartType {
  SCATTER,
  LINE,
  STEP,
  MICROBIO
}

const BASE_CHART_HEIGHT_PX = 150;
/**
 * The amount of padding to add to the left of the graph. This goes hand in
 * hand with how we choose to wrap the labels in the rendered chart, so if
 * Y_AXIS_TICK_MAX changes, this probably needs to change, too.
 */
const Y_AXIS_LEFT_PADDING = 125;

/**
 * Displays a graph. T is the data type the graph is equipped to display.
 */
export abstract class GraphComponent<T extends GraphData> implements
    AfterViewInit {
  // The x-axis eventlines to display on the chart.
  @Input() eventlines: Array<{[key: string]: number | string}>;
  /**
   * The x-axis to use for the chart.
   */
  @Input() xAxis: DateTimeXAxis;
  @Input() data: T;
  // The y-axis label to display.
  @Input() axisLabel: string;

  // A unique identifier for the element to bind the graph to.
  chartDivId: string;

  // What type of chart this is. Line chart by default.
  chartType: ChartType = ChartType.LINE;

  // Maps for making a custom legend. We assume that the custom legend does not
  // change over the lifetime of this rendered graph.
  private customLegendSet = false;

  // These two variables are different views on the data held in
  // seriesTodisplayGroup. We need to hold them in separate maps for more
  // efficient access during legend interaction.
  readonly displayGroupToSeries = new Map<DisplayGrouping, string[]>();

  // Indicating whether are not there are any data points for the current time
  // interval.
  dataPointsInDateRange: boolean;

  // The rendered chart so that you can apply functions to it.
  protected renderedChart: RenderedChart|RenderedCustomizableChart;

  // The rendered chart's configuration.
  chartConfiguration: c3.ChartConfiguration;

  // The y-axis configuration for the chart.
  yAxisConfig: c3.YAxisConfiguration;

  // A map containing a color for each series displayed on the graph.
  colorsMap: {[key: string]: string} = {};

  // The default chart type for this chart.
  chartTypeString: string;


  constructor(
      readonly sanitizer: DomSanitizer,
      private readonly renderedConstructor:
          (axis: DateTimeXAxis, divId: string) => RenderedChart) {
    // Generate a unique ID for this chart.
    const chartId = uuid();
    // Replace the dashes in the UUID to meet HTML requirements.
    const re = /\-/gi;
    this.chartDivId = 'chart' + chartId.replace(re, '');
  }

  // The chart can't find the element to bind to until after the view is
  // initialized so we need to regenerate the chart here.
  ngAfterViewInit() {
    this.generateFromScratch();
  }

  // If there is not yet a chart or chart configuration, configure and generate
  // the chart to display.
  generateFromScratch() {
    if (this.data && this.xAxis) {
      this.generateChart();
      this.renderedChart =
          this.renderedConstructor(this.xAxis, this.chartDivId);
      this.renderedChart.generate(
          this.chartConfiguration, this.dataPointsInDateRange);
    }
  }

  /**
   * Sets up a generalized c3.ChartConfig for the data passed in. See the
   * type definition at:
   * https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/c3/index.d.ts
   * @param maxXTicks: The maximum number of tick-marks to include on the x-axis
   */
  generateBasicChart(maxXTicks = 10) {
    this.adjustColorMap();
    this.chartTypeString = 'line';

    if (this.chartType === ChartType.SCATTER) {
      this.chartTypeString = 'scatter';
    } else if (this.chartType !== ChartType.LINE) {
      throw Error('Unsupported chart type: ' + this.chartType);
    }

    this.adjustYAxisConfig();
    // Show the y-axis label on the chart.
    this.yAxisConfig['label'] = {
      text: (this.axisLabel ? this.axisLabel : ''),
      position: 'outer-middle'
    };

    const gridlines: any = this.eventlines ? this.eventlines : [];
    const self = this;
    const chartConfiguration = {
      bindto: '#' + this.chartDivId,
      size: {height: BASE_CHART_HEIGHT_PX},
      data: {
        columns: this.data.c3DisplayConfiguration.allColumns,
        xs: this.data.c3DisplayConfiguration.columnMap,
        type: this.chartTypeString,
        colors: this.colorsMap,
      },
      regions: this.data.xRegions,
      axis: {x: this.xAxis.xAxisConfig, y: this.yAxisConfig},
      legend: {show: false},  // There's always a custom legend
      line: {connectNull: false},
      onrendered: function() {
        self.renderedChart.adjustStyle(self.dataPointsInDateRange);
        self.onRendered(this);
      },
      padding: {left: Y_AXIS_LEFT_PADDING},
      grid: {x: {lines: gridlines}},
      tooltip: this.setTooltip()
    };

    this.setCustomLegend(
        this.data.c3DisplayConfiguration.ySeriesLabelToDisplayGroup);
    this.chartConfiguration = chartConfiguration;
  }


  /**
   * Called every time the graph is rendered. If subclass graphs want to do
   * something special upon rendering, they can override this function.
   */
  onRendered(graphObject): void {}

  resetChart() {
    this.renderedChart.resetChart();
  }

  focusOnDisplayGroup(displayGroup: DisplayGrouping) {
    this.renderedChart.focusOnSeries(
        this.displayGroupToSeries.get(displayGroup));
  }

  // If only the data is updated, there is no need to re-configure the chart
  // configurations that stay constant. Instead, just rework the
  // ChartConfiguration's data field.
  updateData() {
    this.chartConfiguration.data = {
      columns: this.data.c3DisplayConfiguration.allColumns,
      xs: this.data.c3DisplayConfiguration.columnMap,
      type: this.chartTypeString,
      colors: this.colorsMap,
    };
  }

  // Adjust the color map for the data belonging to the chart.
  adjustColorMap() {
    for (const key of Object.keys(this.data.c3DisplayConfiguration.columnMap)) {
      if (this.data.c3DisplayConfiguration.ySeriesLabelToDisplayGroup.get(
              key)) {
        const lookupColor: Color =
            this.data.c3DisplayConfiguration.ySeriesLabelToDisplayGroup.get(key)
                .fill;
        this.colorsMap[key] = lookupColor.toString();
      }
    }
  }

  /**
   * Sets the tooltip for the graph.
   * If the class has a tooltipMap set, then we look up the tooltip from that
   * map. If there's no tooltipMap, then we return a simple formatted tooltip
   * of just the string representing the data plus the appropriate units for
   * a linegraph, or just the unedited value if it's a different kind of graph.
   */
  setTooltip(): {} {
    const self = this;
    if (this.data && this.data.tooltipMap) {
      return {
        contents: (
            pointData: any[], defaultTitleFormat, defaultValueFormat,
            color) => {
          // pointData will hold every point for the x-value you're hovering
          // on. We squish together all those data points preemptively in
          // our tooltip creation so that we just find the index of the
          // tooltip based on the first point's x-value.
          const value = pointData[0];
          const timestampKey =
              DateTime.fromJSDate(value.x).toMillis().toString();
          // Our data class may provide a tooltip key function that will
          // get the correct identifier from the data point. If it does,
          // we'll use that, but by default, the key is the timestamp
          // of the data point.
          const keyToUse = this.data.tooltipKeyFn ?
              this.data.tooltipKeyFn(value) :
              timestampKey;
          // If something bad happens and we don't have a tooltip for the
          // key, return an empty string so that there will just be no
          // tooltip.
          if (!this.data.tooltipMap.has(keyToUse)) {
            return new StandardTooltip(
                       pointData, color,
                       self.data instanceof LineGraphData ? self.data.unit : '')
                .getTooltip(undefined, this.sanitizer);
          }
          return this.data.tooltipMap.get(keyToUse);
        }
      };
    } else {
      return {
        format: {
          value: (value, ratio, id, index) => {
            if (self.data instanceof LineGraphData) {
              return (
                  d3.format(',.' + self.data.precision + 'f')(value) + ' ' +
                  self.data.unit);
            }
            return value;
          }
        }
      };
    }
  }

  /**
   * Adds a shaded region on the chart across all x values, between the two
   * y values specified by yBounds.
   * @param basicChart The chart to add the region to
   * @param yBounds The y-bounds of the region to display
   */
  addYRegionOnChart(basicChart: c3.ChartConfiguration, yBounds: [
    number, number
  ]): c3.ChartConfiguration {
    if (!basicChart.axis.y.tick) {
      basicChart.axis.y['tick'] = {};
    }

    basicChart.axis.y.tick['values'] = yBounds;
    if (!basicChart['regions']) {
      basicChart['regions'] = [];
    }
    basicChart['regions'].push({axis: 'y', start: yBounds[0], end: yBounds[1]});
    // Ensure that points outside of the normal range are colored distinctly to
    // match abnormal results.
    // Since a y-region is only added when there is one series on the chart, we
    // do not have to worry about coloring points from different series with the
    // same color.
    if (basicChart.data) {
      basicChart.data.color = function(color, d) {
        return (d.value && (d.value < yBounds[0] || d.value > yBounds[1])) ?
            BCHColors.ABNORMAL.toString() :
            color;
      };
    }
    return basicChart;
  }

  /**
   * Sets a custom legend.
   * To simplify rendering logic, we assume that we only set up a custom legend
   * once over the lifetime of this graph.
   *
   * @param customLegendMap If you want a custom legend grouping multiple series
   *   together, pass a map with keys of
   *   series names and values of the ClinicalConcepts they should correspond
   *   to in a legend.
   */
  setCustomLegend(seriesToDisplayGroup: Map<string, DisplayGrouping>) {
    if (!this.customLegendSet) {
      for (const [seriesLbl, displayGroup] of Array.from(
               seriesToDisplayGroup.entries())) {
        if (!this.displayGroupToSeries.has(displayGroup)) {
          this.displayGroupToSeries.set(displayGroup, new Array(seriesLbl));
        } else {
          const appendedArray =
              this.displayGroupToSeries.get(displayGroup).concat(seriesLbl);
          this.displayGroupToSeries.set(displayGroup, appendedArray);
        }
      }
      this.customLegendSet = true;
    }
  }

  /**
   * Generates the chart specified by the extending class.
   * @param chartHeight The height of the chart in pixels.
   */
  abstract generateChart(chartHeight?: number);

  /**
   * Generates the y-axis configuration for the chart specified by the extending
   * class.
   */
  abstract adjustYAxisConfig();

  /**
   * Adjusts the data-dependent fields of the chart's configuration specified by
   * the extending class.
   */
  abstract adjustDataDependent();
}
