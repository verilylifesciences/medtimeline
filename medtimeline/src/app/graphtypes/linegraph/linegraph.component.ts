// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {Component, forwardRef, Input} from '@angular/core';
import {DomSanitizer} from '@angular/platform-browser';
import {ChartPoint} from 'chart.js';
import {LineGraphData} from 'src/app/graphdatatypes/linegraphdata';
import {ABNORMAL} from 'src/app/theme/bch_colors';

import {GraphComponent} from '../graph/graph.component';
import {LegendInfo} from '../legend-info';

@Component({
  selector: 'app-linegraph',
  templateUrl: '../graph/graph.component.html',
  styleUrls: ['../graph.css'],
  providers: [
    {provide: GraphComponent, useExisting: forwardRef(() => LineGraphComponent)}
  ]
})
export class LineGraphComponent extends GraphComponent<LineGraphData> {
  @Input() showTicks: boolean;

  constructor(readonly sanitizer: DomSanitizer) {
    super(sanitizer);
  }

  prepareForChartConfiguration() {
    if (this.data.yAxisDisplayBounds) {
      // We only ever have one y-axis so it's safe to work only on the 0th
      // subscript here.
      this.chartOptions.scales.yAxes[0].ticks.min =
          this.data.yAxisDisplayBounds[0];
      this.chartOptions.scales.yAxes[0].ticks.max =
          this.data.yAxisDisplayBounds[1];
    }
  }

  adjustGeneratedChartConfiguration() {
    // We have to wait until after the data loads up into the graph to iterate
    // over the points and adjust their coloring based on the normal range.
    this.addYNormalRange();
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
    // If there's more than one series on this graph we don't mark a normal
    // region because they might not be the same.
    if (this.data.series.length !== 1) {
      return;
    }
    const yBounds = this.data.series[0].yNormalBounds;
    // If there aren't bounds, there's nothing to add.
    if (!yBounds) {
      return;
    }

    this.addGreenRegion(yBounds);
    this.colorAbnormalPoints(yBounds, this.data.series[0].legendInfo);
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
      ['High normal boundary: ', yNormalBounds[1], -8],
      ['Low normal boundary: ', yNormalBounds[0], 8]
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
        borderColor: 'rgba(64, 191, 128, 1)',
        borderWidth: 2,
        label: {
          enabled: true,
          // Clear background color.
          backgroundColor: 'rgba(0,0,0,0.0)',
          // Black text for label.
          fontColor: 'rgba(0, 0, 0, 0.8)',
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
   * Colors the point the default series color if it's in the normal range,
   * or the designated "abnormal" color if it's outside of the normal range.
   *
   * @param yNormalBounds The bounds of what should be considered normal.
   * @param seriesLegend The legend info for the series we're working with.
   */
  private colorAbnormalPoints(
      yNormalBounds: [number, number], seriesLegend: LegendInfo) {
    const pointBackgroundColors = new Array<string>();
    const pointBorderColors = new Array<string>();

    if (this.chartData.length > 0) {
      // We only ever get here if there's a single labeled series so it's okay
      // from here on out to only work with the 0th index of the data.
      for (let pt of this.chartData[0].data) {
        // pt could also be a number here, so we constrain it to when it's a
        // ChartPoint. For some reason Typescript doesn't like it when we do a
        // test to see if pt is an instanceof ChartPoint so checking for the
        // y-attribute is a workaround.
        if (pt.hasOwnProperty('y')) {
          pt = pt as ChartPoint;
          if (pt.y < yNormalBounds[0] || pt.y > yNormalBounds[1]) {
            pointBackgroundColors.push(seriesLegend.fill.rgb().string());
            pointBorderColors.push(ABNORMAL.rgb().string());
          } else {
            pointBackgroundColors.push(seriesLegend.fill.rgb().string());
            pointBorderColors.push(seriesLegend.outline.rgb().string());
          }
        }
      }

      this.chartData[0].pointBackgroundColor = pointBackgroundColors;
      this.chartData[0].pointBorderColor = pointBorderColors;
    }
  }
}
