// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {Injectable} from '@angular/core';
import {AxisGroup} from './graphtypes/axis-group';
import {Encounter} from './fhir-data-classes/encounter';


/**
 * This class is a service that communicates the user-selected concepts on the
 * configuration page (SetupComponent) to CardContainerComponent.
 */
@Injectable({providedIn: 'root'})

// This class is a service that communicates the user-selected concepts on the
// configuration page (SetupComponent) to CardContainerComponent.
export class SetupDataService {
  /** Which concepts to display. */
  selectedConcepts: AxisGroup[];
  /** Which encounters to show in the date picker. */
  encounters: Encounter[];
  /**
   * The first encounter to load into the app. We grab the data using this
   * encounter's date span.
   */
  selectedEncounter: Encounter;
}
