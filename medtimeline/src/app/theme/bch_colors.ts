// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import * as Color from 'color';
/**
 * Encodings of the colors for BCH branding.
 * http://www.childrenshospital.org/legal/brand-style-guidelines
 */

// Core brand colors
export const BOSTON_BLUE = Color.rgb(0, 48, 135);
export const BOSTON_SKY = Color.rgb(65, 182, 230);

// Brand colors
export const BOSTON_YELLOW = Color.rgb(242, 169, 0);
export const BOSTON_GREEN = Color.rgb(115, 150, 0);
export const BOSTON_INDIGO = Color.rgb(0, 115, 150);
export const BOSTON_BAY = Color.rgb(110, 124, 160);
export const BOSTON_PINK = Color.rgb(198, 87, 154);
export const BOSTON_LAVENDER = Color.rgb(140, 71, 153);
export const BOSTON_PURPLE = Color.rgb(128, 34, 95);


// Complimentary brand colors
export const BOSTON_MORNING = Color.rgb(251, 219, 101);
export const BOSTON_MEADOW = Color.rgb(164, 214, 94);
export const BOSTON_WARM_GRAY = Color.rgb(197, 185, 172);

// Auxiliary color (only used for emergency, blood, or stop)
export const BOSTON_RED = Color.rgb(246, 50, 62);

// Color to indicate a selected item.
// Material-light version of secondary color (BOSTON_LAVENDER).
export const SELECTED = Color('#d7c3db');

// Rules for which text colors can be used for which backgrounds
const DO_NOT_USE_WHITE_TYPE = [BOSTON_YELLOW, BOSTON_MORNING, Color.WHITE];
const DO_NOT_USE_BLACK_TYPE = [BOSTON_BLUE, BOSTON_PURPLE];
const CAN_USE_BOSTON_BLUE_TYPE =
    [BOSTON_SKY, Color.WHITE, BOSTON_MORNING, BOSTON_MEADOW, BOSTON_WARM_GRAY];
const CAN_USE_BOSTON_SKY_TYPE = [BOSTON_BLUE];

/**
 * Gets a list of acceptable text colors for a given background color.
 * @param backgroundColor The background color you plan to display the text on
 */
export function getTypeColors(backgroundColor: Color): Color[] {
  const acceptableColors: Color[] = [];
  if (!DO_NOT_USE_WHITE_TYPE.find(backgroundColor)) {
    acceptableColors.push(Color.WHITE);
  }
  if (!DO_NOT_USE_BLACK_TYPE.find(backgroundColor)) {
    acceptableColors.push(Color.BLACK);
  }
  if (CAN_USE_BOSTON_BLUE_TYPE.find(backgroundColor)) {
    acceptableColors.push(BOSTON_BLUE);
  }
  if (CAN_USE_BOSTON_SKY_TYPE.find(backgroundColor)) {
    acceptableColors.push(BOSTON_SKY);
  }
  return acceptableColors;
}


/**
 * Returns all the colors that are acceptable for data points to be plotted in.
 */
export function getDataColors(): Color[] {
  return [
    BOSTON_BLUE, BOSTON_YELLOW, BOSTON_GREEN, BOSTON_PINK, BOSTON_PURPLE,
    BOSTON_INDIGO
  ];
}
