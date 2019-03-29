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
    // We need to initialize the data with a point so that the c3 chart can show
    // the x-axis with the dates (otherwise, it turns up blank). This date is
    // the earliest possible date: Tuesday, April 20th, 271,821 BCE.
    return CustomizableData.fromInitialPoint(
        0,
        new CustomizableGraphAnnotation(
            DateTime.fromJSDate(new Date(-8640000000000000)),
            'initial_point_hidden'));
  }

  /**
   * Converts an initial time and y value to a CustomizableData object.
   * @param date The date for this initial point.
   * @param yValue The y-value for this initial point.
   * @param annotation The CustomizableGraphAnnotation for this point.
   * @returns a new CustomizableData representing this initial point.
   */
  // TODO(b/123940928): Consider passing in encounters rather than FhirService.
  static fromInitialPoint(
      yValue: number, annotation: CustomizableGraphAnnotation) {
    const annotations = new Map<number, CustomizableGraphAnnotation>().set(
        annotation.timestamp.toMillis(), annotation);
    return new CustomizableData(
        LabeledSeries.fromInitialPoint(annotation.timestamp, yValue),
        annotations);
  }

  /**
   * Adds a point to the series in this CustomizableData object.
   * @param annotation: The annotation to add in to the graph.
   */
  addPointToSeries(annotation: CustomizableGraphAnnotation) {
    // This method assumes there is only 1 series.
    this.series[0].xValues.push(annotation.timestamp);
    this.series[0].yValues.push(0);
    this.annotations.set(annotation.timestamp.toMillis(), annotation);
    this.c3DisplayConfiguration = this.generateColumnMapping();
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
    this.c3DisplayConfiguration = this.generateColumnMapping();
  }
}
