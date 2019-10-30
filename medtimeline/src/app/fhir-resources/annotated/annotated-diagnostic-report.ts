// Copyright 2019 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {DiagnosticReport} from '../diagnostic-report';
import {Narrative} from '../narrative';
import {TimestampedObject} from '../sets/fhir-resource-set';

/**
 * A diagnostic report with Narrative text extended.
 * Necessary because Narrative is not officially part of the
 * DSTU2 standard of FHIR, but it is an attribute on the
 * DomainResource model that DiagnosticReport is built on top of
 */
export class AnnotatedDiagnosticReport extends TimestampedObject {
  readonly report: DiagnosticReport;

  /** Text containing details of the radiology report */
  readonly text: Narrative;

  /** HTML string reflecting the content inside the url. */
  readonly attachmentHtml: string;

  constructor(report: DiagnosticReport, attachmentHtml?: string) {
    super(report.timestamp);

    // Grabbing information from the html text in json only if
    // it exists
    if (report.json.text) {
      this.text = new Narrative(report.json.text);
    }

    if (attachmentHtml) {
      this.attachmentHtml = attachmentHtml;
    }

    this.report = report;
  }
}
