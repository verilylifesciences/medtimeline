// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {DateTime, Duration, Interval} from 'luxon';
/**
 * For this the given date range, returns a DateTime for each day in the time
 * range as a list in chronological order--possibly plus one extra day on
 * the end.
 * The first DateTime in the list will be at or prior to the first item in
 * timeRange, and the last DateTime in the list will be at or after the
 * second item in timeRange, so that all data points in timeRange will be
 * enclosed by the days listed in the returned array.
 *
 * @returns A list of the days in chronological order within the time range.
 */
export function getDaysInRange(dateRange: Interval): DateTime[] {
  const days: DateTime[] = [];
  const startDate: DateTime = dateRange.start.startOf('day');
  const dayCount =
      Duration.fromMillis(dateRange.end.toMillis() - startDate.toMillis()).as(
          'days');

  for (let i = 0; i <= dayCount; i++) {
    days.push(startDate.plus({days: i}));
  }

  // If the timestamp of the last day in the range is not 00:00, then we
  // want to include that day in the listed range.
  if (dateRange.end.startOf('day').toISO() !== dateRange.end.toISO()) {
    days.push(startDate.plus({days: dayCount + 1}));
  }

  return days;
}

/**
 * Returns a DateTime for each day contained in any of the intervals in the
 * passed-in interval set. If the interval set contains day-boundaries, it will
 * add an extra day to be sure to encompass the full day, like getDaysInRange.
 * The days returned will be in an array in time order.
 *
 * @param intervals The intervals to list all the days for.
 */
export function getDaysForIntervalSet(intervals: Interval[]): DateTime[] {
  const days: DateTime[] = [];
  const allIntervals = Interval.merge(intervals);
  for (const interval of allIntervals) {
    getDaysInRange(interval).forEach(x => days.push(x));
  }
  return days.sort();
}
