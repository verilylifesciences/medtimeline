
// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {DateTime, Interval} from 'luxon';
import {getTickMarksForXAxis} from 'src/app/date_utils';

export class DateTimeXAxis {
  // The x-axis configuration for the chart.
  xAxisConfig: c3.XAxisConfiguration;

  // The labels that should appear on the x-axis.
  xAxisLabels: string[];

  constructor(
      /**
       * The date range this x axis configuration should cover.
       */
      readonly dateRange: Interval, private readonly maxXTicks = 10) {
    this.makeXAxis();
  }

  /**
   * If the date range is changed, adjust the x-axis tick marks displayed. This
   * method does not need to be called otherwise, as the x-axis should stay
   * constant unless the date range is changed.
   * @param maxXTicks The maximum number of labeled ticks to display. By
   *     default, any date range lasting shorter than maxXTicks will show tick
   *     marks with labels at each 24-hour mark, and tick marks without labels
   *     at 12-hour marks.
   */
  private makeXAxis() {
    const daysInRange = getTickMarksForXAxis(this.dateRange, true);
    // The ticks with labels displayed.
    const ticksLabels = new Array<DateTime>();
    // All ticks displayed.
    let ticks = new Array<DateTime>();
    if (Math.floor(daysInRange.length / 2) <= this.maxXTicks) {
      // Ticks are separated by 1 day intervals, in which case we show ticks
      // with no labels at the 12-hour mark.
      ticks = daysInRange;
      for (let i = 0; i < daysInRange.length; i += 2) {
        ticksLabels.push(daysInRange[i]);
      }
    } else {
      // Ticks are separated by intervals > 1 day, in which case we show ticks
      // with no labels at the day mark.
      const iteration = Math.ceil(daysInRange.length / this.maxXTicks);
      ticksLabels.push(daysInRange[0]);
      let date = daysInRange[0];
      while (date <= this.dateRange.end) {
        date = date.plus({days: iteration});
        ticksLabels.push(date);
      }
      date = daysInRange[0];
      ticks.push(date);
      while (date <= this.dateRange.end) {
        date = date.plus({days: 1});
        ticks.push(date);
      }
    }

    this.xAxisLabels = ticksLabels.map(x => x.toISO());

    this.xAxisConfig = {
      type: 'timeseries',
      min: this.dateRange.start.toLocal().startOf('day').toJSDate(),
      max: this.dateRange.end.toLocal().endOf('day').toJSDate(),
      localtime: true,
      tick: {
        // To reduce ambiguity we include the hour as well.
        format: '%m/%d %H:%M',
        multiline: true,
        fit: true,
        values: ticks.map(x => Number(x))
      }
    };
  }
}
