// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {TestBed} from '@angular/core/testing';

import {SetupDataService} from './setup-data.service';

describe('SetupDataService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: SetupDataService = TestBed.get(SetupDataService);
    expect(service).toBeTruthy();
  });
});
