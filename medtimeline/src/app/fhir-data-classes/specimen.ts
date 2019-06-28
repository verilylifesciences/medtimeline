// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {DateTime, Interval} from 'luxon';
/**
 * FHIR resource for a Specimen, from the DSTU2 standard.
 * https://www.hl7.org/fhir/DSTU2/specimen.html
 */
export class Specimen {
  /** If this is a contained resource, then it will have an ID string. */
  readonly id: string;

  /** Kind of material that forms the specimen */
  readonly type: string;

  /** Where the specimen was collected */
  readonly bodySite: string;

  /**
   * When the specimen was collected. The specimen will have one or the other
   * of these defined, but not both.
   */
  readonly collectedDateTime: DateTime;
  readonly collectedPeriod: Interval;

  constructor(json: any) {
    if (json.id) {
      this.id = json.id;
    }

    if (!json.type) {
      throw Error(
          'A specimen must have a type to be useful. JSON: ' +
          JSON.stringify(json));
    }

    this.type = json.type.text;

    if (!json.collection) {
      throw Error(
          'A specimen must have collection information to be useful. JSON: ' +
          JSON.stringify(json));
    }
    if (json.collection.collectedPeriod && json.collection.collectedDateTime) {
      throw Error(
          'Only collectedPeriod or collectionDateTime should be defined. JSON: ' +
          JSON.stringify(json));
    }

    if (json.collection.collectedPeriod) {
      const collectedPeriod = json.collection.collectedPeriod;
      // If only the start time is present, put it into collectedDateTime.
      if (collectedPeriod.start && !collectedPeriod.end) {
        this.collectedDateTime = DateTime.fromISO(collectedPeriod.start);
      } else {
        this.collectedPeriod = Interval.fromDateTimes(
            DateTime.fromISO(collectedPeriod.start),
            DateTime.fromISO(collectedPeriod.end));
      }
    }

    if (json.collection.collectedDateTime) {
      this.collectedDateTime =
          DateTime.fromISO(json.collection.collectedDateTime);
    }
  }
}
