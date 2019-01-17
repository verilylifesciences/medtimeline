
import {async, TestBed} from '@angular/core/testing';
import {DateTime, Interval} from 'luxon';

import {DisplayGrouping} from '../clinicalconcepts/display-grouping';
import {LOINCCode, LOINCCodeGroup} from '../clinicalconcepts/loinc-code';
import {ResourceCodeGroup} from '../clinicalconcepts/resource-code-group';
import {RxNormCode} from '../clinicalconcepts/rx-norm';
import {Observation} from '../fhir-data-classes/observation';
import {FhirService} from '../fhir.service';
import {makeSampleDiscreteObservationJson, makeSampleObservationJson} from '../test_utils';

import {Axis} from './axis';
import {ChartType} from './graph/graph.component';


describe('Axis', () => {
  let fhirServiceStub: any;
  const dateRangeStart = '2018-09-09T00:00:00.00';
  const dateRangeEnd = '2018-09-18T00:00:00.00';
  const dateRange = Interval.fromDateTimes(
      DateTime.fromISO(dateRangeStart), DateTime.fromISO(dateRangeEnd));

  beforeEach(async(() => {
    TestBed
        .configureTestingModule(
            {providers: [{provide: FhirService, useValue: fhirServiceStub}]})
        .compileComponents();
    fhirServiceStub = {
      // Should throw an error, since the Observations' y-values/results are of
      // mixed types.
      getObservationsForCodeGroup: (
          codeGroup: LOINCCodeGroup, dates: Interval) => {
        return Promise.all([
          [new Observation(makeSampleObservationJson(10, this.dateRangeStart))],
          [new Observation(
              makeSampleDiscreteObservationJson('result', this.dateRangeStart))]
        ]);
      },
    };
  }));

  it('Axis should throw error if resource codes do not match.', () => {
    const resourceCodeList = [
      new LOINCCode(
          '44123', new DisplayGrouping('concept', 'red'), 'label1', true),
      new RxNormCode(
          '308182', new DisplayGrouping('concept', 'red'), 'label2', true)
    ];
    const graphType = ChartType.LINE;
    const displayConcept = new DisplayGrouping('concept', 'red');


    const constructor = () => {
      const axis = new Axis(
          fhirServiceStub,
          new ResourceCodeGroup(
              fhirServiceStub, 'lbl', resourceCodeList,
              new DisplayGrouping('concept', 'red'), ChartType.LINE),
          dateRange, this.domSanitizer);
    };
    expect(constructor).toThrowError();
  });


  it('Axis should throw error if Observations returned for the resource groups are of mixed y-value types.',
     () => {
       const resourceCodeList = [
         new LOINCCode(
             '44123', new DisplayGrouping('concept', 'red'), 'label1', true),
         new LOINCCode(
             '308182', new DisplayGrouping('concept', 'red'), 'label1', true)
       ];
       const graphType = ChartType.LINE;
       const displayConcept = new DisplayGrouping('concept', 'red');
       const resourceCodeGroup = new ResourceCodeGroup(
           fhirServiceStub, 'group', resourceCodeList, displayConcept,
           graphType);

       const constructor = () => {
         const axis = new Axis(
             fhirServiceStub, resourceCodeGroup, dateRange, this.domSanitizer);
       };
       expect(constructor).toThrowError();
     });
});
