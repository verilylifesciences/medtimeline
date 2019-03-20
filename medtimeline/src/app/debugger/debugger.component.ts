// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.
import 'fhirclient';

import {Component} from '@angular/core';
import {ActivatedRoute} from '@angular/router';

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
  browserVersion: string;
  parameters = new Array<string>();

  constructor(
      readonly debugService: DebuggerService, private route: ActivatedRoute) {
    this.browserVersion = navigator.appVersion;

    this.route.queryParams.subscribe(params => {
      this.parameters.push(JSON.stringify(params));
    });
  }
}
