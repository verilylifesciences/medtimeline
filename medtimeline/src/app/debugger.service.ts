// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {Injectable} from '@angular/core';

/**
 * This service accumulates any errors sent to it in the app into an array of
 * strings so that they can be surfaced in the UI.
 */
@Injectable({providedIn: 'root'})
export class DebuggerService {
  errors: string[] = [];

  logError(error: string) {
    this.errors.push(error);
  }
}
