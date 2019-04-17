// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import * as Color from 'color';
/**
 * Encodings of the colors for Verily branding.
 */

// Primary color palette
export const GREY_900 = Color('#202020');
export const BLACK = Color('#000000');
export const BLUE_A400 = Color('#2878FF');
export const BLUE_A700 = Color('#2861FF');
export const DEEP_PURPLE_600 = Color('#5E35B1');
export const DEEP_PURPLE_800 = Color('#4527A0');
export const PINK_A700 = Color('#C41061');
export const PINK_900 = Color('#870D4E');
export const PINK_A400 = Color('#FF1643');
export const PINK_A700_DARKER = Color('#D40000');
export const BLUE_GREY_100 = Color('#C3D7DB');
export const BLUE_GREY_500 = Color('#5F7C8A');
export const BLUE_GREY_50 = Color('#EBEEF0');
export const WHITE = Color('#FFFFFF');

// Secondary color palette
export const CYAN = Color('#00C6EF');
export const DEEP_CYAN = Color('#009DB7');
export const TURQUOISE = Color('#07796A');
export const DEEP_TURQUOISE = Color('#045B4C');
export const GREEN = Color('#0D8D39');
export const DEEP_GREEN = Color('#056823');
export const LIME = Color('#80BA17');
export const DEEP_LIME = Color('#668E0E');
export const GOLD = Color('#FFB233');
export const DEEP_GOLD = Color('#C38419');
export const ORANGE = Color('#FF8117');
export const DEEP_ORANGE = Color('#C35308');
export const CORAL = Color('#FF5052');
export const DEEP_CORAL = Color('#C14047');

// Color to indicate a selected item.
export const SELECTED = BLUE_GREY_50;

export const ABNORMAL = PINK_A700_DARKER;

/**
 * Returns all the colors that are acceptable for data points to be plotted in.
 */
export function getDataColors(): Color[] {
  return [GREY_900, BLUE_A700, DEEP_PURPLE_800, PINK_900, GREEN, GOLD];
}
