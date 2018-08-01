// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {DateTime, Interval} from 'luxon';
import {DisplayGrouping} from '../clinicalconcepts/display-grouping';
import {DiagnosticReport} from '../fhir-data-classes/diagnostic-report';
import {MedicationAdministration} from '../fhir-data-classes/medication-administration';

import {MedicationOrder, MedicationOrderSet} from './../fhir-data-classes/medication-order';
import {ObservationSet} from './../fhir-data-classes/observation-set';

/**
 * Timeseries data, represented as a list of <DateTime, number> tuples,
 * with metadata including a human-readable label, a unit, and a typical range.
 * Used for most charts to display a changing value over time. Multiple
 * LabeledSeries may appear on the same graph.
 */
export class LabeledSeries {
  /** The descriptive label of the data series. */
  readonly label: string;

  /** The descriptive units of the data series. */
  readonly unit: string;

  /**
   * The x-values for this data series. This array should be parallel to the
   * yValues series, so that (xValues[n], yValues[n]) forms a coordinate.
   */
  readonly xValues: DateTime[];
  /**
   * The y-values for this data series. This array should be parallel to the
   *  xValues series, so that (xValues[n], yValues[n]) forms a coordinate.
   */
  readonly yValues: number[];

  /**
   * This tuple represents the low and high bounds of what should be
   * considered "normal" along the y-axis.
   */
  readonly yNormalBounds: [number, number];

  /**
   * This is the desired display range for the y-axis for this series. We
   * calculate it as as:
   * [minimum(yNormalBounds, yValues), maximum(yNormalBounds, yValues)]
   */
  readonly yDisplayBounds: [number, number];

  /**
   * This is the concept group representing the data of this series.
   */
  readonly concept: DisplayGrouping;

  constructor(
      lbl: string, coordinates: Array<[DateTime, number]>, unit?: string,
      yNormalBounds?: [number, number], concept?: DisplayGrouping) {
    this.label = lbl;
    this.xValues = [];
    this.yValues = [];
    this.unit = unit;

    /*
     * Separate out the coordinates into x and y values because that's what
     * the graphing library will expect.
     */
    for (const [x, y] of coordinates) {
      this.xValues.push(x);
      this.yValues.push(y);
    }
    this.yNormalBounds = yNormalBounds;
    this.concept = concept;

    /**
     * Calculate the y axis display bounds by finding the outer boundaries of
     * the data and the normal range.
     */
    this.yDisplayBounds = [
      Math.min.apply(Math, this.yValues), Math.max.apply(Math, this.yValues)
    ];

    if (this.yNormalBounds) {
      this.yDisplayBounds = [
        Math.min(this.yDisplayBounds[0], this.yNormalBounds[0]),
        Math.max(this.yDisplayBounds[1], this.yNormalBounds[1])
      ];
    }
  }

  /**
   * Generates a LabeledSeries from the given ObservationSet.
   * @param observationSet The ObservationSet to chart.
   */
  static fromObservationSet(observationSet: ObservationSet): LabeledSeries {
    const coordinates: Array<[DateTime, number]> = [];
    const observations = observationSet.resourceList;
    for (const obs of observations) {
      coordinates.push([obs.timestamp, obs.value.value]);
    }
    return new LabeledSeries(
        observationSet.label, coordinates, observationSet.unit,
        observationSet.normalRange);
  }

  /**
   * Generates a LabeledSeries from the given list of discrete resulted-
   * ObservationSets.
   * For Observations with discrete values, such as "yellow"
   * for the color of urine, we group all ObservationSets into one
   * LabeledSeries, at a specific yValue.
   * @param observationSets The discrete ObservationSets to chart.
   * @param yValue The numerical y-value to map to this ObservationSet with
   *     discrete results.
   * @param label The label for this LabeledSeries.
   */
  static fromObservationSetsDiscrete(
      observationSets: ObservationSet[], yValue: number, label): LabeledSeries {
    const coordinates: Array<[DateTime, number]> = [];
    for (const obsSet of observationSets) {
      const observations = obsSet.resourceList;
      for (const obs of observations) {
        coordinates.push([obs.timestamp, yValue]);
      }
    }
    return new LabeledSeries(label, coordinates);
  }

  /**
   * Generates a set of LabeledSeries from the given MedicationOrderSet. It will
   * return one series for all the orders together since the order set
   * represents all orders for the same medication.
   * @param medOrderSet The MedicationOrderSet to chart.
   * @param dateRange The date range displayed on the chart.
   * @param fixedYPosition If set, we use this y-position for all the
   *    datapoints in both returned series. If unset, we use the dosage
   *    quantity for each administration as the y-value.
   */
  static fromMedicationOrderSet(
      medOrderSet: MedicationOrderSet, dateRange: Interval,
      fixedYPosition?: number): LabeledSeries {
    const data = [];
    for (const medOrder of medOrderSet.resourceList) {
      // The first series in fromMedicationOrder is all the administrations.
      // The second series (unused in this function) is the end points only.
      data.push(LabeledSeries.fromMedicationOrder(
          medOrder, dateRange, fixedYPosition)[0]);
    }

    // Combine all the series into a single series so that it shows up with
    // the same color.
    const coords = [];
    for (const series of data) {
      for (let i = 0; i < series.xValues.length; i++) {
        coords.push([series.xValues[i], series.yValues[i]]);
      }
    }

    return new LabeledSeries(
        medOrderSet.label, coords, medOrderSet.unit,
        undefined,  // yNormalBounds
        // TODO(b/122468555): Enforce that medOrderSets have to have a
        // RxNormCode upon construction
        medOrderSet.rxNormCode ? medOrderSet.rxNormCode.displayGrouping :
                                 undefined);
  }

