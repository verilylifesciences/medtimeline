// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import * as Color from 'color';
import {DateTime} from 'luxon';

/*
 * This class makes an annotation for a particular timestamp with custom notes.
 */
export class CustomizableGraphAnnotation {
  // Whether or not the full annotation is shown. If false, only the title of
  // the annotation will show.
  private showDetails: boolean;
  // The width of the annotation.
  readonly annotationWidth = 100;
  // The default height of the annotation.
  readonly annotationHeight = 25;
  // The default y position of the annotation.
  readonly annotationDefaultY = 20;

  timestamp: DateTime;
  deleteIcon: HTMLElement;
  editIcon: HTMLElement;
  expandIcon: HTMLElement;

  constructor(
      timestamp: DateTime,
      /** The title that will show up in the annotation. */
      readonly title = '',
      /** The description that will show up in the annotation. */
      readonly description = '',
      /** The color for this annotation and associated point. */
      readonly color: Color = Color.rgb('black'),
      /** The timestamp for the annotation */
  ) {
    this.timestamp = timestamp;
  }

  addAnnotation(chartDivId: string, differenceInHeight: number): HTMLElement {
    const self = this;
    this.showDetails = false;
    const millis = this.timestamp.toMillis();

    const tooltipContainer = document.createElement('div');
    tooltipContainer.setAttribute(
        'class', 'tooltip-custom-' + chartDivId + millis);
    tooltipContainer.style.left = '0px';
    tooltipContainer.style.borderColor = 'grey';
    tooltipContainer.style.backgroundColor = this.color.toString();
    tooltipContainer.style.bottom =
        (this.annotationDefaultY + differenceInHeight) + 'px';

    const tooltipTitleContainer = document.createElement('div');
    tooltipContainer.appendChild(tooltipTitleContainer);

    this.expandIcon =
        this.makeIcon('expand-' + chartDivId + millis, 'expand_more');
    this.expandIcon.style.cursor = 'pointer';
    tooltipTitleContainer.appendChild(this.expandIcon);

    const tooltipTitle = document.createElement('h6');
    tooltipTitle.setAttribute(
        'class', 'tooltip-title-custom-' + chartDivId + millis);
    tooltipTitle.innerText = this.title;
    tooltipTitleContainer.appendChild(tooltipTitle);


    this.deleteIcon = this.makeIcon('delete-' + chartDivId + millis, 'clear');
    this.deleteIcon.style.cursor = 'pointer';
    tooltipTitleContainer.appendChild(this.deleteIcon);

    const tooltipDetails = document.createElement('div');
    tooltipDetails.setAttribute(
        'class', 'tooltip-details-custom-' + chartDivId + millis);
    tooltipContainer.appendChild(tooltipDetails);

    const tooltipDetailsText = document.createElement('div');
    tooltipDetailsText.innerText = this.description;
    tooltipDetailsText.setAttribute(
        'class', 'tooltip-details-text-' + chartDivId + millis);
    tooltipDetails.appendChild(tooltipDetailsText);

    this.editIcon = this.makeIcon('edit-' + chartDivId + millis, 'edit');
    this.editIcon.style.cursor = 'pointer';
    tooltipDetails.appendChild(this.editIcon);

    /**
     * Add action handlers.
     */
    tooltipTitle.onclick = ((e: MouseEvent) => {
      // Toggle whether or not the details are shown.
      self.showDetails = !self.showDetails;
      self.showDetailsToggle(
          millis, self.showDetails, tooltipContainer, chartDivId);
    });

    this.expandIcon.onclick = ((e: MouseEvent) => {
      // Toggle whether or not the details are shown.
      self.showDetails = !self.showDetails;
      self.showDetailsToggle(
          millis, self.showDetails, tooltipContainer, chartDivId);
    });


    tooltipContainer.onmouseover = (e: MouseEvent) => {
      this.expandIcon.style.visibility = 'visible';
      this.deleteIcon.classList.add('showIcon');
      this.editIcon.classList.add('showIcon');
    };

    tooltipContainer.onmouseout = (e: MouseEvent) => {
      this.expandIcon.style.visibility = 'hidden';
      this.deleteIcon.classList.remove('showIcon');
      this.editIcon.classList.remove('showIcon');
    };
    return tooltipContainer;
  }

  removeAnnotation(chartDivId: string) {
    const annotation = document.getElementsByClassName(
        'tooltip-whole-' + chartDivId + this.timestamp.toMillis())[0];
    const parent = annotation.parentNode;
    if (parent) {
      parent.removeChild(annotation);
    }
  }

  private makeIcon(id: string, iconName: string): HTMLElement {
    const icon = document.createElement('i');
    icon.setAttribute('class', 'material-icons');
    icon.setAttribute('id', id);
    icon.style.fontSize = '18px';
    icon.innerHTML = iconName;
    return icon;
  }
  // Toggles whether or not the full annotation is shown.
  private showDetailsToggle(
      millis: number, toggle: boolean, element: any, chartDivId: string) {
    const detailsElement =
        document.getElementsByClassName(
            'tooltip-details-custom-' + chartDivId + millis)[0] as HTMLElement;
    const expandElement =
        document.getElementById('expand-' + chartDivId + millis);
    if (toggle) {
      detailsElement.style.display = 'inline-block';
      expandElement.innerHTML = 'expand_less';
    } else {
      detailsElement.style.display = 'none';
      expandElement.innerHTML = 'expand_more';
    }
  }
}
