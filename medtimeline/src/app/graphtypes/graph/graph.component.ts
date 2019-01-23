// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {AfterViewInit, Input, OnChanges, SimpleChanges} from '@angular/core';
import * as c3 from 'c3';
import * as d3 from 'd3';
import {DateTime, Interval} from 'luxon';
import {GraphData} from 'src/app/graphdatatypes/graphdata';
import {LabeledSeries} from 'src/app/graphdatatypes/labeled-series';
import {v4 as uuid} from 'uuid';

import {DisplayGrouping} from '../../clinicalconcepts/display-grouping';
import {getDaysInRange} from '../../date_utils';
import * as Colors from '../../theme/bch_colors';

export enum ChartType {
  SCATTER,
  LINE,
  STEP,
  MICROBIO
}

const BASE_CHART_HEIGHT_PX = 150;

// The maximum characters for a y-axis tick label.
export const Y_AXIS_TICK_MAX = 12;

export class DisplayConfiguration {
  constructor(
      /**
       * These columns feed in to c3 as data. Each item in allColumns is
       * an array of data. The first entry is the series label and the following
       * entries are the data for that series.
       */

      readonly allColumns: any[],
      /**
       * The keys of this map are the name of the y-series as stored in
       * allColumns, and the values are their corresponding x-series names.
       */
      readonly columnMap: {},
      /**
       * Maps y-series names (keys) to DisplayGroupings.
       */
      readonly ySeriesLabelToDisplayGroup: Map<string, DisplayGrouping>) {};
}

/**
 * Displays a graph. T is the data type the graph is equipped to display.
 */
