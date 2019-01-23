// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {DateTime} from 'luxon';
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
      readonly ySeriesLabelToDisplayGroup: Map<string, DisplayGrouping>) {};
}

/*
 * The base class for holding data pertaining to one graph.
 */
export class GraphData {
  c3DisplayConfiguration: DisplayConfiguration;

  constructor(
      /** A list of the series to be displayed on the graph. */
      readonly series: LabeledSeries[],
      /**
       * The DisplayGroups (for example, lab results, vital signs, medications)
       * associated with particular series. We use this to make a custom legend
       * for the graph.
       */
      seriesToDisplayGroup: Map<LabeledSeries, DisplayGrouping>) {
    this.c3DisplayConfiguration =
        this.generateColumnMapping(seriesToDisplayGroup);
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
}
