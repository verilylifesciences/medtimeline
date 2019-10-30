import {DateTime, Interval} from 'luxon';

import {GraphData} from './graphdata';
import {LabeledSeries} from './labeled-series';

// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

describe('GraphData', () => {
  it('dataPointsInRange should return an accurate result for one series',
     () => {
       const jan12 =
           LabeledSeries.fromInitialPoint(DateTime.local(2010, 1, 12), 1);
       const data = new GraphData([jan12], new Map());
       expect(data.dataPointsInRange(Interval.fromDateTimes(
                  DateTime.local(2010, 1, 1), DateTime.local(2010, 1, 30))))
           .toBeTruthy();

       expect(data.dataPointsInRange(Interval.fromDateTimes(
                  DateTime.local(2010, 1, 1), DateTime.local(2010, 1, 10))))
           .toBeFalsy();
     });

  it('dataPointsInRange should return an accurate result for multiple series',
     () => {
       const jan12 =
           LabeledSeries.fromInitialPoint(DateTime.local(2010, 1, 12), 1);
       const jan30 =
           LabeledSeries.fromInitialPoint(DateTime.local(2010, 1, 30), 1);
       const data = new GraphData([jan12, jan30], new Map());
       expect(data.dataPointsInRange(Interval.fromDateTimes(
                  DateTime.local(2010, 1, 1), DateTime.local(2010, 1, 30))))
           .toBeTruthy();

       expect(data.dataPointsInRange(Interval.fromDateTimes(
                  DateTime.local(2010, 1, 1), DateTime.local(2010, 1, 13))))
           .toBeTruthy();

       expect(data.dataPointsInRange(Interval.fromDateTimes(
                  DateTime.local(2010, 1, 15), DateTime.local(2010, 1, 30))))
           .toBeTruthy();

       expect(data.dataPointsInRange(Interval.fromDateTimes(
                  DateTime.local(2010, 1, 1), DateTime.local(2010, 1, 9))))
           .toBeFalsy();
     });
});
