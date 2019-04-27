// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {DateTime, Interval} from 'luxon';

// tslint:disable-next-line:max-line-length
import {DisplayGrouping, negFinalMB, negOtherMB, negPrelimMB, posFinalMB, posOtherNB, posPrelimMB} from '../clinicalconcepts/display-grouping';
import {DiagnosticReport, DiagnosticReportStatus} from '../fhir-data-classes/diagnostic-report';
import {Encounter} from '../fhir-data-classes/encounter';
import {MedicationAdministration} from '../fhir-data-classes/medication-administration';
import {CHECK_RESULT_CODE, NORMAL} from '../fhir-data-classes/observation-interpretation-valueset';
import {LegendInfo} from '../graphtypes/legend-info';

import {MedicationOrder, MedicationOrderSet} from './../fhir-data-classes/medication-order';
import {ObservationSet} from './../fhir-data-classes/observation-set';

/**
 * Timeseries data, represented as a list of <DateTime, number> tuples,
 * with metadata including a human-readable label, a unit, and a typical range.
 * Used for most charts to display a changing value over time. Multiple
 * LabeledSeries may appear on the same graph.
 */
export class LabeledSeries {
  /**
   * The y units for this series.
   */
  unit: string;

  /**
   * The DisplayGrouping this LabeledSeries corresponds to.
   */
  concept: DisplayGrouping;

  /**
   * A map of DateTimes to corresponding tuples representing the low and high
   * bounds of what should be considered "normal" along the y-axis.
   */
  normalRanges = new Map<DateTime, [number, number]>();

  /**
   * This is the desired display range for the y-axis for this series. We
   * calculate it as as:
   * [minimum(yNormalBounds, yValues), maximum(yNormalBounds, yValues)]
   */
  readonly yDisplayBounds: [number, number];

  constructor(
      /** The descriptive label of the data series. */
      readonly label: string,
      /**
       * The coordinate set for the series. The y-coordinates may be strings
       * or numbers, depending on whether this is a categorical or numerical
       * graph.
       */
      readonly coordinates: Array<[DateTime, string|number, string?]>,
      /** The y-axis unit for this series. */
      unit?: string,
      /**
       * Holds information about how this series should be displayed.
       */
      readonly legendInfo?: LegendInfo,
      /**
       * The x-coordinate values in the labeled series that should be marked as
       * abnormal because of their interpretation results.
       */
      readonly abnormalCoordinates = new Set<string>(),
      /**
       * A map of DateTimes to corresponding tuples representing the low and
       * high bounds of what should be considered "normal" along the y-axis.
       */
      normalRanges?: Map<DateTime, [number, number]>,
      /**
       * The DisplayGrouping associated with this LabeledSeries.
       */
      concept?: DisplayGrouping) {
    // Sort the coordinates by x-value.
    this.coordinates = coordinates.sort((a, b) => {
      return a[0].toMillis() - b[0].toMillis();
    });
    this.unit = unit;

    // If a specific legend wasn't passed through then we generate one for the
    // series.
    this.legendInfo = legendInfo || new LegendInfo(label);

    this.concept = concept;
    this.normalRanges = normalRanges;

    /**
     * Calculate the y axis display bounds by finding the outer boundaries of
     * the data and the normal range.
     */

    const yValues = this.coordinates.map(c => c[1]).filter(x => x !== null);

    if (yValues.map(val => typeof val === 'number').some(x => x === false)) {
      return;
    }
    this.yDisplayBounds =
        [Math.min.apply(Math, yValues), Math.max.apply(Math, yValues)];
  }

  /**
   * Generates an empty LabeledSeries.
   */
  static emptySeries() {
    return new LabeledSeries('', []);
  }


