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
  /** HTML string reflecting the content inside the url*/
  readonly html: string;

  constructor(jsonPresentedForm: any) {
    this.contentType = jsonPresentedForm.contentType;
    this.url = jsonPresentedForm.url;
    // TODO: Currently temporary; next PR remove the hard-coded sections
    const html_string = '<!DOCTYPE html SYSTEM "about:legacy-compat">' +
    '<html><head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8">' +
    '<title>RADRPT</title></head><body marginwidth="6" marginheight="6" leftmargin="6" topmargin="6"><div valign="top">' +
    '<div class="linked-rad-procedure" data-event-cd="4062628" data-event-id="6447285" data-doc-status="AUTH">' +
    '<div class="subject" style="font-family: Arial; font-size: 10pt; font-weight: bold; white-space: pre-wrap;">XR Ankle Complete Right</div><div class="reason-for-exam" data-comment-id="6566290" data-comment-type="REASONFOREXM" style="padding-left: 1em;">' +
    '<div class="subject" style="font-family: Arial; font-size: 10pt; font-weight: bold; white-space: pre-wrap;">Reason For Exam</div><div class="content" style="font-family: Arial; font-size: 10pt; white-space: pre-wrap;">Pain' +
    '<div style="white-space: pre-wrap;"> ' +
    '</div></div></div></div>' +
    '<div class="section" data-doc-status="AUTH" data-is-addendum="false" data-subject="Report" data-event-id="6447290" data-event-cd="4062668" data-section-sequence="0001">' +
    '<div class="subject" style="font-family: Arial; font-size: 10pt; font-weight: bold; white-space: pre-wrap;">Report</div><div class="content" style="font-family: Helvetica,sans-serif,Lucida Sans Unicode; font-size: 12pt; font-weight: normal; font-style: normal; text-decoration: none; color: rgb(0,0,0); background-color: transparent; margin-top: 0.0pt; margin-bottom: 0.0pt; text-indent: 0.0in; margin-left: 0.0in; margin-right: 0.0in; text-align: left; border-style: none; border-width: 0.75pt; border-color: rgb(0,0,0); padding: 0.0pt; white-space: pre-wrap;"><div>CLINICAL HISTORY: Twisted right ankle, pain in joint</div><div>     </div><div>Routine 3-view radiographs of the right ankle were obtained.  No comparison films were available for this examination.  Normal anatomic alignment of the the ankle structure.  No fracture or dislocation is seen.  Bone mineralization is normal.  No arthritis is observed in the joint.</div><div>     </div><div>IMPRESSION</div><div style="text-indent: -0.25in; margin-left: 0.5in;"><div style="width:23.94px; display:inline-block; text-indent:0; ">1. </div>Normal.  No fracture is seen.</div>' +
    '<div style="white-space: pre-wrap;"> ' +
    '</div></div><div class="sign-line-header" style="font-family: Arial; font-size: 10pt; font-weight: bold; white-space: pre-wrap;">Signature Line<div class="sign-line" style="font-family: Arial; font-weight: normal; font-size: 10pt; white-space: pre-wrap;">***** Final *****' +
    'Signed (Electronic Signature):  06/24/2016 12:59 pm' +
    'Signed by:  McCurdy, Michael</div>' +
    '<div style="white-space: pre-wrap;"> ' +
    '</div></div></div>' +
    '<div class="heading">' +
    '<div class="content" style="font-family: Times,serif,Lucida Sans Unicode; font-size: 12pt; font-weight: normal; font-style: normal; text-decoration: none; color: rgb(0,0,0); margin-top: 0pt; margin-bottom: 0pt; text-indent: 0.0in; margin-left: 0.0in; margin-right: 0.0in; text-align: left; border-style: none; border-width: 0pt; border-color: rgb(0,0,0); padding: 0pt;"><div><table style="border: 1pt; table-layout: fixed; font-family: Helvetica,sans-serif,Lucida Sans Unicode; font-size: 10pt; border-collapse: collapse;" valign="top"><tbody style="margin-left: 0pt; margin-right: 0pt; text-indent: 0pt; text-align: left;"><tr><td style="font-weight: normal; text-align: left; border: 1pt; padding: 0px 25px 0px 0px; word-wrap: break-word;" valign="top" colspan="1" rowspan="1"><div>Result type:</div></td><td style="border: 1pt; padding: 0px 25px 0px 0px; word-wrap: break-word;" valign="top" colspan="1" rowspan="1"><div>XR Ankle Complete Right</div></td></tr><tr><td style="font-weight: normal; text-align: left; border: 1pt; padding: 0px 25px 0px 0px; word-wrap: break-word;" valign="top" colspan="1" rowspan="1"><div>Result date:</div></td><td style="border: 1pt; padding: 0px 25px 0px 0px; word-wrap: break-word;" valign="top" colspan="1" rowspan="1"><div>June 24, 2016 12:57 CDT</div></td></tr><tr><td style="font-weight: normal; text-align: left; border: 1pt; padding: 0px 25px 0px 0px; word-wrap: break-word;" valign="top" colspan="1" rowspan="1"><div>Result status:</div></td><td style="border: 1pt; padding: 0px 25px 0px 0px; word-wrap: break-word;" valign="top" colspan="1" rowspan="1"><div>Auth (Verified)</div></td></tr><tr><td style="font-weight: normal; text-align: left; border: 1pt; padding: 0px 25px 0px 0px; word-wrap: break-word;" valign="top" colspan="1" rowspan="1"><div>Result title:</div></td><td style="border: 1pt; padding: 0px 25px 0px 0px; word-wrap: break-word;" valign="top" colspan="1" rowspan="1"><div>RADRPT</div></td></tr><tr><td style="font-weight: normal; text-align: left; border: 1pt; padding: 0px 25px 0px 0px; word-wrap: break-word;" valign="top" colspan="1" rowspan="1"><div>Ordered by:</div></td><td style="border: 1pt; padding: 0px 25px 0px 0px; word-wrap: break-word;" valign="top" colspan="1" rowspan="1"><div>McCurdy, Michael on June 24, 2016 12:51 CDT</div></td></tr><tr><td style="font-weight: normal; text-align: left; border: 1pt; padding: 0px 25px 0px 0px; word-wrap: break-word;" valign="top" colspan="1" rowspan="1"><div>Performed by:</div></td><td style="border: 1pt; padding: 0px 25px 0px 0px; word-wrap: break-word;" valign="top" colspan="1" rowspan="1"><div>McCurdy, Michael on June 24, 2016 12:57 CDT</div></td></tr><tr><td style="font-weight: normal; text-align: left; border: 1pt; padding: 0px 25px 0px 0px; word-wrap: break-word;" valign="top" colspan="1" rowspan="1"><div>Verified by:</div></td><td style="border: 1pt; padding: 0px 25px 0px 0px; word-wrap: break-word;" valign="top" colspan="1" rowspan="1"><div>McCurdy, Michael on June 24, 2016 12:59 CDT</div></td></tr><tr><td style="font-weight: normal; text-align: left; border: 1pt; padding: 0px 25px 0px 0px; word-wrap: break-word;" valign="top" colspan="1" rowspan="1"><div>Encounter info:</div></td><td style="border: 1pt; padding: 0px 25px 0px 0px; word-wrap: break-word;" valign="top" colspan="1" rowspan="1"><div>20003410, Baseline East, Outpatient, 10/31/2018 - </div></td></tr></tbody></table></div>' +
    '<div style="white-space: pre-wrap;"> ' +
    '</div></div></div>' +
    '</div></body></html>';
    this.html = html_string;
  }
}
