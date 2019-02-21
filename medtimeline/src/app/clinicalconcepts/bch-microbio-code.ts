// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {Interval} from 'luxon';

import {DiagnosticReport} from '../fhir-data-classes/diagnostic-report';

import {CachedResourceCodeGroup, ResourceCode} from './resource-code-group';

/**
 * Holds BCHMicrobioCode codes. BCH provides a custom mapping for their
 * microbiology data since retrieving it is not yet supported in the Cerner
 * FHIR API implementation.
 */
export class BCHMicrobioCode extends ResourceCode {
  static readonly CODING_STRING = 'http://cerner.com/bch_mapping/';

  // TODO(b/125441215): Make this accurate according to microbiology results
  dataAvailableInAppTimeScope(): Promise<boolean> {
    return Promise.resolve(false);
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
    return this.fhirService.getDiagnosticReports(this, dateRange)
        .then(result => {
          return result;
        });
  }
}
