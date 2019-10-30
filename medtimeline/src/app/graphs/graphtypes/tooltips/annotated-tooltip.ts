// Copyright 2019 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LIC

/**
 * Class containing information to display on the tooltips
 */
export class AnnotatedTooltip {
  /** InnerHTML representing the tooltipChart displayed as tooltip */
  readonly tooltipChart: string;
  /**
   * String[] containing the innerHTML of the additional attachments
   * to be displayed in the tooltip.
   */
  readonly additionalAttachment: string[];
  /**
   * Optional uniqueID used to map additionalAttachments to the correct
   * tooltip if necessary.
   */
  readonly id: string;

  constructor(tooltipChart: string, additionalAttachment?: string[], id?: string) {
      this.tooltipChart = tooltipChart;
      if (additionalAttachment) {
        this.additionalAttachment = additionalAttachment;
      }
      if (id) {
        this.id = id;
      }
  }

  /**
   * Combines the AnnotatedTooltip[] into a single AnnotatedTooltip by
   * concatenating the tooltipChart strings into a single string, and
   * combining the multiple additionalAttachment arrays into a single array.
   * This combined AnnotatedTooltip will not have a uniqueID, as the id is
   * only reserved for interfacing with the "Attachment" buttons.
   * @param tooltipArray AnnotatedTooltip[] that needs to be converted into a single
   * AnnotatedTooltip
   */
  public static combineAnnotatedTooltipArr(tooltipArray: AnnotatedTooltip[]): AnnotatedTooltip {

    const attachmentArrays = tooltipArray.map(tt => tt.additionalAttachment);
    // Flattens the array of arrays into one array
    const flattenedArray = ([] as string[]).concat(...attachmentArrays);

    let tooltipChart = '';
    for (const annotatedTT of tooltipArray) {
      tooltipChart += annotatedTT.tooltipChart;
    }
    return new AnnotatedTooltip(tooltipChart, flattenedArray);
  }
}
