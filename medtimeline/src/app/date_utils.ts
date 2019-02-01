// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {DateTime, Duration, Interval} from 'luxon';
/**
 * For the given date range, returns a DateTime for each day in the time
 * range (converting to local time first) as a list in chronological
 * order. All data points in dateRange will be enclosed by the days listed in
 * the returned array. If specified, additional DateTimes will be included at
 * the 12-hour mark of each day in the interval.
 * @param dateRange The date range to get tick marks for.
 * @param twelveHour Whether or not to include DateTimes at the 12-hour mark of
 *     each day.
 *
 * @returns A list of the days in chronological order within the time range.
 */
export function getTickMarksForXAxis(
    dateRange: Interval, twelveHour: boolean): DateTime[] {
  const days: DateTime[] = [];
  // The dateRange could be stored in UTC, so convert it back to local
  // time.
  const intervalLocal = Interval.fromDateTimes(
      dateRange.start.toLocal(), dateRange.end.toLocal());
  const startDate: DateTime = intervalLocal.start.startOf('day');
  const dayCount =
      Duration.fromMillis(intervalLocal.end.toMillis() - startDate.toMillis())
          .as('days');

  for (let i = 0; i <= dayCount; i++) {
    days.push(startDate.plus({days: i}));
    if (twelveHour) {
      days.push(startDate.plus({days: i, hours: 12}));
    }
  }

  return days;
}

/**
 * Returns a DateTime for each day contained in any of the intervals in the
 * passed-in interval set. If the interval set contains day-boundaries, it will
 * add an extra day to be sure to encompass the full day, like
 * getTickMarksForXAxis. The days returned will be in an array in time order.
 *
 * @param intervals The intervals to list all the days for.
 */
export function getDaysForIntervalSet(intervals: Interval[]): DateTime[] {
  const days: DateTime[] = [];
  const allIntervals = Interval.merge(intervals);
  for (const interval of allIntervals) {
    getTickMarksForXAxis(interval, false).forEach(x => days.push(x.toUTC()));
  }
  return days.sort();
}
