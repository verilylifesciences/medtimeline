// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {Duration, Interval} from 'luxon';
import {UI_CONSTANTS} from 'src/constants';

import {MedicationAdministration} from '../medication-administration';
import {AnnotatedMedicationOrder, MedicationOrderSet} from '../medication-order';
import {Observation} from '../observation';
import {ResultClassWithTimestamp} from '../sets/fhir-resource-set';
import {ObservationSet} from '../sets/observation-set';

/**
 * An Observation with additional information to display in its tooltip.
 */
export class AnnotatedObservation extends ResultClassWithTimestamp {
  constructor(
      readonly observation: Observation,
      /**
       * The items in this list are [label, value] pairs to be displayed in
       * a tooltip.
       * This array should be treated as immutable.
       */
      readonly annotationValues = new Array<[string, string]>()) {
    super(observation.label, observation.requestId, observation.timestamp);
  }

  /**
   * Makes an AnnotatedObservation for medication monitoring.
   * The annotations read out how long it's been since the prior medication
   * dose, and how long it was until the next medication dose was given.
   * @param observation The monitoring observation to annotate
   * @param medicationOrderSet The medication orders containing the doses of the
   *     corresponding medication
   * @throws Error if there are two medication orders in MedicationOrderSet
   *     that contain the timestamp of the observation
   */
  static forMedicationMonitoring(
      observation: Observation,
      medicationOrders: AnnotatedMedicationOrder[]): AnnotatedObservation {
    // Look in the medication order set's administrations and find the ones
    // closest in time to this observation.
    let timeSinceLast: Duration;
    let timeBeforeNext: Duration;
    const annotations = new Array<[string, string]>();

    if (medicationOrders.length > 0) {
      // Flatten all medication admins within the orders into one list and sort
      const allAdmins = [].concat.apply(
          [],
          medicationOrders.map(
              order => order.medicationAdministrationSet.resourceList));
      const sortedAdmins = allAdmins.sort(
          (a, b) => a.medAdministration.timestamp.toMillis() -
              b.medAdministration.timestamp.toMillis());

      let idx = 0;
      while (idx < sortedAdmins.length &&
             sortedAdmins[idx].medAdministration.timestamp <
                 observation.timestamp) {
        idx++;
      }

      // It's guaranteed that there's a dose before the monitoring point and a
      // dose after the monitoring point since we check to make sure
      // the observation is between the first and last administrations.
      // Here we look up those dose numbers and the time difference between
      // the doses and the monitoring point.
      const doseBeforeObs = sortedAdmins[idx - 1];
      const doseAfterObs = sortedAdmins[idx];

      timeSinceLast =
          observation.timestamp.diff(doseBeforeObs.medAdministration.timestamp);

      timeBeforeNext =
          doseAfterObs.medAdministration.timestamp.diff(observation.timestamp);

      annotations.push([
        UI_CONSTANTS.TIME_SINCE_PREVIOUS_DOSE, timeSinceLast.toFormat('h:mm')
      ]);

      annotations.push([
        UI_CONSTANTS.TIME_BEFORE_NEXT_DOSE, timeBeforeNext.toFormat('h:mm')
      ]);
    }
    return new AnnotatedObservation(observation, annotations);
  }

  /**
   * Makes an AnnotatedObservation for blood pressure, with information about
   * the blood pressure location.
   * @param observation The monitoring observation to annotate
   * @param locationSet The ObservationSet containing Blood Pressure location
   *     observations.
   * @throws Error if there are two observations in locationSet
   *     that contain the timestamp of the observation
   */
  static forBloodPressure(
      observation: Observation,
      locationSet: ObservationSet): AnnotatedObservation {
    const annotations = new Array<[string, string]>();
    // Find the medication order set that coincides in time with this
    // administration (if any).
    if (locationSet) {
      for (const locationObs of locationSet.resourceList) {
        if (locationObs.observation.timestamp.equals(observation.timestamp)) {
          annotations.push(
              ['Blood Pressure Location', locationObs.observation.result]);
        }
      }
    }

    return new AnnotatedObservation(observation, annotations);
  }
}
