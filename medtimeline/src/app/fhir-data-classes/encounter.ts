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
  readonly reason: string;
  readonly type: string;

  constructor(private json: any) {
    this.encounterId = json.identifier;
    try {
      this.period = Interval.fromDateTimes(
          DateTime.fromISO(json.period.start),
          json.period.end ? DateTime.fromISO(json.period.end) : DateTime.utc());
    } catch {
      throw Error(
          'An encounter must have a start date. JSON: ' + JSON.stringify(json));
    }
    this.type = json.type;
    this.reason = json.reason;
  }
}
