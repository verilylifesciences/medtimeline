// Copyright 2019 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {HttpClient, HttpClientModule} from '@angular/common/http';
import {async, TestBed} from '@angular/core/testing';

import {ConceptFileConfiguration} from './concept-file-configuration';
import {ResourceCodeCreator} from './resource-code-creator';

describe('ResourceCodeCreator', () => {
  let component: ResourceCodeCreator;


  beforeEach(async(() => {
    TestBed
        .configureTestingModule({
          imports: [HttpClientModule],
          providers: [{
            provide: ConceptFileConfiguration,
            useValue: new ConceptFileConfiguration()
          }],
        })
        .compileComponents();
  }));

  beforeEach(() => {
    component = new ResourceCodeCreator(
        TestBed.get(HttpClient), TestBed.get(ConceptFileConfiguration));
  });

  it('should create', (() => {
       expect(component).toBeTruthy();
     }));
});