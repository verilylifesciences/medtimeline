// Copyright 2019 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.


import {Narrative} from './narrative';

/**
 * A Narrative with additional information specific to diagnostic reports.
 * We are assumming that the html structure will remain the same-
 * in the inner div, it is broken upinto paragraph (<p></p>) in the
 * following order:
 *    <b>Diagostic Report</b> (just the title, no data)
 *    <b>Document Type</b>: xxx
 *    <b>Document Title</b>: xxx
 *    <b>Status</b>: xxx
 *    <b>Verifying Provider</b>: xxx
 *    <b>Ordering Provider</b>: xxx
 */
export class AnnotatedNarrative {
  /**
   * Title of the radiology report- in different formats though:
   * CT Abdomen w/ Contrast
   * XR Wrist Complete Left
   */
  readonly title: string;
  /**
   * Modality of imaging that can be pulled from the radiology text.
   * Currently used to categorize the reports along the y-axis.
   */
  readonly modality: string;

  readonly narrative: Narrative;

  constructor(narrative: Narrative) {
    // 'Document Title' is the title that we wish to pull out from the HTML text.
    const TITLE_STRING = 'Document Title';
    const elem = document.createElement('html');
    elem.innerHTML = narrative.div;

    this.title = this.getValueFromHTML(elem, TITLE_STRING);
    this.modality = this.getModalityFromTitle(this.title);
    this.narrative = narrative;
  }

  /**
   * Helper function to extract the value from the HTML text
   * using regex. If there is no match, it returns an empty string.
   * @param elem HTMLHtmlElement representing the structure in the HTML text
   * @param section Title of the section in the HTML text that we want to extract
   */
  private getValueFromHTML(elem: HTMLHtmlElement, section: string): string {
    const regexExp = /<b>.*<\/b>: /g;
    const htmlCollection = elem.getElementsByTagName('p');

    // Iterating through the HTML elements to add the titles to an array.
    for (let i = 0; i < htmlCollection.length; i++) {
      const htmlText = htmlCollection[i].innerHTML;
      const matchingTitle = htmlText.match(regexExp);

      // If there are more than one matches to the regex that we are searching,
      // we return an empty string.
      if (matchingTitle && matchingTitle.length === 1 &&
          matchingTitle[0] === ('<b>' + section + '</b>: ')) {
        return htmlText.replace(regexExp, '');
      }
    }
    return '';
  }
  /**
   * Helper function to extract the modality of the radiology image from
   * the title string. We are assuming that the modality is the first 'word'
   * in front of the white space for now.
   * TODO: See what all the possible modalities are and conduct a search
   * rather than blindly assuming that the first substring is the modality.
   * @param title String that reflects the title of the radiology report.
   */
  private getModalityFromTitle(title: string): string {
    return title.split(' ')[0];
  }
}
