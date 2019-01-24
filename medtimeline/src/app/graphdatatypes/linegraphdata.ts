// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {Color} from 'd3';
import {Interval} from 'luxon';

import {DisplayGrouping} from '../clinicalconcepts/display-grouping';
import {MedicationOrderSet} from '../fhir-data-classes/medication-order';
import {Observation} from '../fhir-data-classes/observation';
import {ObservationSet} from '../fhir-data-classes/observation-set';
import {getDataColors} from '../theme/bch_colors';

import {GraphData} from './graphdata';
import {LabeledSeries} from './labeled-series';

/**
 * LineGraphData holds configurations for a line graph. A line graph may display
 * one or more LabeledSeries.
 */
export class LineGraphData extends GraphData {
  private constructor(
      /** The label for the graph. */
      readonly label: string,
      /** The LabeledSeries that are a part of this line graph. */
      series: LabeledSeries[],
      /** The display bounds of the y-axis. */
      readonly yAxisDisplayBounds: [number, number],
      /** The unit for the y-axis of the graph. */
      readonly unit: string,
      /**
       * The LabeledSeries mapped to which DisplayGrouping they fall under for
       * the purposes of color and legends
       */
      seriesToDisplayGroup: Map<LabeledSeries, DisplayGrouping>,
      /**
       * The tooltip categories for this linegraph. If populated, holds a map
       * from a string representation of a Date to an array of all discrete
       * result Observations at that time.
       */
      readonly tooltipCategories?: Map<number, Observation[]>) {
    super(series, seriesToDisplayGroup);
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
    const seriesToDisplayGrouping = new Map<LabeledSeries, DisplayGrouping>();
    let seriesIdx = 0;
    const dataColors: Color[] = getDataColors();

    let minY: number = Number.MAX_VALUE;
    let maxY: number = Number.MIN_VALUE;

    const series: LabeledSeries[] = [];
    for (const obsSet of observationGroup) {
      const lblSeries = LabeledSeries.fromObservationSet(obsSet);
      series.push(lblSeries);
      seriesToDisplayGrouping.set(
          lblSeries,
          new DisplayGrouping(lblSeries.label, dataColors[seriesIdx]));

      seriesIdx = (seriesIdx + 1) % dataColors.length;

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
        label, series, [minY, maxY], allUnits.values().next().value,
        seriesToDisplayGrouping);
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
    const singleSeries =
        LabeledSeries.fromMedicationOrderSet(medicationOrderSet, dateRange);
    const seriesToDisplayGrouping = new Map<LabeledSeries, DisplayGrouping>();
    seriesToDisplayGrouping.set(
        singleSeries,
        new DisplayGrouping(singleSeries.label, getDataColors()[0]));

    return new LineGraphData(
        medicationOrderSet.label, [singleSeries],
        [medicationOrderSet.minDose, medicationOrderSet.maxDose],
        medicationOrderSet.unit, seriesToDisplayGrouping);
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
    const lblSeries = LabeledSeries.fromObservationSetsDiscrete(
        observationGroup, yValue, label);
    const seriesToDisplayGroup = new Map<LabeledSeries, DisplayGrouping>();
    seriesToDisplayGroup.set(
        lblSeries, new DisplayGrouping(lblSeries.label, getDataColors()[0]));

    const tooltipCategories = new Map<number, Observation[]>();
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
        label, [lblSeries], [0, yValue], undefined,  // Units
        seriesToDisplayGroup, tooltipCategories);
  }
}
