// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';

import {CardcontainerComponent} from './cardcontainer/cardcontainer.component';
import {FhirLaunchComponent} from './fhir-launch/fhir-launch.component';
import {SetupComponent} from './setup/setup.component';

/* On their end, it's locked down so that the only acceptable redirect
URL is localhost:8000/. So, we have to do a different path for
authentication. */
const routes: Routes = [
  {path: 'main', component: CardcontainerComponent},
  {path: 'setup', component: SetupComponent},
  {path: '', component: FhirLaunchComponent}, {path: '**', redirectTo: ''}
];


@NgModule({exports: [RouterModule], imports: [RouterModule.forRoot(routes)]})

export class AppRoutingModule {
}
