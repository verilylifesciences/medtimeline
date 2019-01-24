// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import 'fhirclient';

import {HttpClientModule} from '@angular/common/http';
import {NgModule} from '@angular/core';
import {FlexLayoutModule} from '@angular/flex-layout';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {MatAutocompleteModule, MatButtonModule, MatButtonToggleModule, MatDialogModule, MatDividerModule, MatListModule, MatMenuModule, MatNativeDateModule, MatProgressSpinnerModule, MatSnackBarModule, MatStepperModule, MatToolbarModule, MatTooltipModule} from '@angular/material';
import {MatCardModule} from '@angular/material/card';
import {MatCheckboxModule} from '@angular/material/checkbox';
import {MatDatepickerModule} from '@angular/material/datepicker';
import {MatExpansionModule} from '@angular/material/expansion';
import {MatIconModule} from '@angular/material/icon';
import {MatInputModule} from '@angular/material/input';
import {MatSidenavModule} from '@angular/material/sidenav';
import {MatTabsModule} from '@angular/material/tabs';
import {BrowserModule} from '@angular/platform-browser';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {RouterModule} from '@angular/router';
import {AngularResizedEventModule} from 'angular-resize-event';
import {SidebarModule} from 'ng-sidebar';
import {DragulaModule} from 'ng2-dragula';
import {NgxDaterangepickerMd} from 'ngx-daterangepicker-material';

import {environment} from '../environments/environment';

import {AppComponent} from './app.component';
import {CardcontainerComponent} from './cardcontainer/cardcontainer.component';
import {CustomizableTimelineDialogComponent} from './cardtypes/customizable-timeline/customizable-timeline-dialog/customizable-timeline-dialog.component';
import {CustomizableTimelineComponent} from './cardtypes/customizable-timeline/customizable-timeline.component';
import {DraggablecardComponent} from './cardtypes/draggablecard/draggablecard.component';
import {MultiGraphCardComponent} from './cardtypes/multigraphcard/multigraphcard.component';
import {TextboxcardComponent} from './cardtypes/textboxcard/textboxcard.component';
import {ResourceCodeManager} from './clinicalconcepts/resource-code-manager';
import {DataSelectorElementComponent} from './data-selector-element/data-selector-element.component';
import {DataSelectorMenuComponent} from './data-selector-menu/data-selector-menu.component';
import {FhirHttpService} from './fhir-http.service';
import {FhirLaunchComponent} from './fhir-launch/fhir-launch.component';
import {FhirService} from './fhir.service';
import {CustomizableGraphComponent} from './graphtypes/customizable-graph/customizable-graph.component';
import {LineGraphComponent} from './graphtypes/linegraph/linegraph.component';
import {MicrobioGraphComponent} from './graphtypes/microbio-graph/microbio-graph.component';
import {ScatterplotComponent} from './graphtypes/scatterplot/scatterplot.component';
import {StepGraphComponent} from './graphtypes/stepgraph/stepgraph.component';
import {HelpDialogComponent} from './help-dialog/help-dialog.component';
import {MockFhirService} from './mock-fhir.service';
import {SMART_ON_FHIR_CLIENT} from './smart-on-fhir-client';
import {TimelineControllerComponent} from './timeline-controller/timeline-controller.component';
import {TimelineToolbarComponent} from './timeline-toolbar/timeline-toolbar.component';

@NgModule({
  declarations: [
    AppComponent,
    FhirLaunchComponent,
    CardcontainerComponent,
    TextboxcardComponent,
    LineGraphComponent,
    ScatterplotComponent,
    StepGraphComponent,
    MultiGraphCardComponent,
    TimelineControllerComponent,
    DraggablecardComponent,
    CustomizableTimelineComponent,
    CustomizableGraphComponent,
    CustomizableTimelineDialogComponent,
    MicrobioGraphComponent,
    TimelineToolbarComponent,
    DataSelectorElementComponent,
    DataSelectorMenuComponent,
    HelpDialogComponent,
  ],
  imports: [
    BrowserModule, MatCardModule, HttpClientModule, MatSidenavModule,
    MatListModule, MatDividerModule, MatIconModule, MatExpansionModule,
    MatCheckboxModule, BrowserAnimationsModule, FormsModule,
    ReactiveFormsModule, MatInputModule, BrowserAnimationsModule,
    MatProgressSpinnerModule, MatButtonModule, MatDatepickerModule,
    MatAutocompleteModule, MatButtonToggleModule, MatNativeDateModule,
    FormsModule, ReactiveFormsModule, MatMenuModule, MatTooltipModule,
    FlexLayoutModule.withConfig({useColumnBasisZero: false}),
    AngularResizedEventModule, MatTabsModule, MatDialogModule, MatStepperModule,
    MatToolbarModule, MatSnackBarModule, SidebarModule.forRoot(),
    NgxDaterangepickerMd.forRoot({}),
    /* On their end, it's locked down so that the only acceptable redirect
    URL is localhost:8000/. So, we have to do a different path for
    authentication. */
    RouterModule.forRoot([
      {path: 'auth', component: FhirLaunchComponent},
      {path: '', component: CardcontainerComponent}
    ]),
    DragulaModule.forRoot()
  ],
  providers: [
    // This sets up a provider for the smart on fhir client defined by
    // assets/fhir-client.min.js (defined as symbol `FHIR`) so that it can be
    // injected into the service that uses it to allow for easier testing.
    {provide: SMART_ON_FHIR_CLIENT, useValue: FHIR}, {
      provide: FhirService,
      useClass: environment.useMockServer ? MockFhirService : FhirHttpService
    },
    {provide: ResourceCodeManager, useClass: ResourceCodeManager}
  ],
  bootstrap: [AppComponent],
  entryComponents: [CustomizableTimelineDialogComponent, HelpDialogComponent]
})
export class AppModule {
}
