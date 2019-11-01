// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {HttpClientModule} from '@angular/common/http';
import {TestBed} from '@angular/core/testing';

import {ResourceCodeCreator} from './conceptmappings/resource-code-creator';
import {ResourceCodeManager} from './conceptmappings/resource-code-manager';
import {FhirService} from './fhir-server/fhir.service';
import {SetupDataService} from './setup-data.service';
import {StubFhirService} from './utils/test_utils';

describe('SetupDataService', () => {
  beforeEach(() => TestBed.configureTestingModule({
    imports: [HttpClientModule],
    providers: [
      ResourceCodeCreator, ResourceCodeManager,
      {provide: FhirService, useClass: StubFhirService}
    ],
  }));

  it('should be created', () => {
    const service: SetupDataService = TestBed.get(SetupDataService);
    expect(service).toBeTruthy();
  });
});
