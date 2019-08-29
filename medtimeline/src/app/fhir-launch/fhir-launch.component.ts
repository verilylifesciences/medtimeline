// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import 'fhirclient';

import {Component, OnInit} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {Router} from '@angular/router';

import {environment} from '../../environments/environment';

import * as FhirConfig from './../fhir_config';

/* Type definition for SMART on FHIR client (from assets/fhir-client.min.js) */
declare var FHIR: any;

@Component({
  selector: 'app-fhir-launch',
  templateUrl: './fhir-launch.component.html',
  styleUrls: ['./fhir-launch.component.css']
})
export class FhirLaunchComponent implements OnInit {
  error = false;

  scope: string = [
    'launch', 'patient/Observation.read', 'patient/Patient.read',
    'patient/MedicationOrder.read', 'patient/MedicationAdministration.read',
    'patient/DocumentReference.read', 'patient/DocumentReference.write',
    'patient/Encounter.read'
  ].join(' ');

  // We hold these variables in-class for authentication debugging.
  clientId: string;
  baseURL: string;
  redirectURL: string;
  useDebugger: boolean;
  parameters = new Array<string>();

  constructor(private router: Router, private route: ActivatedRoute) {}

  ngOnInit() {
    if (environment.useMockServer) {
      this.router.navigate(['setup']);
    } else {
      this.useDebugger = environment.useDebugger;

      this.route.queryParams.subscribe(params => {
        const state = params['state'];
        const code = params['code'];
        if (state && code) {
          // Navigate to the setup page, passing the code & state parameters
          // along with the URL.
          this.router.navigateByUrl('/setup?code=' + code + '&state=' + state);
        } else {
          if (this.useDebugger) {
            this.clientId = FhirConfig.credentials.client_id;
            this.baseURL = FhirConfig.url.baseURL;
            this.redirectURL = FhirConfig.url.redirectURL;
            this.route.queryParams.subscribe(pms => {
              this.parameters.push(JSON.stringify(pms));
            });
            return;
          }

          this.beginAuthenticationFlow();
        }
      });
    }
  }

  beginAuthenticationFlow() {
    const clientId = FhirConfig.credentials.client_id;
    if (!clientId) {
      this.error = true;
    } else {
      FHIR.oauth2.authorize({
        'client_id': clientId,
        'scope': this.scope,
        'redirect_uri': FhirConfig.url.redirectURL
      });
    }
  }
}
