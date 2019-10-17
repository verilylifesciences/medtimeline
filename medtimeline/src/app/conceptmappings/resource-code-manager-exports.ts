// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {vitalSign} from '../clinicalconcepts/display-grouping';
import {LOINCCode} from '../clinicalconcepts/loinc-code';

export const bloodPressureLoincs = [
  new LOINCCode('55284-4', vitalSign, 'Blood pressure', true),
  new LOINCCode(
      '8478-0', vitalSign, 'Mean Arterial Pressure (Device)', true, [25, 200])
];
