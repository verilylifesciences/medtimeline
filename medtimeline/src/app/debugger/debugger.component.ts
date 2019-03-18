// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {Component} from '@angular/core';
import {DebuggerService} from '../debugger.service';

@Component({
  selector: 'app-debugger',
  templateUrl: './debugger.component.html',
})

/**
 * This debugger component surfaces errors stored in the debug service to the
 * UI.
 */
export class DebuggerComponent {
  constructor(readonly debugService: DebuggerService) {}
}
