// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {DateTime, Interval} from 'luxon';

import {LabeledSeries} from './labeled-series';
import {AnnotatedTooltip} from '../graphtypes/tooltips/annotated-tooltip';

/**
 * The base class for holding data pertaining to one graph.
 */
export class GraphData {
  // The number of decimal places to show for any value associated with this
  // GraphData. The default is 0, to minimize errors caused by unnecessary
  // trailing zeros.
  precision = 0;

  constructor(
      /** A list of the series to be displayed on the graph. */
      readonly series: LabeledSeries[] = [],

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
       *
       * The value of the map is an AnnotatedTooltip[] that contains additional
       * values that need more processing before it can be displayed, an optional id,
       * and a string representing the innerhtml that we want to display as the tooltip
       */
      readonly tooltipMap?: Map<string, AnnotatedTooltip[]>,
      /**
       * See documentation on tooltipMap for more detail. tooltipKeyFn
       * takes in a graph data point and returns the key into tooltipMap that
       * provides the tooltip for that data point.
       */
      readonly tooltipKeyFn?: (graphData: any) => string,
      /**
       * A list of x-axis regions to display on the graph.
       */
      readonly xRegions = new Array<[DateTime, DateTime]>()) {}

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
      if (s.hasPointInRange(entireRange)) {
        return true;
      }
    }
    return false;
  }
}
