// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {DateTime, Interval} from 'luxon';
import {ResultError} from './../result-error';

/**
 * This object represents basic information about an Encounter: what its
 * reason and type were, when it happened, and its ID.
 */
export class Encounter {
  readonly encounterId: string;
  readonly period: Interval;
  readonly requestId: string;

  constructor(private json: any, requestId: string) {
    this.encounterId = json.id;
    this.requestId = requestId;

    if (!json.period) {
      throw new ResultError(
          new Set([this.requestId]),
          'An encounter must have a time period.' + json);
    }

    if (!json.period.start) {
      throw new ResultError(
          new Set([this.requestId]), 'An encounter must have a start date.',
          json);
    }
    const startTime = DateTime.fromISO(json.period.start).toLocal();

    let endTime = json.period.end ?
        DateTime.fromISO(json.period.end).toLocal() :
        undefined;
    if (endTime === undefined || (endTime > DateTime.local())) {
      endTime = DateTime.local();
    }

    if (endTime < startTime) {
      throw new ResultError(
          new Set([this.requestId]),
          'The start time comes before the end time.' + json);
    }
    if (startTime > DateTime.local()) {
      throw new ResultError(
          new Set([this.requestId]), 'The start time is in the future.', json);
    }
    this.period = Interval.fromDateTimes(startTime, endTime);
  }
}
