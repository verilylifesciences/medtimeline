// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {async, ComponentFixture, TestBed} from '@angular/core/testing';
import {MatDialog} from '@angular/material/dialog';
import * as d3 from 'd3';
import {DateTime, Interval} from 'luxon';
import {of} from 'rxjs';
import {CustomizableData} from 'src/app/graphdatatypes/customizabledata';

import {DateTimeXAxis} from '../graph/datetimexaxis';

import {CustomizableGraphAnnotation} from './customizable-graph-annotation';
import {CustomizableGraphComponent} from './customizable-graph.component';

describe('CustomizableGraphComponent', () => {
  let component: CustomizableGraphComponent;
  let fixture: ComponentFixture<CustomizableGraphComponent>;


  const annotationTime = DateTime.fromISO('2019-04-04T00:53:00');

  class MatDialogRefStub {
    static timestamp = annotationTime;

    static setTime(timestamp: DateTime) {
      MatDialogRefStub.timestamp = timestamp;
    }

    afterClosed() {
      return of(new CustomizableGraphAnnotation(
          MatDialogRefStub.timestamp, 'title', 'description'));
    }
  }
  class MatDialogStub {
    open() {
      return new MatDialogRefStub();
    }
  }

  beforeEach(async(() => {
    TestBed
        .configureTestingModule({
          declarations: [CustomizableGraphComponent],
          providers: [{provide: MatDialog, useClass: MatDialogStub}]
        })
        .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CustomizableGraphComponent);
    component = fixture.componentInstance;
    component.xAxis = new DateTimeXAxis(Interval.fromDateTimes(
        DateTime.utc().minus({days: 2}), DateTime.utc()));
    component.data = CustomizableData.defaultEmptySeries();
    MatDialogRefStub.setTime(annotationTime);
    fixture.detectChanges();
  });

  /**
   * Adding, editing, and deleting points are also well-covered in end to end
   * tests. These unit tests are just quick sanity checks; visual elements are
   * more thorougly tested in the end to end tests.
   */

  it('should handle adding points', () => {
    // Set up some stub data so that there's a chart to render.
    component.data = CustomizableData.defaultEmptySeries();
    component.xAxis = new DateTimeXAxis(Interval.fromDateTimes(
        DateTime.utc().minus({days: 2}), DateTime.utc()));
    component.generateBasicChart();

    // Add a point to the graph. The stubs will populate it with a default
    // date and time.
    component.addPoint([0, 0], [1, 1]);

    expect(component.data.series.length).toEqual(1);
    // The series should contain the original point plus the one we added.
    expect(component.data.series[0].xValues).toEqual([
      DateTime.fromJSDate(new Date(-8640000000000000)),
      DateTime.fromISO('2019-04-04T00:53:00')
    ]);
    expect(component.data.series[0].yValues).toEqual([0, 0]);
  });

  // TODO(b/128857535): Fix tests below.
  it('should handle editing a point', () => {
    // Set up some stub data so that there's a chart to render.
    component.data = CustomizableData.defaultEmptySeries();
    component.xAxis = new DateTimeXAxis(Interval.fromDateTimes(
        DateTime.utc().minus({days: 2}), DateTime.utc()));
    component.generateFromScratch();

    // Add a point to the graph. The stubs will populate it with a default
    // date and time.
    component.addPoint([0, 0], [1, 1]);

    // Change the time the stub returns so that it looks like the point was
    // edited.
    MatDialogRefStub.setTime(DateTime.fromISO('2019-05-05T00:53:00'));

    // Trigger the edit action
    const editIcon = d3.select('#' + component.chartDivId)
                         .select('#edit-' + annotationTime.toMillis());
    editIcon.dispatch('click');

    // Make sure the point got changed to the new timestamp.
    expect(component.data.series.length).toEqual(1);
    // The series should contain the original point plus the one we added.
    expect(component.data.series[0].xValues).toEqual([
      DateTime.fromJSDate(new Date(-8640000000000000)),
      DateTime.fromISO('2019-05-05T00:53:00')
    ]);
    expect(component.data.series[0].yValues).toEqual([0, 0]);
  });

  it('should handle deleting a point', () => {
    // Set up some stub data so that there's a chart to render.
    component.data = CustomizableData.defaultEmptySeries();
    component.xAxis = new DateTimeXAxis(Interval.fromDateTimes(
        DateTime.utc().minus({days: 2}), DateTime.utc()));
    component.generateFromScratch();

    // Add a point to the graph. The stubs will populate it with a default
    // date and time.
    component.addPoint([0, 0], [1, 1]);

    // Trigger the edit action
    const deleteIcon = d3.select('#' + component.chartDivId)
                           .select('#delete-' + annotationTime.toMillis());
    deleteIcon.dispatch('click');

    // Make sure the point got changed to the new timestamp.
    expect(component.data.series.length).toEqual(1);
    // The series should contain the original point plus the one we added.
    expect(component.data.series[0].xValues).toEqual([
      DateTime.fromJSDate(new Date(-8640000000000000)),
    ]);
    expect(component.data.series[0].yValues).toEqual([0]);
  });
});
