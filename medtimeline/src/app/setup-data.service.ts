// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {Injectable} from '@angular/core';
import {ResourceCodesForCard} from './clinicalconcepts/resource-code-manager';

@Injectable({providedIn: 'root'})

// This class is a service that communicates the user-selected concepts on the
// configuration page (SetupComponent) to CardContainerComponent.
export class SetupDataService {
  public selectedConcepts: ResourceCodesForCard[];
}
