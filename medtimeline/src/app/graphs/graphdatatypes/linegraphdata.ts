// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {DomSanitizer} from '@angular/platform-browser';
import {Interval} from 'luxon';

import {Encounter} from '../../fhir-resources/encounter';
import {MedicationOrderSet} from '../../fhir-resources/medication-order';
import {NORMAL} from '../../fhir-resources/observation-interpretation-valueset';
import {ObservationSet} from '../../fhir-resources/sets/observation-set';
import {ResourceCodeGroup} from '../../conceptmappings/resource-codes/resource-code-group';
import {AnnotatedTooltip} from '../graphtypes/tooltips/annotated-tooltip';
import {MedicationAdministrationTooltip} from '../graphtypes/tooltips/medication-tooltips';
// tslint:disable-next-line:max-line-length
import {DiscreteObservationTooltip, GenericAbnormalTooltip, GenericAnnotatedObservationTooltip} from '../graphtypes/tooltips/observation-tooltips';

import {GraphData} from './graphdata';
import {LabeledSeries} from './labeled-series';

/**
 * LineGraphData holds configurations for a line graph. A line graph may display
 * one or more LabeledSeries.
 */
export class LineGraphData extends GraphData {
  /** The tick marks to display on the y axis. */
  readonly yTicks: number[];

  /**
   * Contains the ResourceCodeGroup for this set of data, which helps determine
   * whether to force display bounds, and the code group's display bounds.
   */
  readonly resourceGroup: ResourceCodeGroup;



  private constructor(
      /** The label for the graph. */
      readonly label: string,
      /** The LabeledSeries that are a part of this line graph. */
      series: LabeledSeries[],
      /** The minimum and maximum y-values for this data. */
      readonly yAxisDataBounds: [number, number],
      /** The unit for the y-axis of the graph. */
      readonly unit: string, tooltipMap?: Map<string, AnnotatedTooltip[]>,
      tooltipKeyFn?: (key: string) => string, regions?: any[],
      precision?: number, resourceCodeGroup?: ResourceCodeGroup) {
    super(series, tooltipMap, tooltipKeyFn, regions);
    this.precision = precision ? precision : 0;
    this.yTicks =
        LineGraphData.getYTicks(yAxisDataBounds[0], yAxisDataBounds[1]);
    this.resourceGroup = resourceCodeGroup;
  }

  static emptyData() {
    return new LineGraphData('', [], [0, 0], '');
  }

  /**
   * Converts a list of ObservationSets to a LineGraphData object.
   * @param label The label for this set of observations.
   * @param observationGroup A list of ObservationSets to display.
   * @param resourceCodeGroup The ResourceCodeGroup these ObservationSets belong
   *   to
   * @param sanitizer A DOM sanitizer for use in tooltip construction
   * @param encounters A list of Encounters to use while determining line breaks
   *     in series.
   * @returns a new LineGraphData for this observation set.
   * @throws Error if the observations in observationGroup have different units.
   */
  static fromObservationSetList(
      label: string, observationGroup: ObservationSet[],
      resourceCodeGroup: ResourceCodeGroup, sanitizer: DomSanitizer,
      encounters: Encounter[]): LineGraphData {
    let minY: number = Number.MAX_VALUE;
    let maxY: number = Number.MIN_VALUE;

    const allSeries = [];
    const obsGroupToSeries = new Map<ObservationSet, LabeledSeries>();
    for (const obsSet of observationGroup) {
      const lblSeries = LabeledSeries.fromObservationSet(obsSet, encounters);
      obsGroupToSeries.set(obsSet, lblSeries);
      allSeries.push(lblSeries);
      /* Find the minimum and maximum y values for all the series. */
      if (lblSeries.yDisplayBounds) {
        minY = Math.min(minY, lblSeries.yDisplayBounds[0]);
        maxY = Math.max(maxY, lblSeries.yDisplayBounds[1]);
      }
    }

    let tooltipMap = LineGraphData.makeTooltipMap(obsGroupToSeries, sanitizer);

    tooltipMap = LineGraphData.addAbnormalValueTooltips(
        tooltipMap, sanitizer, allSeries);

    const allUnits =
        new Set(observationGroup.map(x => x.unit).filter(x => x !== undefined));

    const data = new LineGraphData(
        label, allSeries, [minY, maxY], allUnits.values().next().value,
        tooltipMap && tooltipMap.size > 0 ? tooltipMap : undefined,
        undefined,  // tooltipMap
        undefined,  // regions
        resourceCodeGroup.precision, resourceCodeGroup);
    return data;
  }

