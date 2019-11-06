// Copyright 2019 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {HttpClient, HttpClientModule} from '@angular/common/http';
import {async, TestBed} from '@angular/core/testing';

import {ChartType} from '../graphs/graphtypes/graph/graph.component';

import {ConceptFileConfiguration} from './concept-file-configuration';
import {ResourceCodeCreator} from './resource-code-creator';
import {antibiotics, labResult} from './resource-codes/display-grouping';

describe('ResourceCodeCreator', () => {
  let component: ResourceCodeCreator;


  beforeEach(async(() => {
    TestBed
        .configureTestingModule({
          imports: [HttpClientModule],
          providers: [{
            provide: ConceptFileConfiguration,
            useValue: new ConceptFileConfiguration(
                'clinical_concept_configuration_for_testing')
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


  it('should make a group for group-less concepts', ((done: DoneFn) => {
       component.loadAllConcepts.then((allConcepts) => {
         // Search for C-Reactive protein; it's a concept that doesn't have a
         // parent group in the testing data.
         for (const entry of Array.from(allConcepts.entries())) {
           const config = entry[0];
           const concepts = entry[1];

           if (concepts.length === 1 &&
               concepts[0].label === 'C-Reactive Protein') {
             expect(concepts[0].label).toBe('C-Reactive Protein');
             expect(concepts[0].codeString).toBe('1988-5');
             expect(concepts[0].displayBounds[0]).toBe(0);
             expect(concepts[0].displayBounds[1]).toBe(100);
             expect(concepts[0].forceDisplayBounds).toBe(true);
             expect(concepts[0].displayGrouping).toBe(labResult);

             expect(config.groupName).toBe('C-Reactive Protein');
             expect(config.displayGrouping).toBe(labResult);
             expect(config.chartType).toBe(ChartType.LINE);
             // Don't call done unless we actually executed these assertions.
             done();
           }
         }
       });
     }));


  it('should group together grouped concepts, even across categories',
     ((done: DoneFn) => {
       component.loadAllConcepts.then((allConcepts) => {
         // Search for Gentamicin; it has two entries that are medications and
         // one lab result for monitoring
         for (const entry of Array.from(allConcepts.entries())) {
           const config = entry[0];
           const concepts = entry[1];

           if (config.groupName === 'Gentamicin') {
             expect(concepts[0].label)
                 .toBe(
                     'Gentamicin Sulfate (USP) 0.003 MG/MG Ophthalmic Ointment');
             expect(concepts[0].codeString).toBe('310466');
             expect(concepts[0].displayGrouping).toBe(antibiotics);
             expect(concepts[1].label)
                 .toBe('Gentamicin Sulfate (USP) 1 MG/ML Topical Cream');
             expect(concepts[1].codeString).toBe('197735');
             expect(concepts[1].displayGrouping).toBe(antibiotics);

             expect(concepts[2].label).toBe('Gentamicin, Peak/Post Q24H');
             expect(concepts[2].codeString).toBe('31091-2');
             expect(concepts[1].displayGrouping).toBe(antibiotics);
             expect(config.groupName).toBe('Gentamicin');
             expect(config.displayGrouping).toBe(antibiotics);
             expect(config.chartType).toBe(ChartType.SCATTER);
             expect(config.showOnSameAxis).toBe(false);

             // Don't call done unless we actually executed these assertions.
             done();
           }
         }
       });
     }));


  it('if a concept has multiple groups, it should make them all',
     ((done: DoneFn) => {
       component.loadAllConcepts.then((allConcepts) => {
         // Search for Gentamicin; it has two groups--gentamicin, and monitoring
         // reference
         let foundGentamicin = false;
         let foundReference = false;
         for (const entry of Array.from(allConcepts.entries())) {
           const config = entry[0];
           const concepts = entry[1];

           if (config.groupName === 'Gentamicin') {
             expect(concepts[0].label)
                 .toBe(
                     'Gentamicin Sulfate (USP) 0.003 MG/MG Ophthalmic Ointment');
             expect(concepts[0].codeString).toBe('310466');
             expect(concepts[0].displayGrouping).toBe(antibiotics);

             expect(concepts[1].label)
                 .toBe('Gentamicin Sulfate (USP) 1 MG/ML Topical Cream');
             expect(concepts[1].codeString).toBe('197735');
             expect(concepts[1].displayGrouping).toBe(antibiotics);

             expect(config.groupName).toBe('Gentamicin');
             expect(config.displayGrouping).toBe(antibiotics);
             expect(config.chartType).toBe(ChartType.SCATTER);
             expect(config.showOnSameAxis).toBe(false);
             foundGentamicin = true;
           }

           if (config.groupName === 'Gentamicin Monitoring Reference') {
             expect(concepts[0].label)
                 .toBe(
                     'Gentamicin Sulfate (USP) 0.003 MG/MG Ophthalmic Ointment');
             expect(concepts[0].codeString).toBe('310466');
             expect(concepts[0].displayGrouping).toBe(antibiotics);

             expect(concepts[1].label)
                 .toBe('Gentamicin Sulfate (USP) 1 MG/ML Topical Cream');
             expect(concepts[1].codeString).toBe('197735');
             expect(concepts[1].displayGrouping).toBe(antibiotics);

             expect(config.groupName).toBe('Gentamicin Monitoring Reference');
             expect(config.displayGrouping).toBe(antibiotics);
             foundReference = true;
           }
         }
         expect(foundGentamicin).toBeTruthy();
         expect(foundReference).toBeTruthy();
         done();
       });
     }));
});
