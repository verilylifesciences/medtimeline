// Copyright 2019 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {Component, forwardRef, Inject, SecurityContext} from '@angular/core';
import {MatDialog} from '@angular/material/dialog';
import {DomSanitizer} from '@angular/platform-browser';
import {LabeledSeries} from 'src/app/graphdatatypes/labeled-series';
import {UI_CONSTANTS_TOKEN} from 'src/constants';

import {DiagnosticGraphDialogComponent} from '../diagnostic-graph/diagnostic-graph.dialog.component';
import {GraphComponent} from '../graph/graph.component';
import {StepGraphComponent} from '../stepgraph/stepgraph.component';
import {AnnotatedTooltip} from '../tooltips/annotated-tooltip';

@Component({
  selector: 'app-diagnostic-graph',
  templateUrl: '../graph/graph.component.html',
  styleUrls: ['../graph.css'],
  providers: [{
    provide: GraphComponent,
    useExisting: forwardRef(() => DiagnosticGraphComponent)
  }]
})
export class DiagnosticGraphComponent extends StepGraphComponent {
  private diagnosticGraphDialog: MatDialog;

  constructor(
      sanitizer: DomSanitizer, diagnosticGraphDialog: MatDialog,
      @Inject(UI_CONSTANTS_TOKEN) readonly uiConstants: any) {
    super(sanitizer, uiConstants);
    this.clickableTooltip = true;
    this.diagnosticGraphDialog = diagnosticGraphDialog;
  }

  /**
   * Called to open the diagnosticGraph Dialog.
   * @param htmlAttachment string that reflects the html to be presented on the
   *     dialog
   */
  openDiagnosticGraphDialog(htmlAttachment: string) {
    const sanitizedHTMLAttachment =
        this.sanitizer.sanitize(SecurityContext.HTML, htmlAttachment);
    const dialogRef = this.diagnosticGraphDialog.open(
        DiagnosticGraphDialogComponent,
        {data: {htmlAttachment: sanitizedHTMLAttachment}});
  }

  /**
   * This is public because we want to be able to test it.
   *
   * Creates the binding between the buttons in the tooltip and the function
   * that we wish to call through onClick. We need to overwrite the super class
   * with specific information relevant to the Diagnostic Graph.
   *
   * We need to bind the onClick here as opposed to when the button was
   * originally created due to scoping and binding issues with the tooltip- the
   * button was not previously created.
   *
   * @param tooltipArray AnnotatedTooltip[] containing the attachment we wish
   *                     to display in the matDialog.
   */
  addAdditionalElementTooltip(tooltipArray: AnnotatedTooltip[]) {
    for (const annotatedTT of tooltipArray) {
      const uniqueID = annotatedTT.id;
      if (uniqueID === undefined) {
        throw Error('AnnotatedTooltip has undefined id');
      }
      // Extracts the button in the tooltip.
      const button = document.getElementById(uniqueID);
      if (button === null) {
        throw Error(
            `The AnnotatedTooltip does not correspond to ` +
            `any buttons on the tooltip. ID: ${uniqueID}`);
      }
      const htmlAttachment = annotatedTT.additionalAttachment;
      button.onclick =
          this.openDiagnosticGraphDialog.bind(this, htmlAttachment[0]);
    }
  }

  /***************************
   * Legend interactions
   * Because of the unique nature of the series in the DiagnosticGraph, we do
   * not allow legend interactions for diagnostic graphs. This prevents errors
   * that occur when the user hovers over a legend element that might correspond
   * to many series on the chart.
   */

  /**
   * @override
   */
  resetChart() {}

  /**
   * @override
   */
  focusOnSeries(labeledSeries: LabeledSeries[]) {}
}
