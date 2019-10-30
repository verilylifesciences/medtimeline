// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {AfterViewInit, Component, Inject, Input} from '@angular/core';
import {APP_TIMESPAN, UI_CONSTANTS_TOKEN} from 'src/constants';

import {AxisGroup} from '../graphs/graphtypes/axis-group';

/**
 * Represents one element in a list or menu of ResourceCodesForCards
 * that can be added to the main CardContainer.
 */
@Component({
  selector: 'app-data-selector-element',
  templateUrl: './data-selector-element.component.html',
  styleUrls: ['./data-selector-element.component.css']
})
export class DataSelectorElementComponent implements AfterViewInit {
  /**
   *  The ResourceCodes for the card represented by this DataSelectorElement.
   */
  @Input() axisGroup: AxisGroup;

  /**
   *  Hold an instance of the app time interval so we can display it in the HTML
   */
  readonly appTimeIntervalString = APP_TIMESPAN.start.toFormat('MM/dd/yyyy') +
      ' and ' + APP_TIMESPAN.end.toFormat('MM/dd/yyyy');

  /**
   * Whether there is data available within the app timespan for this card.
   */
  dataAvailable = true;

  constructor(@Inject(UI_CONSTANTS_TOKEN) readonly uiConstants: any) {}

  ngAfterViewInit() {
    // We have to wait until after view initialization so that the @Input
    // element binding happens.
    this.axisGroup.dataAvailableInAppTimeScope().then(available => {
      this.dataAvailable = available;
    });
  }
}
