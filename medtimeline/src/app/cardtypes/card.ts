// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {DomSanitizer} from '@angular/platform-browser';
import {Interval} from 'luxon';

import {DisplayGrouping} from '../clinicalconcepts/display-grouping';
import {ResourceCodesForCard} from '../clinicalconcepts/resource-code-manager';
import {FhirService} from '../fhir.service';
import {Axis} from '../graphtypes/axis';

/**
 * A Card represents the data associated with one card rendered. One Card
 * may include many graphs, each represented by one "Axis". A Card holds
 * whether or not to display the data by default, the grouping associated with
 * the charts, and the axes. Each Axis for this Card
 * could have a different graph type but must all belong to the same display
 * grouping.
 */
export class Card {
  /**
   * The DisplayConcept associated with the charts on this Card.
   */
  readonly displayConcept: DisplayGrouping;

  /**
   * The Axes associated with this Card.
   */
  readonly axes: Axis[] = [];

  /**
   * The date range associated with this Card.
   */
  readonly dateRange: Interval;

  /**
   * The constructor for this axis.
   * @param fhirService The FhirService used to make the FHIR calls.
   * @param resourceCodes The groups of resources to display on each Axis
   *     for this Card.
   * @param dateRange The date range for this Card.
   * @throws Error if the ResourceCodeGroups have mixed display groupings, or
   * the resource code groups are undefined
   */
  constructor(
      fhirService: FhirService,
      resourceCodes: ResourceCodesForCard,
      dateRange: Interval,
      sanitizer: DomSanitizer,
  ) {
    const resourceCodeGroups = resourceCodes.resourceCodeGroups;
    if (!resourceCodeGroups) {
      throw Error('Resource codes are undefined.');
    }
    if (resourceCodeGroups.length > 0) {
      const allConcepts =
          new Set(resourceCodeGroups.map(x => x.displayGrouping));
      if (allConcepts.size !== 1) {
        throw Error(
            'The resource list in this set has mixed concepts: ' +
            Array.from(allConcepts));
      }
      this.displayConcept = allConcepts.keys().next().value;
    }

    this.dateRange = dateRange;
    for (const resourceGroup of resourceCodeGroups) {
      const label = (resourceGroup.label !== resourceCodes.label) ?
          resourceGroup.label :
          undefined;
      this.axes.push(
          new Axis(fhirService, resourceGroup, dateRange, sanitizer, label));
    }
  }
}
