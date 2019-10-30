// Copyright 2019 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.



import {MicrobioReport} from '../microbio-report';
import {TimestampedObject} from '../sets/fhir-resource-set';

/**
 * A microbio report with the timestamp for a specific culture type extended.
 * Necessary because Cerner's implementation of the microbio data
 * does not include the timestamp with the report, but rather with
 * the object.
 */
export class AnnotatedMicrobioReport extends TimestampedObject {
  readonly report: MicrobioReport;

  constructor(report: MicrobioReport) {
    // Get the timestamp from the collection time of the specimen.
    let timestamp;
    const specimen = report.specimen;
    if (specimen) {
      timestamp = specimen.collectedDateTime ?
          specimen.collectedDateTime :
          (specimen.collectedPeriod ? specimen.collectedPeriod.start :
                                      undefined);
    }
    super(timestamp);
    this.report = report;
  }
}
