// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {DateTime} from 'luxon';
import {CustomizableGraphAnnotation} from '../graphtypes/customizable-graph/customizable-graph-annotation';

import {GraphData} from './graphdata';
import {LabeledSeries} from './labeled-series';

/**
 * CustomizableData holds a time-based series to which a user can add more
 * points.
 */
export class CustomizableData extends GraphData {
  /** The display bounds of the y-axis. */
  readonly yAxisDisplayBounds: [number, number];

  private constructor(
      series: LabeledSeries,
      /**
       * The annotations for this customizable graph. If populated, holds a
       * map from a number representation of a Date to
       * CustomizableGraphAnnotation for the corresponding point.
       */
      readonly annotations: Map<number, CustomizableGraphAnnotation>,
      regions?: any[]) {
    super(
        [series], undefined,  // tooltip map
        undefined,            // tooltip key function
        regions);
    this.annotations = annotations;
    this.yAxisDisplayBounds = [0, 10];
  }

  static defaultEmptySeries() {
    return new CustomizableData(
        LabeledSeries.emptySeries(),
        new Map<number, CustomizableGraphAnnotation>());
  }

  /**
   * Adds a point to the series in this CustomizableData object.
   * @param annotation: The annotation to add in to the graph.
   */
  addPointToSeries(annotation: CustomizableGraphAnnotation) {
    // This method assumes there is only 1 series.
    this.series[0].coordinates.push([annotation.timestamp, 0]);
    this.annotations.set(annotation.timestamp.toMillis(), annotation);
  }

  /**
   * Removes a point from the series in this CustomizableData object, as well as
   * the corresponding annotation.
   * @param date The date for this point to remove.
   */
  removePointFromSeries(date: DateTime) {
    const index = this.series[0].coordinates.findIndex(
        c => c[0].toMillis() === date.toMillis());
    this.series[0].coordinates.splice(index, 1);
    this.annotations.delete(date.toMillis());
  }
}
