// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {async, TestBed} from '@angular/core/testing';
import {DomSanitizer} from '@angular/platform-browser';
import * as Color from 'color';
import {DateTime} from 'luxon';

import {StandardTooltip, Tooltip} from './tooltip';

describe('StandardTooltip', () => {
  beforeEach(async(() => {
    TestBed.configureTestingModule({}).compileComponents();
  }));

  it('should create', () => {
    const tooltip = new StandardTooltip(
        [{x: new Date(1, 1, 2001), name: 'name', value: 15}],
        () => Color.rgb(244, 244, 244), 'unit');
    expect(tooltip).toBeDefined();
  });

  it('should give correct tooltips', () => {
    const tooltip = new StandardTooltip(
        [
          {x: new Date(2001, 1, 1), name: 'name', value: 15},
          {x: new Date(2001, 1, 1), name: 'name', value: 25}
        ],
        () => Color.rgb(244, 244, 244), 'unit');
    expect(tooltip.getTooltip(undefined, TestBed.get(DomSanitizer)))
        .toBe(
            '<table class="c3-tooltip">' +
            '<tbody><tr><th colspan="2">' +
            Tooltip.formatTimestamp(DateTime.fromJSDate(new Date(2001, 1, 1))) +
            '</th></tr>' +
            '<tr><td class="name">' +
            '<span style="background-color: rgb(244, 244, 244); ' +
            'display: inline-block; height: 10px; width: 10px; ' +
            'margin-right: 6px; border-radius: 50%;"></span>' +
            '<div style="display: inline-block;">name</div></td>' +
            '<td class="value">15 unit</td></tr>' +
            '<tr><td class="name">' +
            '<span style="background-color: rgb(244, 244, 244); ' +
            'display: inline-block; height: 10px; width: 10px; ' +
            'margin-right: 6px; border-radius: 50%;"></span>' +
            '<div style="display: inline-block;">name</div></td>' +
            '<td class="value">25 unit</td></tr></tbody></table>');
  });
});
