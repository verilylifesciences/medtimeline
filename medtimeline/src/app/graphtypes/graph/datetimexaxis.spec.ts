// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {DateTime, Interval} from 'luxon';

import {DateTimeXAxis} from './datetimexaxis';

describe('DateTimeXAxis', () => {
  it('axis mins and maxes should match the input intervals', () => {
    const fiveDayAxis = new DateTimeXAxis(Interval.fromDateTimes(
        DateTime.fromISO('2019-05-01T11:00:00'),
        DateTime.fromISO('2019-05-09T01:00:00')));

    expect(fiveDayAxis.xAxisConfig.min)
        .toEqual(DateTime.fromISO('2019-05-01T00:00:00').toJSDate());
    expect(fiveDayAxis.xAxisConfig.max)
        .toEqual(DateTime.fromISO('2019-05-09').endOf('day').toJSDate());
  });

  it('x ticks should enclose both ends of the data range', () => {
    const dateRange = Interval.fromDateTimes(
        DateTime.utc(1990, 7, 13, 12), DateTime.utc(1990, 7, 15, 12));
    const axis = new DateTimeXAxis(dateRange);

    expect(axis.xAxisConfig.tick.values).toEqual([
      DateTime.local(1990, 7, 13),
      DateTime.local(1990, 7, 13, 12),
      DateTime.local(1990, 7, 14),
      DateTime.local(1990, 7, 14, 12),
      DateTime.local(1990, 7, 15),
      DateTime.local(1990, 7, 15, 12),
    ].map(x => Number(x)));
  });

  it('x ticks should be separated by day intervals if the date range is large',
     () => {
       const dateRange = Interval.fromDateTimes(
           DateTime.utc(1990, 7, 13, 12), DateTime.utc(1990, 7, 25, 12));

       const axis = new DateTimeXAxis(dateRange);

       expect(axis.xAxisConfig.tick.values).toEqual([
         DateTime.local(1990, 7, 13),
         DateTime.local(1990, 7, 14),
         DateTime.local(1990, 7, 15),
         DateTime.local(1990, 7, 16),
         DateTime.local(1990, 7, 17),
         DateTime.local(1990, 7, 18),
         DateTime.local(1990, 7, 19),
         DateTime.local(1990, 7, 20),
         DateTime.local(1990, 7, 21),
         DateTime.local(1990, 7, 22),
         DateTime.local(1990, 7, 23),
         DateTime.local(1990, 7, 24),
         DateTime.local(1990, 7, 25),
         DateTime.local(1990, 7, 26),
       ].map(x => Number(x)));
     });


  it('x ticks should work for very small ranges', () => {
    const dateRange = Interval.fromDateTimes(
        DateTime.local(1964, 3, 22, 12), DateTime.local(1964, 3, 22, 20));

    const axis = new DateTimeXAxis(dateRange);

    expect(axis.xAxisConfig.tick.values).toEqual([
      DateTime.local(1964, 3, 22),
      DateTime.local(1964, 3, 22, 12),
    ].map(x => Number(x)));
  });

  it('x ticks should not go an extra day past the end of the data range' +
         ' if the endpoint is at a date boundary',
     () => {
       const dateRange = Interval.fromDateTimes(
           DateTime.local(1995, 7, 21, 12), DateTime.local(1995, 7, 24, 0));

       const axis = new DateTimeXAxis(dateRange);

       expect(axis.xAxisConfig.tick.values).toEqual([
         DateTime.local(1995, 7, 21),
         DateTime.local(1995, 7, 21, 12),
         DateTime.local(1995, 7, 22),
         DateTime.local(1995, 7, 22, 12),
         DateTime.local(1995, 7, 23),
         DateTime.local(1995, 7, 23, 12),
         DateTime.local(1995, 7, 24),
         DateTime.local(1995, 7, 24, 12),
       ].map(x => Number(x)));
     });
});
