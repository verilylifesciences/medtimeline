// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {DomSanitizer} from '@angular/platform-browser';
import {Color} from 'd3';
import {Interval} from 'luxon';

import {DisplayGrouping} from '../clinicalconcepts/display-grouping';
import {ResourceCodeGroup} from '../clinicalconcepts/resource-code-group';
import {Encounter} from '../fhir-data-classes/encounter';
import {MedicationOrderSet} from '../fhir-data-classes/medication-order';
import {ObservationSet} from '../fhir-data-classes/observation-set';
import {MedicationAdministrationTooltip} from '../graphtypes/tooltips/medication-tooltips';
import {DiscreteObservationTooltip, GenericAbnormalTooltip, GenericAnnotatedObservationTooltip} from '../graphtypes/tooltips/observation-tooltips';
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
      tooltipMap?: Map<string, string>, tooltipKeyFn?: (key: string) => string,
      regions?: any[], precision?: number) {
    super(series, seriesToDisplayGroup, tooltipMap, tooltipKeyFn, regions);
    this.precision = precision ? precision : 0;
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
    const seriesToDisplayGrouping = new Map<LabeledSeries, DisplayGrouping>();
    let seriesIdx = 0;
    const dataColors: Color[] = getDataColors();

    let minY: number = Number.MAX_VALUE;
    let maxY: number = Number.MIN_VALUE;

    const series: LabeledSeries[] = [];
    const obsLabelToColor = new Map<string, Color>();
    for (const obsSet of observationGroup) {
      const lblSeries = LabeledSeries.fromObservationSet(obsSet, encounters);
      series.push(lblSeries);
      const color = dataColors[seriesIdx];
      seriesToDisplayGrouping.set(
          lblSeries, new DisplayGrouping(lblSeries.label, color));
      obsLabelToColor.set(obsSet.label, color);

      seriesIdx = (seriesIdx + 1) % dataColors.length;

      /* Find the minimum and maximum y values for all the series. */
      minY = Math.min(minY, lblSeries.yDisplayBounds[0]);
      maxY = Math.max(maxY, lblSeries.yDisplayBounds[1]);
    }

    let tooltipMap = LineGraphData.makeTooltipMap(
        observationGroup, sanitizer, obsLabelToColor);

    tooltipMap = LineGraphData.addAbnormalValueTooltips(
        series, tooltipMap, obsLabelToColor, sanitizer);

    const allUnits =
        new Set(observationGroup.map(x => x.unit).filter(x => x !== undefined));
    if (allUnits.size > 1) {
      throw Error('Observations have different units.');
    }

    const data = new LineGraphData(
        label, series,
        LineGraphData.getDisplayBounds(minY, maxY, resourceCodeGroup),
        allUnits.values().next().value, seriesToDisplayGrouping,
        tooltipMap.size > 0 ? tooltipMap : undefined,
        undefined,  // tooltipMap
        undefined,  // regions
        resourceCodeGroup.precision);
    return data;
  }

  private static makeTooltipMap(
      obsGroup: ObservationSet[], sanitizer: DomSanitizer,
      obsLabelToColor: Map<string, Color>): Map<string, string> {
    const tooltipMap = new Map<string, string>();
    // Only construct custom tooltips if there's annotation values for hte
    // observations.
    for (const obsSet of obsGroup) {
      for (const obs of obsSet.resourceList) {
        if (obs.annotationValues.length > 0) {
          const timestamp = obs.observation.timestamp.toMillis().toString();
          // The key for this tooltip is the administration's timestamp.
          // There may be multiple data points associated with the timestamp
          // so we stack the administrations on top of one another in that case.
          if (tooltipMap.get(timestamp)) {
            tooltipMap.set(
                timestamp,
                tooltipMap.get(timestamp) +
                    new GenericAnnotatedObservationTooltip(
                        false, obsLabelToColor.get(obs.label))
                        .getTooltip(obs, sanitizer));
          } else {
            tooltipMap.set(
                timestamp,
                new GenericAnnotatedObservationTooltip(
                    true, obsLabelToColor.get(obs.label))
                    .getTooltip(obs, sanitizer));
          }
        }
      }
    }
    return tooltipMap;
  }

  /**
   * Constructs a map of timestamps to GenericAbnormalTooltips for any point
   * with an "abnormal" value. Currently, we only use the normal range as
   * reference.
   * TODO(b/129059213): Use Observation.interpretation to determine abnormality
   * as well.
   * @param series The series to construct the tooltip map for.
   * @param tooltipMap The existing tooltips for the series.
   * @param obsLabelToColor A map of Observation label to corresponding color.
   * @param sanitizer A DOM sanitizer for use in tooltip construction
   * @returns a map of timstamp strings to tooltips, with GenericObservation
   *     tooltips replaced with GenericAbnormal tooltip if the value is
   *     abnormal.
   */
  private static addAbnormalValueTooltips(
      series: LabeledSeries[], tooltipMap: Map<string, string>,
      obsLabelToColor: Map<string, Color>,
      sanitizer: DomSanitizer): Map<string, string> {
    if (series.length > 0) {
      const yBounds = series[0].yNormalBounds;
      if (series.length === 1 && yBounds) {
        // Add a tooltip for any value with an abnormal y-value.
        for (let i = 0; i < series[0].yValues.length; i++) {
          const value = series[0].yValues[i];
          const timestamp = series[0].xValues[i].toMillis().toString();
          if (value < yBounds[0] || value > yBounds[1]) {
            const params = {};
            params['timestamp'] = series[0].xValues[i].toMillis();
            params['value'] = value;
            params['label'] = series[0].label;
            params['unit'] = series[0].unit;
            // The key for this tooltip is the timestamp.
            // There may be multiple data points associated with the timestamp
            // so we stack the administrations on top of one another in that
            // case.
            if (tooltipMap.get(timestamp)) {
              tooltipMap.set(
                  timestamp,
                  tooltipMap.get(timestamp) +
                      new GenericAbnormalTooltip(
                          false, obsLabelToColor.get(series[0].label))
                          .getTooltip(params, sanitizer));
            } else {
              tooltipMap.set(
                  timestamp,
                  new GenericAbnormalTooltip(
                      true, obsLabelToColor.get(series[0].label))
                      .getTooltip(params, sanitizer));
            }
          }
        }
      }
    }
    return tooltipMap;
  }

  private static getDisplayBounds(
      minInSeries: number, maxInSeries: number,
      resourceCodeGroup: ResourceCodeGroup): [number, number] {
    let yAxisDisplayMin;
    let yAxisDisplayMax;
    if (resourceCodeGroup.forceDisplayBounds &&
        resourceCodeGroup.displayBounds) {
      // We use the provided display bounds by default, regardless of the
      // bounds of the data.
      yAxisDisplayMin = resourceCodeGroup.displayBounds[0];
      yAxisDisplayMax = resourceCodeGroup.displayBounds[1];
    } else {
      // We use the provided display bounds as the y-axis display min and max,
      // unless the calculated minimum and maximum of the data span a smaller
      // range.

      // We choose the provided min bound if it is larger than the min of the
      // data, to cut off abnormal values.
      yAxisDisplayMin = resourceCodeGroup.displayBounds ?
          ((resourceCodeGroup.displayBounds[0] >= minInSeries) ?
               resourceCodeGroup.displayBounds[0] :
               minInSeries) :
          minInSeries;
      // We choose the provided max bound if it is smaller than the max of the
      // data, to cut off abnormal values.
      yAxisDisplayMax = resourceCodeGroup.displayBounds ?
          ((resourceCodeGroup.displayBounds[1] <= maxInSeries) ?
               resourceCodeGroup.displayBounds[1] :
               maxInSeries) :
          maxInSeries;
    }
    return [yAxisDisplayMin, yAxisDisplayMax];
  }

  /**
   * Converts a list of MedicationOrderSets to a LineGraphData object.
   * @param medicationOrderListGroup A list of MedicationOrderSets to display.
   * @param encounters A list of Encounters to use while determining line breaks
   *     in series.
   * @returns a new LineGraphData for this observation set.
   * @throws Error if the medication administrations in medicationOrderSet
   *     have different units.
   */
  static fromMedicationOrderSet(
      medicationOrderSet: MedicationOrderSet, dateRange: Interval,
      sanitizer: DomSanitizer, encounters: Encounter[]): LineGraphData {
    const tooltipMap = new Map<string, string>();
    const regions = [];
    for (const order of medicationOrderSet.resourceList) {
      regions.push({
        axis: 'x',
        class: 'order-region',
        start: order.firstAdministration.timestamp,
        end: order.lastAdmininistration.timestamp
      });
      for (const admin of order.administrationsForOrder.resourceList) {
        const timestamp =
            admin.medAdministration.timestamp.toMillis().toString();
        // The key for this tooltip is the administration's timestamp.
        // There may be multiple data points associated with the timestamp
        // so we stack the administrations on top of one another in that case.
        const tooltipText = new MedicationAdministrationTooltip().getTooltip(
            [admin], sanitizer);
        if (tooltipMap.get(timestamp)) {
          tooltipMap.set(timestamp, tooltipMap.get(timestamp) + tooltipText);
        } else {
          tooltipMap.set(timestamp, tooltipText);
        }
      }
    }
    const singleSeries = LabeledSeries.fromMedicationOrderSet(
        medicationOrderSet, dateRange, encounters);
    const seriesToDisplayGrouping = new Map<LabeledSeries, DisplayGrouping>();
    seriesToDisplayGrouping.set(
        singleSeries,
        new DisplayGrouping(singleSeries.label, getDataColors()[0]));

    return new LineGraphData(
        medicationOrderSet.label, [singleSeries],
        [medicationOrderSet.minDose, medicationOrderSet.maxDose],
        medicationOrderSet.unit, seriesToDisplayGrouping, tooltipMap, undefined,
        regions);
  }

  /**
   * Converts a list of ObservationSets with discrete y-values (results) to a
   * LineGraphData object.
   * If we are graphing Observations with discrete values, such as "yellow"
   * for the color of urine, we group all ObservationSets into one
   * LabeledSeries, and display textual information in the tooltip.
   * @param label The label for this set of observations.
   * @param observationGroup A list of ObservationSets to display.
   * @param encounters A list of Encounters to use while determining line breaks
   *     in series.
   * @returns a new LineGraphData for this observation set.
   * @throws Error if the observations in observationGroup have different
   *     units.
   */
  static fromObservationSetListDiscrete(
      label: string, observationGroup: ObservationSet[],
      sanitizer: DomSanitizer, encounters: Encounter[]): LineGraphData {
    // For ObservationSets with discrete categories, we display a scatterplot
    // with one series, with most information in the tooltip.
    const yValue = 10;
    const lblSeries = LabeledSeries.fromObservationSetsDiscrete(
        observationGroup, yValue, label, encounters);
    const seriesToDisplayGroup = new Map<LabeledSeries, DisplayGrouping>();
    seriesToDisplayGroup.set(
        lblSeries, new DisplayGrouping(lblSeries.label, getDataColors()[0]));

    const tooltipMap = new Map<string, string>();
    for (const observationSet of observationGroup) {
      for (const obs of observationSet.resourceList) {
        const tsString = obs.observation.timestamp.toMillis().toString();
        const tooltipText = new DiscreteObservationTooltip().getTooltip(
            [obs.observation], sanitizer);
        // The key for this tooltip is the observation's timestamp.
        // There may be multiple data points associated with the timestamp
        // so we stack the tooltips on top of one another in that case.
        if (tooltipMap.has(tsString)) {
          tooltipMap.set(tsString, tooltipMap.get(tsString) + tooltipText);
        } else {
          tooltipMap.set(tsString, tooltipText);
        }
      }
    }
    return new LineGraphData(
        label, [lblSeries], [0, yValue], undefined,  // Units
        seriesToDisplayGroup, tooltipMap);
  }
}
