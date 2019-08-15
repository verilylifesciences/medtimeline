// Copyright 2019 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

/**
 * FHIR type from the DSTU2 version of the standard. Used for containing
 * or referencing attachments (additional data content defined in other formats).
 * Fhir Documentation: https://www.hl7.org/fhir/datatypes.html#Attachment
 */
export class Attachment {
    /** Mime type of the content: Ex: text/html, application/pdf */
    readonly contentType: string;
    /** Fhir link to location of data */
    readonly url: string;

    constructor(jsonPresentedForm: any) {
      this.contentType = jsonPresentedForm.contentType;
      this.url = jsonPresentedForm.url;
    }
}