export abstract class GraphComponent<T extends GraphData> implements
    OnChanges, AfterViewInit {
  // Over which time interval the card should display data
  @Input() dateRange: Interval;
  @Input() data: T;

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
  noDataPointsInDateRange: boolean;

  // The rendered chart so that you can apply functions to it.
  chart: c3.ChartAPI;

  // We hold the values of yAxis tick labels and set the values as empty strings
  // during setup, so that the y axis does not get shifted while getting
  // displayed.
  yAxisTickDisplayValues: string[];

  constructor() {
    // Generate a unique ID for this chart.
    const chartId = uuid();
    // Replace the dashes in the UUID to meet HTML requirements.
    const re = /\-/gi;
    this.chartDivId = 'chart' + chartId.replace(re, '');
  }


  /*
   * Sets up the column map and list of columns to use while generating the c3
   * chart.
   * @param data The GraphData to use while making the columns and column map.
   */
  static generateColumnMapping(data: GraphData): DisplayConfiguration {
    // Give labels to each series and make a map of x-values to y-values.
    const allColumns: any[][] = [];
    const columnMap = {};
    const ySeriesLabelToDisplayGroup = new Map<string, DisplayGrouping>();
    for (const s of data.series) {
      allColumns.push(
          new Array<string|DateTime>('x_' + s.label).concat(s.xValues));
      allColumns.push(new Array<string|number>(s.label).concat(s.yValues));
      columnMap[s.label] = 'x_' + s.label;

      // If there's legend information present, set it in the configuration.
      if (data.seriesToDisplayGroup) {
        ySeriesLabelToDisplayGroup.set(
            s.label, data.seriesToDisplayGroup.get(s));
      }
    }
    // If there is no data, we add a "dummy" data point to still display the
    // x-axis.
    if (allColumns.length < 1) {
      // Add a data point to still show the x-axis.
      // This date is the earliest possible date: Tuesday, April 20th, 271,821
      // BCE.
      allColumns.push(
          ['x_empty', DateTime.fromJSDate(new Date(-8640000000000000))],
          ['empty', 0]);
      columnMap['empty'] = 'x_empty';
    }
    return new DisplayConfiguration(
        allColumns, columnMap,
        // TODO: Legend information goes here in a follow-up PR.
        new Map());
  }

  /*
   * Returns whether or not there are any data points in the series that fall
   * inside the date range provided.
   * @param series The LabeledSeries to find data points in the date range.
   * @param dateRange The date range in which to see if there are any data
   *     points.
   */
  static dataPointsInRange(series: LabeledSeries[], dateRange: Interval):
      boolean {
    for (const s of series) {
      for (const x of s.xValues) {
        if (dateRange.contains(x)) {
          return true;
        }
      }
    }
    return false;
  }

  // The chart can't find the element to bind to until after the view is
  // initialized so we need to regenerate the chart here.
  ngAfterViewInit() {
    this.regenerateChart();
  }

  // Any time the bound data changes, we need to regenerate the chart.
  ngOnChanges(changes: SimpleChanges) {
    this.regenerateChart();
  }

  regenerateChart() {
    if (this.data && this.dateRange) {
      this.chart = c3.generate(this.generateChart());
      // Add an overlay indicating that there are no data points in the date
      // range.
      if (this.noDataPointsInDateRange) {
        const emptyContainer =
            d3.select('#' + this.chartDivId).select('.c3-text.c3-empty');
        emptyContainer.text(
            'No data for ' + this.dateRange.start.toLocaleString() + '-' +
            this.dateRange.end.toLocaleString());
        emptyContainer.attr('class', 'c3-text c3-empty noData');
      }
      this.wrapYAxisLabels();
    }
  }

  /**
   * @param columnMap A map of x-values to y-values.
   * @param allColumns A list of series in the chart.
   * @param chartHeight The height in pixels of the chart.
   * @param legend Whether or not to display a legend.
   * @param yAxisConfig Custom y-axis configurations.
   * @param maxXTicks: The maximum number of tick-marks to include on the x-axis
   * @returns A generalized c3.ChartConfig for the data passed in. See the
   * type definition at:
   * https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/c3/index.d.ts
   */
  generateBasicChart(
      columnMap: {}, allColumns: any[][], legend = true, yAxisConfig = {},
      maxXTicks = 10): c3.ChartConfiguration {
    const daysInRange = getDaysInRange(this.dateRange);
    let ticks = new Array<DateTime>();
    if (daysInRange.length <= maxXTicks) {
      ticks = daysInRange;
    } else {
      const iteration = Math.ceil(daysInRange.length / maxXTicks);
      ticks.push(daysInRange[0]);
      let date = daysInRange[0];
      while (date <= this.dateRange.end) {
        date = date.plus({days: iteration});
        ticks.push(date);
      }
    }

    const xAxisConfig: c3.XAxisConfiguration = {
      type: 'timeseries',
      min: daysInRange[0].toJSDate(),
      max: daysInRange[daysInRange.length - 1].toJSDate(),
      // TODO(b/111990521): does FHIR give localized time or UTC?
      localtime: true,
      tick: {
        // To reduce ambiguity we include the hour as well.
        format: '%m/%d %H:%M',
        multiline: true,
        fit: true,
        values: ticks.map(x => Number(x))
      }
    };
    // If there's more than one series we'll need a legend so make the
    // graph a bit taller.
    let chartHeight = BASE_CHART_HEIGHT_PX;
    if (legend) {
      chartHeight += 20;
    }

    let chartTypeString = 'line';
    if (this.chartType === ChartType.SCATTER) {
      chartTypeString = 'scatter';
    } else if (this.chartType !== ChartType.LINE) {
      throw Error('Unsupported chart type: ' + this.chartType);
    }

    const self = this;
    const graph = {
      bindto: '#' + this.chartDivId,
      size: {height: chartHeight},
      data: {
        columns: allColumns,
        xs: columnMap,
        type: chartTypeString,
      },
      color: {
        pattern: [Colors.BOSTON_BLUE, Colors.BOSTON_YELLOW, Colors.BOSTON_PINK]
      },
      axis: {x: xAxisConfig, y: yAxisConfig},
      legend: {show: legend, position: 'bottom'},
      line: {connectNull: false},
      onrendered: function() {
        self.boldDates();
        self.onRendered(this);
      },
    };

    if (this.data && this.data.seriesToDisplayGroup) {
      this.setCustomLegend();
    }
    return graph;
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
    basicChart['regions'] = [{axis: 'y', start: yBounds[0], end: yBounds[1]}];
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
  setCustomLegend() {
    if (!this.customLegendSet) {
      for (const [series, displayGroup] of Array.from(
               this.data.seriesToDisplayGroup.entries())) {
        const label = series.label;
        if (!this.displayGroupToSeries.has(displayGroup)) {
          this.displayGroupToSeries.set(displayGroup, new Array(label));
        } else {
          const appendedArray =
              this.displayGroupToSeries.get(displayGroup).concat(label);
          this.displayGroupToSeries.set(displayGroup, appendedArray);
        }
      }
      this.customLegendSet = true;
    }
  }

  focusOnDisplayGroup(displayGroup: DisplayGrouping) {
    this.chart.focus(this.displayGroupToSeries.get(displayGroup));
  }

  resetChart(displayGroup: DisplayGrouping) {
    this.chart.revert();
  }

  /**
   * Inserts wrapped y-axis tick labels.
   * TODO(b/123229731): Include this method in chart.onRendered
   */
  wrapYAxisLabels() {
    if (this.yAxisTickDisplayValues) {
      let currIndex = 0;
      const self = this;
      d3.select('#' + this.chartDivId)
          .selectAll('.c3-axis-y')
          .selectAll('.tick text')
          .each(function() {
            // Get the text element.
            const text = d3.select(this);
            // Break up the label by spaces.
            const words =
                self.yAxisTickDisplayValues[currIndex].split(/\s+/).reverse();
            let word;
            let line = [];
            const lineHeight = 10;
            // startDy is an attribute indicating how much to shift the first
            // line of the label by in the y direction. The standard dy for a
            // tick text is 3. Figure out the optimal starting dy such that half
            // of the words are displayed above the tick, and half below.
            const dyInterval = 6;
            const startDy = 3 - (Math.floor(words.length / 2) * dyInterval);
            // Insert the initial tspan.
            let tspan = text.text(null).append('tspan').attr('x', -9).attr(
                'dy', startDy);
            while (word = words.pop()) {
              line.push(word);
              tspan.text(line.join(' '));
              // Add another tspan (another line) if the label is too long.
              // We don't break up single words that are too long.
              if (tspan.text().length > Y_AXIS_TICK_MAX &&
                  tspan.text().includes(' ')) {
                // Add another line.
                line.pop();
                tspan.text(line.join(' '));
                line = [word];
                tspan =
                    text.append('tspan').attr('x', -9).attr('dy', lineHeight);
              }
            }
            // Add the remaining parts of the label to the tspan's text.
            if (line.length > 0) {
              tspan.text(line.join(' '));
            }
            currIndex++;
          });
    }
  }

  /**
   * Called every time the graph is rendered. If subclass graphs want to do
   * something special upon rendering, they can override this function.
   */
  onRendered(graphObject): void {}

  /**
   * Bolds the date portion of each x-axis tick label.
   * TODO(b/122961481): Bold dates don't persist after clicking on items in
   * non-custom legends.
   */
  boldDates() {
    if (this.chart) {
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
            const tspan = d3.select(this)
                              .text(null)
                              .append('tspan')
                              .attr('x', x)
                              .attr('dx', dx)
                              .attr('dy', dy)
                              .style('font-weight', 'bolder');
            tspan.text(
                textSplit[0]);  // Set the 'bold' tspan's content as the date.
            d3.select(this).append('tspan').text(
                ' ' + textSplit[1]);  // Add an additional tspan for the time.
          });
    }
  }

  /**
   * Generates the chart specified by the extending class.
   * @param containedGraph The graph component to be rendered.
   * @param chartHeight The height of the chart in pixels.
   * @returns a ChartConfiguration. See typing definition here:
   * https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/c3/index.d.ts
   */
  abstract generateChart(chartHeight?: number): c3.ChartConfiguration;
}