  /**
   * Generates a set of LabeledSeries from the given MedicationOrder. For each
   * order, there are two LabeledSeries -- one for the corresponding
   * MedicationAdministrations, and one for the endpoints displayed for the
   * order.
   * @param order The MedicationOrder to chart.
   * @param dateRange The date range displayed on the chart.
   * @param fixedYPosition If set, we use this y-position for all the
   *    datapoints in both returned series. If unset, we use the dosage
   *    quantity for each administration as the y-value.
   */
  static fromMedicationOrder(
      order: MedicationOrder, dateRange: Interval,
      fixedYPosition?: number): LabeledSeries[] {
    const coordinates = new Array<[DateTime, number]>();
    const endpointCoordinates = new Array<[DateTime, number]>();
    const medAdminsForOrder = order.administrationsForOrder;

    const label = order.label + order.orderId;

    if (medAdminsForOrder) {
      for (const annotatedAdmin of medAdminsForOrder.resourceList) {
        coordinates.push([
          annotatedAdmin.medAdministration.timestamp,
          this.getYPositionForMed(
              annotatedAdmin.medAdministration, fixedYPosition)
        ]);
      }
      // We add the beginning and end time stamp if the order is not fully
      // displayed-- so that no dashes are displayed when an order is being
      // carried over from before the time window displayed.
      // We only display an endpoint for a MedicationOrder if the
      // endpoint is visible -- that is, if the time of the first
      // Administration of the order is during or after the beginning of the
      // time range of the chart, and if the time of the last Administration
      // of the order is before the end of the chart's time range.
      const firstAdministrationIsAfterStartTime =
          order.firstAdministration.timestamp.toMillis() >=
          dateRange.start.toMillis();
      const lastAdministrationIsBeforeEndTime =
          order.lastAdmininistration.timestamp.toMillis() <=
          dateRange.end.toMillis();

      if (firstAdministrationIsAfterStartTime) {
        endpointCoordinates.push([
          order.firstAdministration.timestamp,
          this.getYPositionForMed(order.firstAdministration, fixedYPosition)
        ]);
      } else if (fixedYPosition) {
        // Only add a point for continuity if we have a fixed y position.
        coordinates.push([dateRange.start, fixedYPosition]);
      }
      if (lastAdministrationIsBeforeEndTime) {
        endpointCoordinates.push([
          order.lastAdmininistration.timestamp,
          this.getYPositionForMed(order.lastAdmininistration, fixedYPosition)
        ]);
      } else if (fixedYPosition) {
        // Only add a point for continuity if we have a fixed y position.
        coordinates.push([dateRange.end, fixedYPosition]);
      }
    }

    return [
      new LabeledSeries(
          label, coordinates, medAdminsForOrder.unit,
          undefined,  // yNormalBounds
          order.rxNormCode.displayGrouping),
      new LabeledSeries(
          'endpoint' + label, endpointCoordinates, medAdminsForOrder.unit)
    ];
  }

  /**
   * Generates a LabeledSeries from the given initial date and y-value.
   * @param date The DateTime corresponding to the initial point to chart.
   * @param yValue The y-value for the initial point to chart.
   */
  static fromInitialPoint(date: DateTime, yValue: number) {
    return new LabeledSeries('', [[date, yValue]]);
  }

  /**
   * Generates LabeledSeries from the given DiagnosticReport.
   * @param report The DiagnosticReport to chart.
   * @param date the DateTime corresponding to the Observations in the
   *     DiagnosticReport.
   */
  static fromDiagnosticReport(
      report: DiagnosticReport, date: DateTime,
      yAxisMap: Map<number, string>): LabeledSeries[] {
    const series = [];
    const interpretationMap = new Map<string, Array<[DateTime, number]>>();
    // Sort results by interpretation, and make a LabeledSeries for each.
    for (const observation of report.results) {
      const yValue =
          Array.from(yAxisMap.keys())
              .find(key => yAxisMap.get(key) === observation.display);
      const interpretation = observation.interpretation.code;
      if (interpretationMap.get(interpretation)) {
        const existing = interpretationMap.get(interpretation);
        existing.push([date, yValue]);
        interpretationMap.set(interpretation, existing);
      } else {
        interpretationMap.set(interpretation, [[date, yValue]]);
      }
    }
    // Make a LabeledSeries for each interpretation.
    for (const interpretation of Array.from(interpretationMap.keys())) {
      series.push(new LabeledSeries(
          report.id + '-' + interpretation,
          interpretationMap.get(interpretation)));
    }
    return series;
  }

  private static getYPositionForMed(
      medAdmin: MedicationAdministration, fixedYPosition: number) {
    return fixedYPosition !== undefined && fixedYPosition !== null ?
        fixedYPosition :
        medAdmin.dosage.quantity;
  }
}
