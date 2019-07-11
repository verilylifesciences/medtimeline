// Copyright 2019 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.



import {TimestampedObject} from '../fhir-resource-set';
import {DiagnosticReport} from './diagnostic-report';

/**
 * A diagnostic report with the timestamp for a specific culture type extended.
 */
export class AnnotatedDiagnosticReport extends TimestampedObject {
  readonly report: DiagnosticReport;

  constructor(report: DiagnosticReport) {
    // Get the timestamp from the collection time of the specimen.
    const specimen = report.specimen;
    let timestamp;
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