  /**
   * Manually find y axis tick values based on the min and max display bounds.
   */
  static getYTicks(min: number, max: number, tickCount = 4): number[] {
    // Evenly space out 5 numbers between the min and max (display bounds).
    const difference = max - min;
    const spacing = difference / tickCount;
    const values = [];
    // If there is no difference between the min and max, simply return the
    // min.
    if (spacing === 0) {
      return [min];
    }
    for (let curr = min; curr <= max; curr += spacing) {
      values.push(curr);
    }
    return values;
  }


  private static makeTooltipMap(
      obsGroupToSeries: Map<ObservationSet, LabeledSeries>,
      sanitizer: DomSanitizer,
      ): Map<string, AnnotatedTooltip[]> {
    const tooltipMap = new Map<string, AnnotatedTooltip[]>();

    for (const entry of Array.from(obsGroupToSeries.entries())) {
      const obsGroup: ObservationSet = entry[0];
      const series: LabeledSeries = entry[1];
      for (const obs of obsGroup.resourceList) {
        const isAbnormal =
            series.abnormalCoordinates.has(obs.observation.timestamp.toISO());
        const timestamp = obs.observation.timestamp.toMillis().toString();
        // The key for this tooltip is the administration's timestamp.
        // There may be multiple data points associated with the timestamp
        // so we stack the administrations on top of one another in that case.
        if (tooltipMap.get(timestamp)) {
          // Blood pressure is read into the ObservationSet differently,
          // causing an edge case in the presentation of the values in the
          // tooltips. We only want to display 'Blood pressure' once
          if (obs.observation.codes[0].label === 'Blood pressure') {
            // We are combining the array into one AnnotatedTooltip in
            // order to check to see if "Blood pressure" has already been added
            // to any of the previous tooltips
            const annotatedTT = AnnotatedTooltip.combineAnnotatedTooltipArr(
                tooltipMap.get(timestamp));
            if (annotatedTT.tooltipChart.includes('Blood pressure')) {
              continue;
            }
          }
          tooltipMap.get(timestamp).push(
              new GenericAnnotatedObservationTooltip(
                  false, series.legendInfo.fill)
                  .getTooltip(obs, sanitizer, isAbnormal));
        } else {
          tooltipMap.set(
              timestamp, [new GenericAnnotatedObservationTooltip(
                              true, series.legendInfo.fill)
                              .getTooltip(obs, sanitizer, isAbnormal)]);
        }
      }
    }
    return tooltipMap;
  }

  /**
   * Constructs a map of timestamps to GenericAbnormalTooltips for any point
   * with an "abnormal" value. Currently, we only use the normal range as
   * reference.
   * @param series The series to construct the tooltip map for.
   * @param tooltipMap The existing tooltips for the series.
   * @param obsLabelToColor A map of Observation label to corresponding color.
   * @param sanitizer A DOM sanitizer for use in tooltip construction
   * @returns a map of timstamp strings to tooltips, with GenericObservation
   *     tooltips replaced with GenericAbnormal tooltip if the value is
   *     abnormal.
   */
  private static addAbnormalValueTooltips(
      tooltipMap: Map<string, AnnotatedTooltip[]>,
      sanitizer: DomSanitizer,
      labeledSeries: LabeledSeries[],
      ): Map<string, AnnotatedTooltip[]> {
    const alreadyMarked = new Set<string>();
    for (const series of labeledSeries) {
      // Add a tooltip for any value with an abnormal value.
      for (const coords of series.coordinates) {
        const timestamp = coords[0].toMillis().toString();
        if (series.abnormalCoordinates.has(coords[0].toISO())) {
          const params = {};
          params['timestamp'] = coords[0].toMillis();
          params['value'] = coords[1];
          params['label'] = series.label;
          params['unit'] = series.unit;
          // The key for this tooltip is the timestamp.
          // There may be multiple data points associated with the
          // timestamp so we stack the administrations on top of one
          // another in that case.
          if (tooltipMap.get(timestamp) && !alreadyMarked.has(timestamp)) {
            tooltipMap.get(timestamp).push(
                new GenericAbnormalTooltip(false, series.legendInfo.fill)
                    .getTooltip(params, sanitizer));
            alreadyMarked.add(timestamp);
          } else if (!tooltipMap.get(timestamp)) {
            tooltipMap.set(timestamp, [new GenericAbnormalTooltip(
                                           true, series.legendInfo.fill)
                                           .getTooltip(params, sanitizer)]);
          }
        }
      }
      return tooltipMap;
    }
  }

