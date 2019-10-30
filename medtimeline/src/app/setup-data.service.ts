// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {Injectable} from '@angular/core';
import {DateTime, Interval} from 'luxon';

import {DisplayGrouping} from './clinicalconcepts/display-grouping';
import {ResourceCodeCreator} from './conceptmappings/resource-code-creator';
import {ResourceCodeManager} from './conceptmappings/resource-code-manager';
import {Encounter} from './fhir-resources/encounter';
import {FhirService} from './fhir-server/fhir.service';
import {AxisGroup} from './graphs/graphtypes/axis-group';
import {ResultError} from './result-error';

/**
 * This class is a service that communicates the user-selected concepts on the
 * configuration page (SetupComponent) to CardContainerComponent.
 */
@Injectable({providedIn: 'root'})
export class SetupDataService {
  private today = DateTime.local().startOf('day');

  /** Which concepts to display. */
  selectedConcepts = new Array<AxisGroup>();
  /** Which encounters to show in the date picker. */
  encounters = new Array<Encounter>();
  encountersError?: ResultError;
  /**
   * The first date range to load into the app.
   */
  selectedDateRange: Interval =
      Interval.fromDateTimes(this.today.minus({days: 7}), this.today);

  readonly displayGroupMapping: Promise<Map<DisplayGrouping, AxisGroup[]>> =
      this.resourceCodeManager.getDisplayGroupMapping(
          this.fhirService, this.resourceCodeCreator);

  constructor(
      private resourceCodeManager: ResourceCodeManager,
      private fhirService: FhirService,
      private resourceCodeCreator: ResourceCodeCreator) {}
}
