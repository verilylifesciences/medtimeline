// Copyright 2018 Verily Life Sciences Inc. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import {} from 'jasmine';
import {FhirResourceType} from 'src/constants';

import {RxNormCode} from '../clinicalconcepts/rx-norm';

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

describe('Medication', () => {
  it('should throw error if json is not of type Medication', () => {
    const constructor = () => {
      const x = new ContainedMedication({}, new Map());
    };
    expect(constructor).toThrowError();
  });

  it('should get label from json', () => {
    const medication = new ContainedMedication(med, medRefMap);
    expect(medication.label).toEqual('vancomycin');
  });

  it('should get code from json', () => {
    const medication = new ContainedMedication(med, medRefMap);
    expect(medication.code.codeString).toEqual('11124');
    expect(medication.code.label).toEqual('Vancomycin');
  });

  it('should throw error without code', () => {
    const constructor = () => {
      const medication = new ContainedMedication(
          {resourceType: FhirResourceType.Medication}, medRefMap);
    };
    expect(constructor).toThrowError();
  });

  it('should get id from json', () => {
    const medication = new ContainedMedication(med, medRefMap);
    expect(medication.id).toEqual('12');
  });

  it('should set dosage from information in map', () => {
    const medication = new ContainedMedication(med, medRefMap);
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
             medRefMap);
       };
       expect(constructor).toThrowError();
     });
});