  /**
   * Generates a LabeledSeries from the given ObservationSet.
   * @param observationSet The ObservationSet to chart.
   * @param encounters A list of Encounters to use while determining line breaks
   *     in series.
   */
  static fromObservationSet(
      observationSet: ObservationSet, encounters: Encounter[]): LabeledSeries {
    let coordinates: Array<[DateTime, number]> = [];
    const observations = observationSet.resourceList;
    const abnormal = new Set<string>();
    for (const obs of observations) {
      coordinates.push([
        obs.observation.timestamp,
        obs.observation.value ? obs.observation.value.value : null
      ]);

      const outsideNormalRange = obs.observation.normalRange &&
          (obs.observation.value.value < obs.observation.normalRange[0] ||
           obs.observation.value.value > obs.observation.normalRange[1]);

      if ((obs.observation.interpretation &&
           obs.observation.interpretation.code !== NORMAL) ||
          outsideNormalRange) {
        abnormal.add(obs.observation.timestamp.toISO());
      }
    }

    coordinates = this.addEncounterEndpoints(coordinates, encounters);
    return new LabeledSeries(
        observationSet.label, coordinates, observationSet.unit,
        undefined,  // legendInfo,
        abnormal, observationSet.normalRanges);
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
   * @param encounters A list of Encounters to use while determining line breaks
   *     in series.
   */
  static fromObservationSetsDiscrete(
      observationSets: ObservationSet[], yValue: number, label,
      encounters: Encounter[]): LabeledSeries {
    let coordinates: Array<[DateTime, number | string]> = [];
    const abnormal = new Set<string>();
    for (const obsSet of observationSets) {
      const observations = obsSet.resourceList;
      for (const obs of observations) {
        coordinates.push([obs.observation.timestamp, yValue]);

        if (obs.observation.interpretation &&
            obs.observation.interpretation.code !== NORMAL) {
          abnormal.add(obs.observation.timestamp.toISO());
        }
        const outsideNormalRange = obs.observation.normalRange &&
            (obs.observation.value.value < obs.observation.normalRange[0] ||
             obs.observation.value.value > obs.observation.normalRange[1]);

        if (obs.observation.value && obs.observation.value.value &&
            outsideNormalRange) {
          abnormal.add(obs.observation.timestamp.toISO());
        }
      }
    }
    coordinates = this.addEncounterEndpoints(coordinates, encounters);
    return new LabeledSeries(
        label, coordinates,
        undefined,  // unit
        undefined,  // legend info,
        abnormal    // abnormal points
    );
  }

  /**
   * Generates a set of LabeledSeries from the given MedicationOrderSet. It will
   * return one series for all the orders together since the order set
   * represents all orders for the same medication.
   * @param medOrderSet The MedicationOrderSet to chart.
   * @param dateRange The date range displayed on the chart.
   * @param encounters A list of Encounters to use while determining line breaks
   *     in series.
   * @param categoricalYPosition If set, we use this y-position for all the
   *    datapoints in both returned series. If unset, we use the dosage
   *    quantity for each administration as the y-value.
   */
  static fromMedicationOrderSet(
      medOrderSet: MedicationOrderSet, dateRange: Interval,
      encounters: Encounter[], categoricalYPosition?: string): LabeledSeries {
    const data: LabeledSeries[] = [];
    for (const medOrder of medOrderSet.resourceList) {
      // The first series in fromMedicationOrder is all the administrations.
      // The second series (unused in this function) is the end points only.
      data.push(LabeledSeries.fromMedicationOrder(
          medOrder, dateRange, categoricalYPosition)[0]);
    }

    // Combine all the series into a single series so that it shows up with
    // the same color.
    let coords = [];
    for (const series of data) {
      for (const coord of series.coordinates) {
        coords.push(coord);
      }
    }

    coords = this.addEncounterEndpoints(coords, encounters);
    return new LabeledSeries(
        medOrderSet.label, coords, medOrderSet.unit,
        undefined,  // legendInfo
        undefined,  // abnormal points
        // Always keep normalRanges undefined for MedicationOrder-based
        // LabeledSeries, as we only show normal ranges for Observations with a
        // normal range given in the data.
        undefined,  // normalRanges
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
   * @param categoricalYPosition If set, we use this categorical y-position
   *    for all the datapoints in both returned series. If unset, we use the
   *    dosage quantity for each administration as the numerical y-value.
   */
  static fromMedicationOrder(
      order: MedicationOrder, dateRange: Interval,
      categoricalYPosition?: string): LabeledSeries[] {
    const coordinates = new Array<[DateTime, string | number, string?]>();
    const endpointCoordinates = new Array<[DateTime, string | number]>();
    const medAdminsForOrder = order.administrationsForOrder;

    const label = order.label + order.orderId;
    const legend = order.rxNormCode.displayGrouping;

    if (medAdminsForOrder) {
      for (const annotatedAdmin of medAdminsForOrder.resourceList) {
        coordinates.push([
          annotatedAdmin.medAdministration.timestamp,
          this.getYPositionForMed(
              annotatedAdmin.medAdministration, categoricalYPosition)
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
          this.getYPositionForMed(
              order.firstAdministration, categoricalYPosition)
        ]);
      } else if (
          categoricalYPosition &&
          (order.lastAdmininistration.timestamp.toMillis() >
           dateRange.start.toMillis())) {
        // Only add a point for continuity if we have a fixed y position.
        coordinates.push([dateRange.start, categoricalYPosition]);
      }
      if (lastAdministrationIsBeforeEndTime) {
        endpointCoordinates.push([
          order.lastAdmininistration.timestamp,
          this.getYPositionForMed(
              order.lastAdmininistration, categoricalYPosition)
        ]);
      } else if (
          categoricalYPosition &&
          order.firstAdministration.timestamp.toMillis() <
              dateRange.end.toMillis()) {
        // Only add a point for continuity if we have a fixed y position.
        coordinates.push([dateRange.end, categoricalYPosition]);
      }
    }

    return [
      new LabeledSeries(
          label, coordinates, medAdminsForOrder.unit, legend,
          undefined,  // abnormal points
          // Always keep normalRanges undefined for MedicationOrder-based
          // LabeledSeries, as we only show normal ranges for Observations with
          // a normal range given in the data.
          undefined,  // normalRanges
          order.rxNormCode.displayGrouping),
      new LabeledSeries(
          'endpoint' + label, endpointCoordinates, medAdminsForOrder.unit,
          legend)
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
  static fromDiagnosticReport(report: DiagnosticReport, date: DateTime):
      LabeledSeries[] {
    const series = [];
    const interpretationMap = new Map<string, Array<[DateTime, string]>>();
    // Sort results by interpretation, and make a LabeledSeries for each.
    for (const observation of report.results) {
      const categoricalYValue = observation.display;
      const interpretation = observation.interpretation.code;
      if (interpretationMap.get(interpretation)) {
        const existing = interpretationMap.get(interpretation);
        existing.push([date, categoricalYValue]);
        interpretationMap.set(interpretation, existing);
      } else {
        interpretationMap.set(interpretation, [[date, categoricalYValue]]);
      }
    }
    // Make a LabeledSeries for each interpretation.
    for (const interpretation of Array.from(interpretationMap.keys())) {
      const seriesLabel =
          report.id + '-' + interpretation + '-' + report.status;
      const isPositive = seriesLabel.includes(CHECK_RESULT_CODE);
      series.push(new LabeledSeries(
          // Encode the status and interpretation into the series name so that
          // we can use d3 later on to filter the data points and display them
          // with the correct styling.
          seriesLabel, interpretationMap.get(interpretation),
          undefined,  // unit
          LabeledSeries.getLegendInfoFromResult(report.status, isPositive)));
    }
    return series;
  }

  /**
   * Returns the correct legend info for a diagnostic report.
   * @param status The DiagnosticReport's status.
   * @param isPositive Whether the report appears to be positive.
   * @returns The correct legend info for the report.
   */
  private static getLegendInfoFromResult(
      status: DiagnosticReportStatus, isPositive: boolean): LegendInfo {
    if (isPositive) {
      if (status === DiagnosticReportStatus.Preliminary) {
        return posPrelimMB;
      } else if (status === DiagnosticReportStatus.Final) {
        return posFinalMB;
      }
      return posOtherNB;
    } else {
      if (status === DiagnosticReportStatus.Preliminary) {
        return negPrelimMB;
      } else if (status === DiagnosticReportStatus.Final) {
        return negFinalMB;
      }
      return negOtherMB;
    }
  }

  private static getYPositionForMed(
      medAdmin: MedicationAdministration, categoricalYPosition: string): string
      |number {
    return categoricalYPosition !== undefined && categoricalYPosition !== null ?
        categoricalYPosition :
        medAdmin.dosage.quantity;
  }

  private static addEncounterEndpoints(
      coordinates: any[], encounters: Encounter[]): any[] {
    if (coordinates.length > 0) {
      // If any encounters are set for this MedicationOrderSet, add null values
      // to the endpoints of encounters to ensure line breakage between points
      // of different encounters.
      // We assume that encounter endpoints correspond to correct line breaks,
      // and do not cross-check encounter id's of MedicationOrders or
      // MedicationAdministrations.
      coordinates = coordinates.sort((a, b) => a[0] - b[0]);
      for (const encounter of encounters) {
        coordinates.unshift([encounter.period.start.toUTC(), null]);
        coordinates.push([encounter.period.end.toUTC(), null]);
      }
    }
    return coordinates;
  }

  hasPointInRange(dateRange: Interval) {
    for (const x of this.coordinates.map(c => c[0])) {
      if (dateRange.contains(x)) {
        return true;
      }
    }
    return false;
  }
}
