// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {Component, forwardRef, Inject, Input, OnChanges, SimpleChanges} from '@angular/core';
import {DomSanitizer} from '@angular/platform-browser';
import {ChartPoint} from 'chart.js';
import {ResourceCodeGroup} from 'src/app/clinicalconcepts/resource-code-group';
import {LabeledSeries} from 'src/app/graphdatatypes/labeled-series';
import {LineGraphData} from 'src/app/graphdatatypes/linegraphdata';
import {ABNORMAL} from 'src/app/theme/verily_colors';
import {UI_CONSTANTS_TOKEN} from 'src/constants';

import {GraphComponent} from '../graph/graph.component';

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
  @Input() showTicks: boolean;

  constructor(
      readonly sanitizer: DomSanitizer,
      @Inject(UI_CONSTANTS_TOKEN) readonly uiConstants: any) {
    super(sanitizer, uiConstants);
  }

  ngOnChanges(changes: SimpleChanges) {
    super.ngOnChanges(changes);
  }
  prepareForChartConfiguration() {
    if (this.data.yAxisDisplayBounds) {
      // We only ever have one y-axis so it's safe to work only on the 0th
      // subscript here.
      // Calculate the data range and add a bit of padding at top and bottom
      // (unless the bottom is zero or the top is 100--those might be
      // percentages). This reasonably ensures that there's no cropping where
      // the normal bound labels would get cut off.
      this.adjustChartYScales(this.data.yAxisDisplayBounds);
    }
  }

  adjustGeneratedChartConfiguration() {
    // We have to wait until after the data loads up into the graph to iterate
    // over the points and adjust their coloring based on the normal range.
    this.addYNormalRange();

    // Color points that fall outside of their respective normal ranges.
    for (let i = 0; i < this.data.series.length; i++) {
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
    let yDisplayBounds = this.data.yAxisDisplayBounds;
    // Only LineGraphData has y normal bounds.
    if (!(this.data instanceof LineGraphData)) {
      return;
    }

    if (this.data.series.length === 1) {
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
          this.addGreenRegion(firstNormalRange);
          yDisplayBounds = [
            Math.min(yDisplayBounds[0], firstNormalRange[0]),
            Math.max(yDisplayBounds[1], firstNormalRange[1])
          ];
        }
      }
    }
    if (this.data.resourceGroup && this.data.resourceGroup.displayBounds) {
      yDisplayBounds = this.getDisplayBounds(
          yDisplayBounds[0], yDisplayBounds[1], this.data.resourceGroup);
    }

    this.adjustChartYScales(yDisplayBounds);
  }

  private adjustChartYScales(yDisplayBounds: [number, number]) {
    const padding = (yDisplayBounds[1] - yDisplayBounds[0]) * 0.25;
    this.chartOptions.scales.yAxes[0].ticks.min = yDisplayBounds[0] - padding;
    this.chartOptions.scales.yAxes[0].ticks.max = yDisplayBounds[1] === 100 ?
        yDisplayBounds[1] :
        yDisplayBounds[1] + padding;
    this.chartOptions.scales.yAxes[0].afterBuildTicks = (scale) => {
      if (this.data && this.data.yTicks) {
        scale.ticks =
            LineGraphData.getYTicks(yDisplayBounds[0], yDisplayBounds[1]);
      }
    };
  }

  private getDisplayBounds(
      minInSeries: number, maxInSeries: number,
      resourceCodeGroup: ResourceCodeGroup): [number, number] {
    let yAxisDisplayMin;
    let yAxisDisplayMax;
    if (resourceCodeGroup.forceDisplayBounds) {
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
      yAxisDisplayMin = (resourceCodeGroup.displayBounds[0] >= minInSeries) ?
          resourceCodeGroup.displayBounds[0] :
          minInSeries;
      // We choose the provided max bound if it is smaller than the max of the
      // data, to cut off abnormal values.
      yAxisDisplayMax = (resourceCodeGroup.displayBounds[1] <= maxInSeries) ?
          resourceCodeGroup.displayBounds[1] :
          maxInSeries;
    }
    return [yAxisDisplayMin, yAxisDisplayMax];
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

    // Draw label lines for the high and low bounds of the normal range.
    const lines = [
      ['Normal boundary: ', yNormalBounds[1], -8],
      ['Normal boundary: ', yNormalBounds[0], 8]
    ];

    for (const line of lines) {
      const lbl = line[0];
      const val = line[1];
      const yOffsetPx = line[2];
      const bound = {
        type: 'line',
        mode: 'horizontal',
        scaleID: GraphComponent.Y_AXIS_ID,
        value: val,
        borderColor: 'rgba(64, 191, 128, 0.25)',
        borderWidth: 1,
        label: {
          enabled: true,
          // Clear background color.
          backgroundColor: 'rgba(0,0,0,0.0)',
          // Black text for label.
          fontColor: 'rgba(0, 0, 0, 0.8)',
          fontFamily: 'Work Sans',
          content: lbl + val.toString() + ' ' + this.data.unit,
          // Shift the text above or below the line, and to the right side of
          // the axis.
          position: 'right',
          yAdjust: yOffsetPx
        }
      };

      this.chartOptions.annotation.annotations.push(bound);
    }
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
      } else {
        pointBackgroundColors.push(
            labeledSeries.legendInfo.fill.rgb().string());
        pointBorderColors.push(labeledSeries.legendInfo.outline.rgb().string());
      }
      chartjsSeries.pointBackgroundColor = pointBackgroundColors;
      chartjsSeries.pointBorderColor = pointBorderColors;
    }
  }
}
