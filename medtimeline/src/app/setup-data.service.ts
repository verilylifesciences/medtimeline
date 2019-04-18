// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {Injectable} from '@angular/core';
import {Interval} from 'luxon';

import {Encounter} from './fhir-data-classes/encounter';
import {AxisGroup} from './graphtypes/axis-group';

/**
 * This class is a service that communicates the user-selected concepts on the
 * configuration page (SetupComponent) to CardContainerComponent.
 */
@Injectable({providedIn: 'root'})
export class SetupDataService {
  /** Which concepts to display. */
  selectedConcepts: AxisGroup[];
  /** Which encounters to show in the date picker. */
  encounters: Encounter[];
  /**
   * The first date range to load into the app.
   */
  selectedDateRange: Interval;
}
