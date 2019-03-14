// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

/**
 * This function replaces abbrevations and symbols in a unit string to comply
 * with EHRA guidelines.
 * @param unit The unit string to fix abbreviations of.
 */
export function fixUnitAbbreviations(unit: string): string {
  if (unit) {
    return unit.replace('uL', 'microL')
        .replace('µ', 'micro')
        .replace('DegC', 'Deg C');
  }
  return undefined;
}
