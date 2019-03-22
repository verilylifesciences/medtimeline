// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {DateTime, Interval} from 'luxon';
/**
 * This object represents basic information about an Encounter: what its
 * reason and type were, when it happened, and its ID.
 */
export class Encounter {
  readonly encounterId: string;
  readonly period: Interval;

  constructor(private json: any) {
    this.encounterId = json.id;

    if (!json.period) {
      throw Error(
          'An encounter must have a time period. JSON: ' +
          JSON.stringify(json));
    }

    if (!json.period.start) {
      throw Error(
          'An encounter must have a start date. JSON: ' + JSON.stringify(json));
    }
    const startTime = DateTime.fromISO(json.period.start).toLocal();

    let endTime = json.period.end ?
        DateTime.fromISO(json.period.end).toLocal() :
        undefined;
    if (endTime === undefined || (endTime > DateTime.local())) {
      endTime = DateTime.local();
    }

    if (endTime < startTime) {
      throw Error(
          'The start time comes before the end time. JSON: ' +
          JSON.stringify(json));
    }
    if (startTime > DateTime.local()) {
      throw Error(
          'The start time is in the future.. JSON: ' + JSON.stringify(json));
    }
    this.period = Interval.fromDateTimes(startTime, endTime);
  }
}
