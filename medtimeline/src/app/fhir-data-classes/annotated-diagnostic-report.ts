// Copyright 2019 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {TimestampedObject} from '../fhir-resource-set';
import {DiagnosticReport} from './diagnostic-report';
import {Narrative} from './narrative';
import {AnnotatedNarrative} from './annotated-narrative';

/**
 * A diagnostic report with Narrative text extended.
 * Necessary because Narrative is not officially part of the
 * DSTU2 standard of FHIR, but it is an attribute on the
 * DomainResource model that DiagnosticReport is built on top of
 */
export class AnnotatedDiagnosticReport extends TimestampedObject {
  readonly report: DiagnosticReport;

  /** Text containing details of the radiology report */
  readonly text: AnnotatedNarrative;

  constructor(report: DiagnosticReport) {
    super(report.timestamp);

    // Grabbing information from the html text in json only if
    // it exists
    if (report.json.text) {
      const narrative = new Narrative(report.json.text);
      this.text = new AnnotatedNarrative(narrative);
    }

    this.report = report;
  }
}
