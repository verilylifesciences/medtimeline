// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {Interval} from 'luxon';
import {MedicationOrderSet} from '../fhir-data-classes/medication-order';
import {Observation} from '../fhir-data-classes/observation';
import {ObservationSet} from '../fhir-data-classes/observation-set';

import {GraphData} from './graphdata';
import {LabeledSeries} from './labeled-series';

/**
 * LineGraphData holds configurations for a line graph. A line graph may display
 * one or more LabeledSeries.
 */
export class LineGraphData extends GraphData {
  /** The label for the graph. */
  readonly label: string;

  /** The display bounds of the y-axis. */
  readonly yAxisDisplayBounds: [number, number];

  /** The unit for the y-axis of the graph. */
  readonly unit: string;

  /**
   * The tooltip categories for this linegraph. If populated, holds a map from
   * a string representation of a Date to an array of all discrete result
   * Observations at that time.
   */
  // TODO(b/118130752): Move tooltip configuration to display.
  readonly tooltipCategories = new Map<number, Observation[]>();

  private constructor(
      label: string, series: LabeledSeries[],
      yAxisDisplayBounds: [number, number], unit?: string,
      tooltipCategories?: Map<number, Observation[]>) {
    super(series, undefined);
    this.label = label;
    this.yAxisDisplayBounds = yAxisDisplayBounds;
    this.unit = unit;
    this.tooltipCategories = tooltipCategories;
  }

  /**
   * Converts a list of ObservationSets to a LineGraphData object.
   * @param label The label for this set of observations.
   * @param observationGroup A list of ObservationSets to display.
   * @returns a new LineGraphData for this observation set.
   * @throws Error if the observations in observationGroup have different units.
   */
  static fromObservationSetList(
      label: string, observationGroup: ObservationSet[]): LineGraphData {
    let minY: number = Number.MAX_VALUE;
    let maxY: number = Number.MIN_VALUE;

    const series: LabeledSeries[] = [];
    for (const obsSet of observationGroup) {
      const lblSeries = LabeledSeries.fromObservationSet(obsSet);
      series.push(lblSeries);

      /* Find the minimum and maximum y values for all the series. */
      minY = Math.min(minY, lblSeries.yDisplayBounds[0]);
      maxY = Math.max(maxY, lblSeries.yDisplayBounds[1]);
    }

    const allUnits =
        new Set(observationGroup.map(x => x.unit).filter(x => x !== undefined));
    if (allUnits.size > 1) {
      throw Error('Observations have different units.');
    }

    return new LineGraphData(
        label, series, [minY, maxY], allUnits.values().next().value);
  }

  /*
   * Converts a list of MedicationOrderSets to a LineGraphData object.
   * @param medicationOrderListGroup A list of MedicationOrderSets to display.
   * @returns a new LineGraphData for this observation set.
   * @throws Error if the medication administrations in medicationOrderSet have
   *     different units.
   */
  static fromMedicationOrderSet(
      medicationOrderSet: MedicationOrderSet,
      dateRange: Interval): LineGraphData {
    return new LineGraphData(
        medicationOrderSet.label,
        [LabeledSeries.fromMedicationOrderSet(medicationOrderSet, dateRange)],
        [medicationOrderSet.minDose, medicationOrderSet.maxDose],
        medicationOrderSet.unit);
  }

  /**
   * Converts a list of ObservationSets with discrete y-values (results) to a
   * LineGraphData object.
   * If we are graphing Observations with discrete values, such as "yellow" for
   * the color of urine, we group all ObservationSets into one LabeledSeries,
   * and display textual information in the tooltip.
   * @param label The label for this set of observations.
   * @param observationGroup A list of ObservationSets to display.
   * @returns a new LineGraphData for this observation set.
   * @throws Error if the observations in observationGroup have different units.
   */
  static fromObservationSetListDiscrete(
      label: string, observationGroup: ObservationSet[]): LineGraphData {
    // For ObservationSets with discrete categories, we display a scatterplot
    // with one series, with most information in the tooltip.
    const yValue = 10;
    const series: LabeledSeries[] = [];
    const lblSeries = LabeledSeries.fromObservationSetsDiscrete(
        observationGroup, yValue, label);
    const tooltipCategories = new Map<number, Observation[]>();
    series.push(lblSeries);
    for (const observationSet of observationGroup) {
      for (const obs of observationSet.resourceList) {
        if (tooltipCategories.has(obs.timestamp.toMillis())) {
          tooltipCategories.get(obs.timestamp.toMillis()).push(obs);
        } else {
          tooltipCategories.set(obs.timestamp.toMillis(), [obs]);
        }
      }
    }
    return new LineGraphData(
        label, series, [0, yValue], undefined,  // Units
        tooltipCategories);
  }
}
