// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {HttpClient, HttpClientModule} from '@angular/common/http';
import {async, TestBed} from '@angular/core/testing';
import {DateTime} from 'luxon';
import {UI_CONSTANTS} from 'src/constants';

import {RxNormCode} from '../clinicalconcepts/rx-norm';
import {ResourceCodeCreator} from '../conceptmappings/resource-code-creator';
import {ResourceCodeManager} from '../conceptmappings/resource-code-manager';
// tslint:disable-next-line:max-line-length
import {makeMedicationAdministration, makeMedicationOrder, makeSampleDiscreteObservationJson, makeSampleObservation} from '../test_utils';

import {AnnotatedObservation} from './annotated-observation';
import {MedicationAdministration} from './medication-administration';
import {AnnotatedMedicationOrder, MedicationOrder, MedicationOrderSet} from './medication-order';
import {Observation} from './observation';
import {ObservationSet} from './observation-set';

// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

const REQUEST_ID = '1234';
let obs: Observation;

describe('AnnotatedObservation', () => {
  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientModule],
      providers: [
        {provide: ResourceCodeManager, useClass: ResourceCodeManager},
        {provide: ResourceCodeCreator, useClass: ResourceCodeCreator}
      ]
    });
  }));

  beforeEach(() => {
    const rcc = new ResourceCodeCreator(TestBed.get(HttpClient));
    obs = makeSampleObservation(10, DateTime.fromISO('1992-11-06T00:00:00.00'));
  });

  it('withBlankAnnotations should have no annotations', () => {
    const annotated = new AnnotatedObservation(obs);
    expect(annotated.observation).toEqual(obs);
    expect(annotated.annotationValues.length).toBe(0);
    expect(annotated.label).toBe(obs.label);
  });

  it('forMedicationMonitoring should give correct annotations' +
         ' for observations with preceding and following doses',
     () => {
       const medOrderPrimaryVanc = makeMedicationOrder();

       const adminPrimaryVanc1 = makeMedicationAdministration(
           DateTime.fromISO('1992-11-01T00:00:00.00').toString());
       const adminPrimaryVanc2 = makeMedicationAdministration(
           DateTime.fromISO('1992-11-04T00:00:00.00').toString());

       const annotatedMedOrder1 = new AnnotatedMedicationOrder(
           medOrderPrimaryVanc, [adminPrimaryVanc2, adminPrimaryVanc1]);

       const secondaryVancMedicationCoding = {
         coding: [{system: RxNormCode.CODING_STRING, code: '1807508'}],
         text: '200 ML Vancomycin 5 MG/ML Injection'
       };
       const orderSecondaryVanc = new MedicationOrder(
           {
             medicationReference: {display: secondaryVancMedicationCoding.text},
             medicationCodeableConcept: secondaryVancMedicationCoding,
             id: 12
           },
           REQUEST_ID);
       const adminSecondaryVanc1 = new MedicationAdministration(
           {
             effectiveTimeDateTime:
                 DateTime.fromISO('1992-11-09T00:00:00.00').toString(),
             medicationReference: {display: secondaryVancMedicationCoding.text},
             dosage: {
               quantity: {value: 200, unit: 'mg'},
               route: {text: 'injection'},
               text: '200mg 5ml/mg injection daily'
             },
             medicationCodeableConcept: secondaryVancMedicationCoding,
             prescription: {reference: 'MedicationOrder/22'}
           },
           REQUEST_ID);

       const annotatedMedOrder2 = new AnnotatedMedicationOrder(
           orderSecondaryVanc, [adminSecondaryVanc1]);

       const annotated = AnnotatedObservation.forMedicationMonitoring(
           obs, [annotatedMedOrder2, annotatedMedOrder1]);
       expect(annotated.observation).toEqual(obs);
       expect(annotated.annotationValues.length).toEqual(2);
       expect(annotated.annotationValues[0]).toEqual([
         UI_CONSTANTS.TIME_SINCE_PREVIOUS_DOSE, '48:00'
       ]);
       expect(annotated.annotationValues[1]).toEqual([
         UI_CONSTANTS.TIME_BEFORE_NEXT_DOSE, '72:00'
       ]);
       expect(annotated.label).toBe(obs.label);
     });

  it('forBloodPressure should correctly give annotations with accurate bp locations',
     () => {
       const json = makeSampleDiscreteObservationJson(
           'location', DateTime.fromISO('1992-11-06T00:00:00.00'));
       json.code = {
         coding: [{code: '41904-4', system: 'http://loinc.org'}],
         text: 'Blood Pressure Location'
       };
       const locationObservationSet = new ObservationSet(
           [new AnnotatedObservation(new Observation(json, REQUEST_ID))]);
       const annotated =
           AnnotatedObservation.forBloodPressure(obs, locationObservationSet);
       expect(annotated.observation).toEqual(obs);
       expect(annotated.annotationValues.length).toEqual(1);
       expect(annotated.annotationValues[0]).toEqual([
         'Blood Pressure Location', 'location'
       ]);
     });

  it('forBloodPressure should correctly give annotations with accurate bp locations if there are multiple locations for the same time',
     () => {
       const json1 = makeSampleDiscreteObservationJson(
           'location1', DateTime.fromISO('1992-11-06T00:00:00.00'));
       json1.code = {
         coding: [{code: '41904-4', system: 'http://loinc.org'}],
         text: 'Blood Pressure Location'
       };
       const json2 = makeSampleDiscreteObservationJson(
           'location2', DateTime.fromISO('1992-11-06T00:00:00.00'));
       json2.code = {
         coding: [{code: '41904-4', system: 'http://loinc.org'}],
         text: 'Blood Pressure Location'
       };
       const locationObservationSet = new ObservationSet([
         new AnnotatedObservation(new Observation(json1, REQUEST_ID)),
         new AnnotatedObservation(new Observation(json2, REQUEST_ID))
       ]);
       const annotated =
           AnnotatedObservation.forBloodPressure(obs, locationObservationSet);
       expect(annotated.observation).toEqual(obs);
       expect(annotated.annotationValues.length).toEqual(2);
       expect(annotated.annotationValues[0]).toEqual([
         'Blood Pressure Location', 'location1'
       ]);
       expect(annotated.annotationValues[1]).toEqual([
         'Blood Pressure Location', 'location2'
       ]);
     });
});
