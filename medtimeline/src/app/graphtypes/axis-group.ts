// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {DisplayGrouping} from '../clinicalconcepts/display-grouping';

import {Axis} from './axis';

/**
 * An AxisGroup is a set of Axes that should be rendered on a single card
 * together.
 *
 * Upon construction, the AxisGroup kicks off a FHIR call to determine whether
 * there is data available for the AxisGroup within the time span of the
 * application. When the promise returns, its result is stored in the
 * dataAvailable class variable.
 *
 * None of the information in AxisGroup changes over the application's
 * lifecycle.
 */
export class AxisGroup {
  /**
   * Whether there is data available in the app timescope for this axis group.
   * Marked as public because Angular templates need to get to it, and marked
   * as mutable since it's changed by a promise result, but its value is only
   * set once.
   */
  dataAvailable: boolean = undefined;

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
  }

  /**
   * Returns whether there is any data available for any axes in this group
   * within the time scope of the app.
   */
  dataAvailableInAppTimeScope(): Promise<boolean> {
    if (this.dataAvailable !== undefined) {
      return Promise.resolve(this.dataAvailable);
    }
    return Promise
        .all(this.axes.map(axis => axis.axisDataAvailableInAppTimeScope()))
        .then(rsc => {
          this.dataAvailable = rsc.some(r => r === true);
          return this.dataAvailable;
        });
  }
}
