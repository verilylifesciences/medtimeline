// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {Interval} from 'luxon';
import {APP_TIMESPAN} from 'src/constants';

import {DiagnosticReport} from '../fhir-data-classes/diagnostic-report';
import {FhirService} from '../fhir.service';

import {CachedResourceCodeGroup, ResourceCode} from './resource-code-group';

/**
 * Holds BCHMicrobioCode codes. BCH provides a custom mapping for their
 * microbiology data since retrieving it is not yet supported in the Cerner
 * FHIR API implementation.
 */
export class BCHMicrobioCode extends ResourceCode {
  static readonly CODING_STRING = 'http://cerner.com/bch_mapping/';

  dataAvailableInAppTimeScope(fhirService: FhirService): Promise<boolean> {
    // This is not an elegant way of implementing this function but since it's
    // a non-standard API server we aren't going to put much effort into
    // developing it further at this point.
    return fhirService.diagnosticReportsPresentWithCodes(
        new BCHMicrobioCodeGroup(
            fhirService, this.label, [this], undefined, undefined),
        APP_TIMESPAN);
  }
}

/**
 * Represents one or more LOINC codes that should be displayed together. In the
 * case of multiple LOINC codes in a group, you should provide a label for that
 * group.
 */
export class BCHMicrobioCodeGroup extends
    CachedResourceCodeGroup<DiagnosticReport> {
  /**
   * Gets a list of DiagnosticReports corresponding to this code group. Each
   * item in the list has the same specimen type as the label of this group, and
   * each report's list of results has a code that is in this group's list of
   * codes.
   */
  getResourceFromFhir(dateRange: Interval): Promise<DiagnosticReport[]> {
    return this.fhirService.getDiagnosticReports(this, dateRange);
  }

  /**
   * Returns whether there is any data available for this ResourceCode within
   * the fixed timescope of this app.
   * @override
   */
  dataAvailableInAppTimeScope(): Promise<boolean> {
    return this.fhirService.diagnosticReportsPresentWithCodes(
        this, APP_TIMESPAN);
  }
}
