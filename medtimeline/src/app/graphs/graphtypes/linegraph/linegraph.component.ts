// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {Component, forwardRef, Inject, Input, OnChanges, SimpleChanges} from '@angular/core';
import {DomSanitizer} from '@angular/platform-browser';
import {ChartPoint} from 'chart.js';
import {DateTime} from 'luxon';
import {ABNORMAL} from 'src/app/theme/verily_colors';
import {UI_CONSTANTS_TOKEN} from 'src/constants';

import {LabeledSeries} from '../../graphdatatypes/labeled-series';
import {LineGraphData} from '../../graphdatatypes/linegraphdata';
import {GraphComponent} from '../graph/graph.component';
import {AnnotatedTooltip} from '../tooltips/annotated-tooltip';

@Component({
  selector: 'app-linegraph',
  templateUrl: '../graph/graph.component.html',
  styleUrls: ['../graph.css'],
  providers: [
    {provide: GraphComponent, useExisting: forwardRef(() => LineGraphComponent)}
  ]
})
export class LineGraphComponent extends GraphComponent<LineGraphData> implements
    OnChanges {
  /**
   * The amount to pad the y-axis around the displayed data range. This gives
   * the data points a little cushion so that they don't run off the top or
   * bottom of the axis.
   */
  static readonly yAxisPaddingFactor = 0.25;
  static readonly NORMAL_BOUND_SERIES_NAME = 'normalBound';

  @Input() showTicks: boolean;

  private addedNormalBound = false;

  constructor(
      readonly sanitizer: DomSanitizer,
      @Inject(UI_CONSTANTS_TOKEN) readonly uiConstants: any) {
    super(sanitizer, uiConstants);
  }

  ngOnChanges(changes: SimpleChanges) {
    super.ngOnChanges(changes);
  }

  adjustGeneratedChartConfiguration() {
    // We have to wait until after the data loads up into the graph to iterate
    // over the points and adjust their coloring based on the normal range.
    this.addedNormalBound = this.isNormalBoundAdded(this.data.series);
    this.addYNormalRange();

    const seriesLength = this.data.series.length;

    if (this.addedNormalBound) {
      // Gives the last labeledSeries in the array a different set of
      // characteristics. The last labeledSeries depicts the normal boundary.
      const chartjsSeries = this.chartData[seriesLength - 1];
      chartjsSeries.pointStyle = 'crossRot';
      chartjsSeries.pointBorderColor = 'rgba(0,0,0,0.5)';  // medium-gray color
      chartjsSeries.pointBorderWidth = 2;
      chartjsSeries.pointRadius = 4;
      chartjsSeries.borderColor = 'transparent';
    }

    // Color points that fall outside of their respective normal ranges.
    // If it hasNormalBound, then the last labeledSeries does not need to
    // be styled in this for loop.
    for (let i = 0;
         i < (this.addedNormalBound ? seriesLength - 1 : seriesLength); i++) {
      const chartjsSeries = this.chartData[i];
      const labeledSeries = this.data.series[i];
      this.colorAbnormalPoints(chartjsSeries, labeledSeries);
    }
    if (!this.showTicks) {
      this.chartOptions.scales.yAxes[0].display = false;
      this.chartOptions.scales.yAxes[0].ticks.beginAtZero = true;
    }
  }

  /**
   * Adds y normal ranges to the graph and colors points the designated
   * "abnormal" color if they fall outside the normal range.
   */
  private addYNormalRange() {
    // Only LineGraphData has y normal bounds.
    if (!(this.data instanceof LineGraphData)) {
      return;
    }

    let normalRangeBounds;
    if (this.data.series.length === 1 || this.addedNormalBound) {
      // Some things are only valid if there are y-axis normal bounds. We
      // also only show normal bounds if there's one data series on the
      // axis, and all normal bounds for the current date range are the same.
      // These customizations are based on this.data, which is a type
      // specific for LineGraphData, and could not be generalized in the
      // abstract GraphCard class.
      let dateTimesInRange = [];
      let firstNormalRange: [number, number];
      if (this.data.series[0].normalRanges) {
        dateTimesInRange = Array.from(this.data.series[0].normalRanges.keys())
                               .filter(date => this.dateRange.contains(date));
        firstNormalRange = dateTimesInRange.length > 0 ?
            this.data.series[0].normalRanges.get(dateTimesInRange[0]) :
            undefined;
      }
      if (firstNormalRange) {
        let differentNormalRanges = false;
        for (const time of dateTimesInRange) {
          const currNormalRange = this.data.series[0].normalRanges.get(time);
          if (currNormalRange[0] !== firstNormalRange[0] ||
              currNormalRange[1] !== firstNormalRange[1]) {
            differentNormalRanges = true;
          }
        }
        // If all normal ranges associated with points in the current date
        // range are the same, then add the region to the chart, and adjust
        // display bounds accordingly.
        if (!differentNormalRanges) {
          // To prevent the creation of multiple normal bound tooltips
          if (this.addedNormalBound === false) {
            this.createNormalBoundsTooltip(firstNormalRange);
          }
          this.addGreenRegion(firstNormalRange);
          normalRangeBounds = firstNormalRange;
          this.addedNormalBound = true;
        }
      }
    }
    this.adjustChartYScales(normalRangeBounds);
  }

  private adjustChartYScales(normalRangeBounds: [number, number]) {
    const yDisplayBounds = this.getDisplayBounds(normalRangeBounds);

    // If the display bounds are enforced and all the bounds are the
    // same, don't pad.
    const padding = (this.allBoundsAreEnforced() && this.allBoundsAreSame()) ?
        0 :
        Math.abs(yDisplayBounds[1] - yDisplayBounds[0]) *
            LineGraphComponent.yAxisPaddingFactor;
    this.chartOptions.scales.yAxes[0].ticks.min = yDisplayBounds[0] - padding;
    this.chartOptions.scales.yAxes[0].ticks.max = yDisplayBounds[1] + padding;
    this.chartOptions.scales.yAxes[0].afterBuildTicks = (scale) => {
      if (this.data && this.data.yTicks) {
        scale.ticks =
            LineGraphData.getYTicks(yDisplayBounds[0], yDisplayBounds[1]);
      }
    };
  }

  /**
   * Helper function that determines whether the LabeledSeries has
   * a normal bound or not.
   * @param series LabeledSeries[] that presents the data that is to
   * be presented in the graph.
   * @returns boolean value that reflects whether there is a normal
   * bound or not.
   */
  private isNormalBoundAdded(series: LabeledSeries[]): boolean {
    for (const s of series) {
      if (s.label === LineGraphComponent.NORMAL_BOUND_SERIES_NAME) {
        return true;
      }
    }
    return false;
  }

  /**
   * Reconciles together several possible sources of y-axis display bounds. The
   * bounds can come from three places:
   * 1) Each ResourceCode has an expected data bound encoded.
   * 2) Each Observation point may have a normal range encoded (passed in as
   *    normalRangeBounds only if all the observation points have the same
   *    normal range; otherwise normalRangeBounds is undefined).
   * 3) LineGraphData tracks the range of data seen across all data points.
   *
   * Our goal here is to show as much data as possible without being misleading
   * or skewing the graph too much to include outlier points. So, we follow
   * these rules:
   *
   * 1) If all the ResourceCodes have the same expected data bound, and all of
   *    them are marked to enforce that bound, choose those upper and lower
   *    bounds.
   * 2) Else, consider each endpoint of the bound separately.
   *    a. For the lower bound, choose min(min data, min normal bound)
   *    b. For the upper bound, choose max(max data, max normal bound)
   */
  private getDisplayBounds(normalRangeBounds: [number, number]):
      [number, number] {
    if (this.allBoundsAreSame() && this.allBoundsAreEnforced()) {
      return this.data.resourceGroup.resourceCodes[0].displayBounds;
    }

    if (!normalRangeBounds) {
      return (this.data.yAxisDataBounds);
    }

    return [
      Math.min(this.data.yAxisDataBounds[0], normalRangeBounds[0]),
      Math.max(this.data.yAxisDataBounds[1], normalRangeBounds[1])
    ];
  }

  private allBoundsAreSame(): boolean {
    if (this.data.resourceGroup) {
      return new Set(
                 this.data.resourceGroup.resourceCodes
                     .map(code => code.displayBounds)
                     .filter(bound => bound !== undefined)
                     .map(
                         bound =>
                             bound.toString()  // cast to string for hashability
                         ))
                 .size === 1;
    }
    return false;
  }

  private allBoundsAreEnforced(): boolean {
    if (this.data.resourceGroup) {
      return this.data.resourceGroup.resourceCodes
          .map(x => x.forceDisplayBounds)
          .every(x => x === true);
    }
    return false;
  }

  /**
   * Adds a LabeledSeries that represents the normal bounds on the y-axis
   * to the Tooltip Map.
   * @param yNormalBounds The bounds of the y range considered normal.
   */
  private createNormalBoundsTooltip(yNormalBounds: [number, number]) {
    // TypeScript requires a separate declaration for arrays of tuples.
    let coordinatesLblSeries: [DateTime, number][];
    coordinatesLblSeries = [
      [this.dateRange.start, yNormalBounds[0]],
      [this.dateRange.start, yNormalBounds[1]]
    ];
    const lblSeries = new LabeledSeries(
        LineGraphComponent.NORMAL_BOUND_SERIES_NAME, coordinatesLblSeries,
        this.data.unit);

    let coordinatesChartPoint: ChartPoint[];
    coordinatesChartPoint = [
      {x: this.dateRange.start.toISO(), y: yNormalBounds[0]},
      {x: this.dateRange.start.toISO(), y: yNormalBounds[1]}
    ];

    if (this.data) {
      this.data.series.push(lblSeries);

      // Creates an HTML table for the tooltip text, and adds it to the tooltip
      // map. This was done separately because not all line graphs have normal
      // bounds depicted.
      const tooltipText =
          '<table class="c3-tooltip"><tbody><tr><th colspan="1">' +
          'Normal Boundary</th></tr>' +
          '<tr><td><div style="white-space:pre-line; text-align:center;">' +
          '<b>Upper: </b>' + yNormalBounds[1] + ' ' + this.data.unit + '\n' +
          '<b>Lower: </b>' + yNormalBounds[0] + ' ' + this.data.unit +
          '</div></td></tr></tbody></table>';

      const newTT = new AnnotatedTooltip(tooltipText);

      const mapKey = this.dateRange.start.valueOf().toString();
      if (this.data.tooltipMap.has(mapKey)) {
        this.data.tooltipMap.get(mapKey).push(newTT);
      } else {
        this.data.tooltipMap.set(mapKey, [newTT]);
      }
    }
    this.chartData.push({
      data: coordinatesChartPoint,
      label: LineGraphComponent.NORMAL_BOUND_SERIES_NAME
    });
  }

  /**
   * Draws a green box spanning the entire x-axis and covering y axis normal
   * range. Also puts descriptive labels at the top and bottom of the range.
   * @param yNormalBounds The bounds of the y range considered normal.
   */
  private addGreenRegion(yNormalBounds: [number, number]) {
    const normalRegionAnnotation = {
      // Show the y-bounds underneath the graph points.
      drawTime: 'beforeDatasetsDraw',
      type: 'box',
      yMin: yNormalBounds[0],
      yMax: yNormalBounds[1],
      // No x-axis bounds so it extends to cover the whole graph.
      xScaleID: GraphComponent.X_AXIS_ID,
      yScaleID: GraphComponent.Y_AXIS_ID,
      // Color the region light green.
      backgroundColor: 'rgba(64, 191, 128, 0.15)',
    };
    this.chartOptions.annotation.annotations.push(normalRegionAnnotation);
  }

  /**
   * Colors the point the default series color if it's not abnormal, or outlines
   * with the abnormal color if marked as abnormal.
   *
   * @param series The data series to color points for.
   * @param yNormalBounds The bounds of what should be considered normal.
   * @param seriesLegend The legend info for the series we're working with.
   */
  private colorAbnormalPoints(
      chartjsSeries: any, labeledSeries: LabeledSeries) {
    const pointBackgroundColors = new Array<string>();
    const pointBorderColors = new Array<string>();
    const pointStyle = new Array<string>();

    for (let pt of chartjsSeries.data) {
      // pt could also be a number here, so we constrain it to when it's a
      // ChartPoint. For some reason Typescript doesn't like it when we do a
      // test to see if pt is an instanceof ChartPoint so checking for the
      // y-attribute is a workaround.
      pt = pt as ChartPoint;
      const inAbnormalSet = labeledSeries.abnormalCoordinates.has(pt.x);

      if (inAbnormalSet) {
        pointBackgroundColors.push(
            labeledSeries.legendInfo.fill.rgb().string());
        pointBorderColors.push(ABNORMAL.rgb().string());
        pointStyle.push('triangle');
      } else {
        pointBackgroundColors.push(
            labeledSeries.legendInfo.fill.rgb().string());
        pointBorderColors.push(labeledSeries.legendInfo.outline.rgb().string());
        pointStyle.push('circle');
      }
      chartjsSeries.pointBackgroundColor = pointBackgroundColors;
      chartjsSeries.pointBorderColor = pointBorderColors;
      chartjsSeries.pointStyle = pointStyle;
    }
  }
}