  /**
   * Converts a list of MedicationOrderSets to a LineGraphData object.
   * @param medicationOrderListGroup A list of MedicationOrderSets to
   *     display.
   * @param encounters A list of Encounters to use while determining line
   *     breaks in series.
   * @returns a new LineGraphData for this observation set.
   * @throws Error if the medication administrations in medicationOrderSet
   *     have different units.
   */
  static fromMedicationOrderSet(
      medicationOrderSet: MedicationOrderSet, dateRange: Interval,
      sanitizer: DomSanitizer, encounters: Encounter[]): LineGraphData {
    const tooltipMap = new Map<string, AnnotatedTooltip[]>();
    const precision = 0;
    for (const order of medicationOrderSet.resourceList) {
      for (const admin of order.medicationAdministrationSet.resourceList) {
        const timestamp =
            admin.medAdministration.timestamp.toMillis().toString();
        // The key for this tooltip is the administration's timestamp.
        // There may be multiple data points associated with the timestamp
        // so we stack the administrations on top of one another in that
        // case.
        const newTT = new MedicationAdministrationTooltip().getTooltip(
            [admin], sanitizer);
        if (tooltipMap.get(timestamp)) {
          tooltipMap.get(timestamp).push(newTT);
        } else {
          tooltipMap.set(timestamp, [newTT]);
        }
      }
    }

    return new LineGraphData(
        medicationOrderSet.label,
        [LabeledSeries.fromMedicationOrderSet(
            medicationOrderSet, dateRange, encounters)],
        [medicationOrderSet.minDose, medicationOrderSet.maxDose],
        medicationOrderSet.unit, tooltipMap, undefined, undefined, precision);
  }

  /**
   * Converts a list of ObservationSets with discrete y-values (results) to
   * a LineGraphData object. If we are graphing Observations with discrete
   * values, such as "yellow" for the color of urine, we group all
   * ObservationSets into one LabeledSeries, and display textual information
   * in the tooltip.
   * @param label The label for this set of observations.
   * @param observationGroup A list of ObservationSets to display.
   * @param encounters A list of Encounters to use while determining line
   *     breaks in series.
   * @returns a new LineGraphData for this observation set.
   * @throws Error if the observations in observationGroup have different
   *     units.
   */
  static fromObservationSetListDiscrete(
      label: string, observationGroup: ObservationSet[],
      sanitizer: DomSanitizer, encounters: Encounter[]): LineGraphData {
    // For ObservationSets with discrete categories, we display a
    // scatterplot with one series, with most information in the tooltip.
    const yValue = 10;
    const lblSeries = LabeledSeries.fromObservationSetsDiscrete(
        observationGroup, yValue, label, encounters);

    let tooltipMap = new Map<string, AnnotatedTooltip[]>();
    for (const observationSet of observationGroup) {
      for (const obs of observationSet.resourceList) {
        const isAbnormal = (obs.observation.interpretation &&
                            obs.observation.interpretation.code !== NORMAL) ?
            true :
            false;
        const tsString = obs.observation.timestamp.toMillis().toString();
        // Only add the timestamp to the tooltip for the first entry.
        let newTT: AnnotatedTooltip;
        if (obs.observation.value) {
          newTT = new GenericAnnotatedObservationTooltip(
                      !tooltipMap.has(tsString), lblSeries.legendInfo.fill)
                      .getTooltip(obs, sanitizer, isAbnormal);
        } else {
          newTT = new DiscreteObservationTooltip(!tooltipMap.has(tsString))
                      .getTooltip([obs.observation], sanitizer);
        }

        // The key for this tooltip is the observation's timestamp.
        // There may be multiple data points associated with the timestamp
        // so we stack the tooltips on top of one another in that case.
        if (tooltipMap.has(tsString)) {
          tooltipMap.get(tsString).push(newTT);
        } else {
          tooltipMap.set(tsString, [newTT]);
        }
      }
    }
    tooltipMap = LineGraphData.addAbnormalValueTooltips(
        tooltipMap, sanitizer, [lblSeries]);

    return new LineGraphData(
        label, [lblSeries], [0, yValue * 2], undefined,  // Units
        tooltipMap);
  }
}
