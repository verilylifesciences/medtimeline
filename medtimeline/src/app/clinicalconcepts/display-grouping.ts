// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import * as Color from 'color';
import * as Colors from '../theme/verily_colors';

export const ALL_DISPLAY_GROUPS_MAP = new Map<string, DisplayGrouping>();

/**
 * Represents the category that a certain chart's data might fall into, for
 * example a MedicationConcept such as "Antibiotic" or a ClinicalConcept such as
 * "Lab result"
 */
export class DisplayGrouping {
  static colorIdx = 0;
  fill: Color;
  outline: Color;

  constructor(readonly label: string, color?: Color, outline?: Color) {
    let tempColor: Color = color;
    if (color === undefined) {
      tempColor = Colors.getDataColors()[DisplayGrouping.colorIdx];
      DisplayGrouping.colorIdx =
          (DisplayGrouping.colorIdx + 1) % Colors.getDataColors().length;
    }
    this.fill = tempColor;
    this.outline = outline ? outline : tempColor;
    ALL_DISPLAY_GROUPS_MAP.set(label, this);
  }
}

export const labResult = new DisplayGrouping('Lab Results', Colors.LIME);
export const vitalSign = new DisplayGrouping('Vital Signs', Colors.ORANGE);
export const med =
    new DisplayGrouping('Vancomycin and Gentamicin', Colors.TURQUOISE);
export const microbio = new DisplayGrouping('Microbiology', Colors.CYAN);
// We declare more DisplayGroupings related to Microbiology results that are
// used to classify points on the Microbiology chart.
export const posPrelimMB = new DisplayGrouping(
    'Check Result Preliminary', Color('#e4e2e2'), Colors.ABNORMAL);
export const negPrelimMB = new DisplayGrouping(
    'Negative Preliminary', Color('#e4e2e2'), Colors.BLUE_A700);
export const posFinalMB =
    new DisplayGrouping('Check Result Final', Colors.ABNORMAL);
export const negFinalMB =
    new DisplayGrouping('Negative Final', Colors.BLUE_A700);
// We declare DisplayGroupings that correspond to report statuses that we might
// encounter rarely.
export const posOtherNB =
    new DisplayGrouping('Check Result, Other', Colors.DEEP_GOLD);
export const negOtherMB =
    new DisplayGrouping('Negative, Other', Colors.DEEP_GOLD);
// Radiology Report categories
export const radiology = new DisplayGrouping('Radiology', Colors.PINK_900);
