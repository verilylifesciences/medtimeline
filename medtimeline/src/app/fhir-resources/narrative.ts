// Copyright 2019 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

/**
 * Fhir documentation: https://www.hl7.org/fhir/narrative.html
 * Exists as an attribute of DomainResource
 * (https://www.hl7.org/fhir/DSTU2/domainresource.html)
 */
export class Narrative {
  /** The original html; might be presented in different formats */
  readonly div: string;
  /** Status of the text: generated | extensions | additional | empty*/
  readonly status: string;

  constructor(jsonText: any) {
    if (jsonText) {
      this.div = jsonText.div;
      this.status = jsonText.status;
    }
  }
}
