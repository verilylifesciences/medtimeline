// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {Component, Input} from '@angular/core';
import {APP_TIMESPAN} from 'src/constants';

import {DisplayGrouping} from '../clinicalconcepts/display-grouping';
import {ResourceCodesForCard} from '../clinicalconcepts/resource-code-manager';

@Component({
  selector: 'app-data-selector-element',
  templateUrl: './data-selector-element.component.html',
  styleUrls: ['./data-selector-element.component.css']
})

// This class represents one element in a list or menu of ResourceCodesForCards
// that can be added to the main CardContainer.
export class DataSelectorElementComponent {
  // The ResourceCodes for the card represented by this DataSelectorElement.
  @Input() resourceCodesForCard: ResourceCodesForCard;
  // The DisplayGrouping for the card represented by this DataSelectorElement.
  @Input() conceptGroupKey: DisplayGrouping;
  // Hold an instance of the app time interval so we can display it in the HTML
  readonly appTimeIntervalString = APP_TIMESPAN.start.toFormat('MM/dd/yyyy') +
      ' and ' + APP_TIMESPAN.end.toFormat('MM/dd/yyyy');
}
