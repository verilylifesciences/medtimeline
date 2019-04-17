
// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.
import * as Color from 'color';
import * as Colors from '../theme/verily_colors';
/**
 * Represents how a concept will be displayed in a legend, with a label, fill
 * color, and outline color.
 */
export class LegendInfo {
  private static colorIdx = 0;
  constructor(
      readonly label: string, readonly fill?: Color, readonly outline?: Color) {
    let tempColor: Color = fill;
    if (!fill) {
      tempColor = Colors.getDataColors()[LegendInfo.colorIdx];
      LegendInfo.colorIdx =
          (LegendInfo.colorIdx + 1) % Colors.getDataColors().length;
    }
    this.fill = tempColor;
    this.outline = outline ? outline : tempColor;
  }
}
