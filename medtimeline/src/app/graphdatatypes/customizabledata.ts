// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {DateTime} from 'luxon';

import {CustomizableGraphAnnotation} from '../graphtypes/tooltips/tooltip';

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
      readonly annotations: Map<number, CustomizableGraphAnnotation>) {
    super([series], undefined /* no legend info */);
    this.annotations = annotations;
    this.yAxisDisplayBounds = [0, 10];
  }

  /**
   * Converts an initial time and y value to a CustomizableData object.
   * @param date The date for this initial point.
   * @param yValue The y-value for this initial point.
   * @param annotation The CustomizableGraphAnnotation for this point.
   * @returns a new CustomizableData representing this initial point.
   */
  static fromInitialPoint(
      date: DateTime, yValue: number, annotation: CustomizableGraphAnnotation) {
    const annotations = new Map<number, CustomizableGraphAnnotation>().set(
        date.toMillis(), annotation);
    return new CustomizableData(
        LabeledSeries.fromInitialPoint(date, yValue), annotations);
  }

  /**
   * Adds a point to the series in this CustomizableData object.
   * @param date The date for this point.
   * @param yValue The y-value for this point.
   * @param annotation The CustomizableGraphAnnotation for this point.
   * @returns a new CustomizableData with the addition of this point.
   */
  addPointToSeries(
      date: DateTime, yValue: number, annotation: CustomizableGraphAnnotation) {
    // This method assumes there is only 1 series.
    this.series[0].xValues.push(date);
    this.series[0].yValues.push(yValue);
    this.annotations.set(date.toMillis(), annotation);
  }

  /**
   * Removes a point from the series in this CustomizableData object, as well as
   * the corresponding annotation.
   * @param date The date for this point to remove.
   */
  removePointFromSeries(date: DateTime) {
    const index =
        this.series[0].xValues.findIndex(x => x.toMillis() === date.toMillis());
    this.series[0].xValues.splice(index, 1);
    this.series[0].yValues.splice(index, 1);
    this.annotations.delete(date.toMillis());
  }
}
