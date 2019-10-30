// Copyright 2019 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {async, TestBed} from '@angular/core/testing';
import {DomSanitizer} from '@angular/platform-browser';

import {AnnotatedTooltip} from './annotated-tooltip';

describe('AnnotatedTooltip', () => {
  let annotatedTTArr: AnnotatedTooltip[];

  beforeEach(async(() => {
    annotatedTTArr = new Array<AnnotatedTooltip>();
    for (let i = 0; i < 3; i++) {
      const tooltipChart = 'tooltipChart' + i;
      const additionalAttachment = ['1_additionalattachment' + i,
                                     '2_additionalattachment' + i];
      const uniqueID = 'id' + i;
      annotatedTTArr.push(new AnnotatedTooltip(tooltipChart, additionalAttachment, uniqueID));
    }
  }));

  it('should correctly combine annotatedTooltip[]', () => {
    const annotatedTT = AnnotatedTooltip.combineAnnotatedTooltipArr(annotatedTTArr);
    expect(annotatedTT.tooltipChart).toEqual('tooltipChart0tooltipChart1tooltipChart2');
    expect(annotatedTT.additionalAttachment).toEqual(
      ['1_additionalattachment0', '2_additionalattachment0',
      '1_additionalattachment1', '2_additionalattachment1',
      '1_additionalattachment2', '2_additionalattachment2']);
    expect(annotatedTT.id).toBeUndefined();
  });
});
