// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {FhirResourceType} from 'src/constants';

import {RxNormCode} from '../conceptmappings/resource-codes/rx-norm';

import {ContainedMedication} from './medication';

const medicationCoding = {
  coding: [{system: RxNormCode.CODING_STRING, code: '11124'}],
  text: 'vancomycin'
};
const med = {
  resourceType: FhirResourceType.Medication,
  id: '12',
  code: medicationCoding
};

const medRefMap = new Map<string, any>();
medRefMap.set('12', {
  item: {reference: '12', display: 'Ing1'},
  amount: {numerator: {value: 50}}
});

const REQUEST_ID = '1234';

describe('Medication', () => {
  it('should throw error if json is not of type Medication', () => {
    const constructor = () => {
      const x = new ContainedMedication({}, new Map(), REQUEST_ID);
    };
    expect(constructor).toThrowError();
  });

  it('should get label from json', () => {
    const medication = new ContainedMedication(med, medRefMap, REQUEST_ID);
    expect(medication.label).toEqual('vancomycin');
  });

  it('should get code from json', () => {
    const medication = new ContainedMedication(med, medRefMap, REQUEST_ID);
    expect(medication.code.codeString).toEqual('11124');
    expect(medication.code.label).toEqual('Vancomycin');
  });

  it('should throw error without code', () => {
    const constructor = () => {
      const medication = new ContainedMedication(
          {resourceType: FhirResourceType.Medication}, medRefMap, REQUEST_ID);
    };
    expect(constructor).toThrowError();
  });

  it('should get id from json', () => {
    const medication = new ContainedMedication(med, medRefMap, REQUEST_ID);
    expect(medication.id).toEqual('12');
  });

  it('should set dosage from information in map', () => {
    const medication = new ContainedMedication(med, medRefMap, REQUEST_ID);
    expect(medication.dosage.quantity).toEqual(50);
  });

  it('should throw error if there is no dosage information for id in json',
     () => {
       const constructor = () => {
         const medication = new ContainedMedication(
             {
               resourceType: FhirResourceType.Medication,
               code: medicationCoding
             },
             medRefMap, REQUEST_ID);
       };
       expect(constructor).toThrowError();
     });
});
