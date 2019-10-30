import {fixUnitAbbreviations} from './unit_utils';

// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

describe('unit_utils', () => {
  it('fixUnitAbbrevations should replace uL with microL', () => {
    const string = 'unit_uL';
    expect(fixUnitAbbreviations(string)).toEqual('unit_microL');
  });

  it('fixUnitAbbrevations should replace µ with micro', () => {
    const string = 'unit_µ';
    expect(fixUnitAbbreviations(string)).toEqual('unit_micro');
  });

  it('fixUnitAbbrevations should replace DegC with Deg C', () => {
    const string = 'unit_DegC';
    expect(fixUnitAbbreviations(string)).toEqual('unit_Deg C');
  });
});
