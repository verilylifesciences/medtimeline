// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {Dosage} from './dosage';
describe('Dosage', () => {
  it('should get dosage information from json', () => {
    const dosage = new Dosage({
      'dosage': {
        'quantity': {'value': 50, 'unit': 'mg'},
        'route': {'text': 'oral'},
        'text': '50mg tablet daily'
      },
    });
    expect(dosage).toBeDefined();
    expect(dosage.quantity).toEqual(50);
    expect(dosage.unit).toBeDefined();
    expect(dosage.unit).toEqual('mg');
    expect(dosage.route).toBeDefined();
    expect(dosage.route).toEqual('oral');
    expect(dosage.text).toBeDefined();
    expect(dosage.text).toEqual('50mg tablet daily');
  });
});
