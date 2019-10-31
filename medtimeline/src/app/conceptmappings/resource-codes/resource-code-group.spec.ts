// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {ChartType} from '../../graphs/graphtypes/graph/graph.component';

import {labResult} from './display-grouping';
import {LOINCCode} from './loinc-code';
import {ResourceCodeGroup} from './resource-code-group';

describe('ResourceCodeGroup', () => {
  it('should correctly determine whether it should be shown if any ResourceCode is marked as default.',
     () => {
       // These ResourceCodes have mixed showByDefault fields.
       const resourceCodes = [
         new LOINCCode('fake', labResult, 'fake', true),
         new LOINCCode('fake2', labResult, 'fake2', false)
       ];
       const resourceCodeGroup = new ResourceCodeGroup(
           null, 'label', resourceCodes, labResult, ChartType.LINE);
       expect(resourceCodeGroup.showByDefault).toBeTruthy();
     });
});
