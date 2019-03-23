// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {DateTime, Interval} from 'luxon';
import {DisplayGrouping} from '../clinicalconcepts/display-grouping';
import {LabeledSeries} from './labeled-series';

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
      readonly ySeriesLabelToDisplayGroup: Map<string, DisplayGrouping>) {}
}

/*
 * The base class for holding data pertaining to one graph.
 */
export class GraphData {
  // The DisplayConfiguration, including data and column names, for this
  // GraphData.
  c3DisplayConfiguration: DisplayConfiguration;

  // A list of x-regions to highlight on the graph.
  xRegions: any[];

  // The number of decimal places to show for any value associated with this
  // GraphData. The default is 0, to minimize errors caused by unnecessary
  // trailing zeros.
  precision = 0;

  constructor(
      /** A list of the series to be displayed on the graph. */
      readonly series: LabeledSeries[],
      /**
       * The DisplayGroups (for example, lab results, vital signs, medications)
       * associated with particular series. We use this to make a custom legend
       * for the graph.
       */
      seriesToDisplayGroup: Map<LabeledSeries, DisplayGrouping>,
      /**
       * A map to provide tooltips.
       * This is a bit complicated. c3's API lets you specify a function call
       * that will provide the HTML content for any given point's tooltip.
       * As a parameter, it passes in one or more data points:
       * https://c3js.org/reference.html#tooltip-contents
       * so when the tooltip is rendered, all you have is the plotted
       * information. As far as I can tell, that data structure is undocumented.
       * Upon inspection, the data point includes which series it belongs to,
       * the x value, and the y value, so if you want to render a custom
       * tooltip, you have to be able to derive all the information you need
       * from those values.
       * tooltipMap, alongside tooltipKeyFn, helps with this process.
       * If you call tooltipKeyFn on the data object passed into the c3 contents
       * function, it should yield the key into tooltipMap that will let you
       * look up the appropriate tooltip for that data point. If tooltipKeyFn
       * is unset, then we fall back to the default lookup, which is by x-value.
       */
      readonly tooltipMap?: Map<string, string>,
      /**
       * See documentation on tooltipMap for more detail. tooltipKeyFn
       * takes in a graph data point and returns the key into tooltipMap that
       * provides the tooltip for that data point.
       */
      readonly tooltipKeyFn?: (graphData: any) => string,
      /**
       * A list of x-axis regions to display on the graph.
       */
      regions?: any[]) {
    this.c3DisplayConfiguration =
        this.generateColumnMapping(seriesToDisplayGroup);
    this.xRegions = regions;
  }

  /*
   * Sets up the column map and list of columns to use while generating the c3
   * chart.
   * @param data The GraphData to use while making the columns and column map.
   */
  generateColumnMapping(seriesToDisplayGroup:
                            Map<LabeledSeries, DisplayGrouping>):
      DisplayConfiguration {
    // Give labels to each series and make a map of x-values to y-values.
    const allColumns: any[][] = [];
    const columnMap = {};
    const ySeriesLabelToDisplayGroup = new Map<string, DisplayGrouping>();
    for (const s of this.series) {
      allColumns.push(
          new Array<string|DateTime>('x_' + s.label).concat(s.xValues));
      allColumns.push(new Array<string|number>(s.label).concat(s.yValues));
      columnMap[s.label] = 'x_' + s.label;

      ySeriesLabelToDisplayGroup.set(s.label, seriesToDisplayGroup.get(s));
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
        allColumns, columnMap, ySeriesLabelToDisplayGroup);
  }

  /*
   * Returns whether or not there are any data points in the series that fall
   * inside the date range provided.
   * @param series The LabeledSeries to find data points in the date range.
   * @param dateRange The date range in which to see if there are any data
   *     points.
   */
  dataPointsInRange(dateRange: Interval): boolean {
    const entireRange = Interval.fromDateTimes(
        dateRange.start.toLocal().startOf('day'),
        dateRange.end.toLocal().endOf('day'));
    for (const s of this.series) {
      for (const x of s.xValues) {
        if (entireRange.contains(x)) {
          return true;
        }
      }
    }
    return false;
  }
}
