// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {DisplayGrouping} from '../clinicalconcepts/display-grouping';

import {Axis} from './axis';

/**
 * An AxisGroup is a set of Axes that should be rendered on a single card
 * together.
 */
export class AxisGroup {
  /**
   * Constructs an AxisGroup.
   *
   * If label is unset in the constructor, then every axis in axes must have
   * the same label for the constructor to succeed. Similarly, if displayGroup
   * is unset, every axis must have the same resourceGroup.displayGrouping.
   */
  constructor(
      /**
       * The set of axes to be displayed in the same grouping.
       */
      readonly axes: Axis[],
      /**
       * The label for this axis group. If it isn't set here, we'll set it
       * using the label of the contained axes.
       */
      readonly label?: string,
      /**
       * The display grouping for this axis group. If it isn't set here, we'll
       * set it using the display grouping of the contained axes.
       */
      readonly displayGroup?: DisplayGrouping) {
    if (!label) {
      const labelSet = new Set(axes.map(axis => axis.label));
      if (labelSet.size !== 1) {
        throw Error(
            'The axis group has multiple labels, so we can\'t pick just one: ' +
            Array.from(labelSet.entries()));
      }
      this.label = axes[0].label;
    }

    if (!displayGroup) {
      const allDisplayGroups =
          new Set(axes.map(axis => axis.resourceGroup.displayGrouping.label));
      if (allDisplayGroups.size !== 1) {
        throw Error(
            'All axes on the same card need to have the same display grouping. Groups:' +
            Array.from(new Set(
                axes.map(axis => axis.resourceGroup.displayGrouping.label))));
      }
      this.displayGroup = axes[0].resourceGroup.displayGrouping;
    }

    // Go ahead and make the calls to get whether the data is available.
    Promise.resolve(this.dataAvailableInAppTimeScope());
  }

  /**
   * Returns whether there is any data available for any axes in this group
   * within the time scope of the app.
   */
  dataAvailableInAppTimeScope(): Promise<boolean> {
    return Promise
        .all(this.axes.map(axis => axis.dataAvailableInAppTimeScope()))
        .then(rsc => rsc.some(rsc => rsc === true));
  }
}
