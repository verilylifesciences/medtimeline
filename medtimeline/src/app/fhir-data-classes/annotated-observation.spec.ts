// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {DateTime} from 'luxon';

import {makeMedicationAdministration, makeMedicationOrder, makeSampleObservationJson} from '../test_utils';

import {AnnotatedObservation} from './annotated-observation';
import {AnnotatedAdministration, MedicationAdministrationSet} from './medication-administration';
import {MedicationOrderSet} from './medication-order';
import {Observation} from './observation';

// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

describe('AnnotatedObservation', () => {
  const obs = new Observation(makeSampleObservationJson(
      10, DateTime.fromISO('1992-11-06T00:00:00.00')));

  it('withBlankAnnotations should have no annotations', () => {
    const annotated = new AnnotatedObservation(obs);
    expect(annotated.observation).toEqual(obs);
    expect(annotated.annotationValues.length).toBe(0);
    expect(annotated.label).toBe(obs.label);
  });

  it('forMedicationMonitoring should give blank annotations' +
         ' for observations outside of a medication order',
     () => {
       const medOrder = makeMedicationOrder();

       const firstAdmin = makeMedicationAdministration(
           DateTime.fromISO('1992-11-01T00:00:00.00').toString());
       const lastAdmin = makeMedicationAdministration(
           DateTime.fromISO('1992-11-04T00:00:00.00').toString());
       const firstAnnotatedAdmin =
           new AnnotatedAdministration(firstAdmin, 1, 1);

       // Make the administrations between November 1 and November 4.
       // Manually set the administrations and first and last timestamps so
       // that we don't have to do a FHIR call.
       medOrder.administrationsForOrder = new MedicationAdministrationSet([
         firstAnnotatedAdmin,
         new AnnotatedAdministration(lastAdmin, 2, 4, firstAnnotatedAdmin)
       ]);
       medOrder.firstAdministration = firstAdmin;
       medOrder.lastAdmininistration = lastAdmin;

       const medOrderSet = new MedicationOrderSet([medOrder]);

       const annotated =
           AnnotatedObservation.forMedicationMonitoring(obs, medOrderSet);
       expect(annotated.observation).toEqual(obs);
       expect(annotated.annotationValues.length).toEqual(0);
       expect(annotated.label).toBe(obs.label);
     });

  it('forMedicationMonitoring should give correct annotations' +
         ' for observations with preceding and following doses',
     () => {
       const medOrder = makeMedicationOrder();

       const firstAdmin = makeMedicationAdministration(
           DateTime.fromISO('1992-11-01T00:00:00.00').toString());
       const secondAdmin = makeMedicationAdministration(
           DateTime.fromISO('1992-11-04T00:00:00.00').toString());
       const thirdAdmin = makeMedicationAdministration(
           DateTime.fromISO('1992-11-09T00:00:00.00').toString());

       const firstAnnotatedAdmin =
           new AnnotatedAdministration(firstAdmin, 1, 1);
       const secondAnnotatedAdmin =
           new AnnotatedAdministration(firstAdmin, 2, 4, firstAnnotatedAdmin);
       const thirdAnnotatedAdmin =
           new AnnotatedAdministration(thirdAdmin, 3, 4, secondAnnotatedAdmin);

       // Make the administrations between November 1 and November 4.
       // Manually set the administrations and first and last timestamps so
       // that we don't have to do a FHIR call.
       medOrder.administrationsForOrder = new MedicationAdministrationSet([
         thirdAnnotatedAdmin,
         firstAnnotatedAdmin,
         secondAnnotatedAdmin,
       ]);
       medOrder.firstAdministration = firstAdmin;
       medOrder.lastAdmininistration = thirdAdmin;

       const medOrderSet = new MedicationOrderSet([medOrder]);

       const annotated =
           AnnotatedObservation.forMedicationMonitoring(obs, medOrderSet);
       expect(annotated.observation).toEqual(obs);
       expect(annotated.annotationValues.length).toEqual(2);
       expect(annotated.annotationValues[0]).toEqual([
         'Time since dose #2', '120:00'
       ]);
       expect(annotated.annotationValues[1]).toEqual([
         'Time before dose #3', '72:00'
       ]);
       expect(annotated.label).toBe(obs.label);
     });
});
