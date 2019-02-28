// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import * as Color from 'color';
import * as d3 from 'd3';
import {DateTime} from 'luxon';

/*
 * This class makes an annotation for a particular timestamp with custom notes.
 */
export class CustomizableGraphAnnotation {
  // Whether or not the full annotation is shown. If false, only the title of
  // the annotation will show.
  private showDetails: boolean;
  // The default y-coordinate for the annotation.
  readonly defaultYCoordinate = 45;
  // The maximum horizontal overlap for any two annotations.
  readonly horizontalOverlap = 20;
  // The maximum vertical overlap for any two annotations.
  readonly verticalOverlap = 10;
  // The width of the annotation.
  readonly annotationWidth = 100;
  // The default height of the annotation.
  readonly annotationHeight = 25;
  // The default padding for the annotation.
  readonly defaultPadding = 30;

  timestamp: DateTime;

  private readonly yAxisXCoord = 90;

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

  addAnnotation(chart: any) {
    const self = this;
    this.showDetails = false;

    const millis = this.timestamp.toMillis();
    const xCoordinate = chart.internal.x(millis) + '';

    // Find the points for where to draw the new annotation & connector,
    // which are on different scales.
    const yCoordinate = this.findBestYCoordinates(xCoordinate);
    const tooltip = chart.internal.selectChart.style('position', 'relative')
                        .append('div')
                        .attr('class', 'tooltip-whole-' + millis);
    const tooltipContainer =
        tooltip.append('div').attr('class', 'tooltip-custom-' + millis);
    const tooltipTitleContainer = tooltipContainer.append('div');
    const expandIcon = tooltipTitleContainer.append('i')
                           .attr('class', 'material-icons')
                           .attr('id', 'expand-' + millis)
                           .style('font-size', '18px')
                           .html('expand_more');
    const tooltipTitle = tooltipTitleContainer.append('h6')
                             .attr('class', 'tooltip-title-custom-' + millis)
                             .text(this.title);
    const deleteIcon = tooltipTitleContainer.append('i')
                           .attr('class', 'material-icons')
                           .attr('id', 'delete-' + millis)
                           .style('font-size', '18px')
                           .html('clear');
    const tooltipDetails = tooltipContainer.append('div').attr(
        'class', 'tooltip-details-custom-' + millis);
    const tooltipDetailsText =
        tooltipDetails.append('div')
            .text(this.description)
            .attr('class', 'tooltip-details-text-' + millis);
    const editIcon = tooltipDetails.append('i')
                         .attr('class', 'material-icons')
                         .attr('id', 'edit-' + millis)
                         .style('font-size', '18px')
                         .html('edit');
    tooltip.style('left', (Number(xCoordinate) + this.yAxisXCoord) + 'px')
        .style('top', yCoordinate + 'px')
        .style('border-left-color', this.color)
        .style(
            'padding-bottom',
            (this.defaultPadding + (this.defaultYCoordinate - yCoordinate)) +
                'px');
    tooltipContainer.style('left', '0px')
        .style(
            'bottom',
            (this.defaultPadding + (this.defaultYCoordinate - yCoordinate)) +
                'px')
        .style('background-color', this.color);

    /**
     * Add action handlers.
     */
    tooltipTitle.on('click', () => {
      // Toggle whether or not the details are shown.
      self.showDetails = !self.showDetails;
      self.showDetailsToggle(millis, self.showDetails, tooltipContainer.node());
    });
    expandIcon.style('cursor', 'pointer');
    expandIcon.on('click', () => {
      // Toggle whether or not the details are shown.
      self.showDetails = !self.showDetails;
      self.showDetailsToggle(millis, self.showDetails, tooltipContainer.node());
    });
    tooltip
        .on('mouseover',
            () => {
              // Only show icons when hovering over the tooltip, and while
              // the custom timeline is in edit mode. Show the expander icon
              // regardless of edit mode.
              expandIcon.style('visibility', 'visible');
              deleteIcon.classed('showIcon', true);
              editIcon.classed('showIcon', true);
            })
        .on('click',
            function() {
              // Ensure that the annotation comes to the front when clicking
              // on it.
              // TODO(b/122365189): Bring annotation to front while hovering
              // without disturbing scroll.
              const parent = this.parentNode;
              // TODO(b/123935165): Find a better way to handle the errors.
              try {
                parent.appendChild(this);
              } catch (e) {
                console.log(e);
              }
            })
        .on('mouseout', () => {
          deleteIcon.classed('showIcon', false);
          editIcon.classed('showIcon', false);
          expandIcon.style('visibility', 'hidden');
        });
  }

  // Toggles whether or not the full annotation is shown.
  private showDetailsToggle(millis: number, toggle: boolean, element: any) {
    const detailsElement =
        d3.select(element).select('.tooltip-details-custom-' + millis);
    const expandElement = d3.select(element).select('#expand-' + millis);
    if (toggle) {
      detailsElement.style('display', 'inline-block').raise();
      expandElement.html('expand_less');
    } else {
      detailsElement.style('display', 'none');
      expandElement.html('expand_more');
    }
  }
  private findBestYCoordinates(xCoordinate: string) {
    const newXCoord = Number(xCoordinate.replace('px', ''));
    const nodes: any = d3.selectAll('[class*="tooltip-whole"]').nodes();
    const positions = nodes.map(function(element) {
      return {
        top: Number(element.style.top.replace('px', '')),
        left: Number(element.style.left.replace('px', '')),
      };
    });
    const overlappingYs = [];
    // Check if there are any annotations with horizontal overlap.
    for (const position of positions) {
      const rightPosition = position.left + this.annotationWidth;
      if (newXCoord <= rightPosition &&
          (newXCoord + this.annotationWidth) >= position.left) {
        overlappingYs.push(position.top);
      }
    }
    // Figure out the new y-coordinate for the annotation.
    let defaultTop = this.defaultYCoordinate;
    overlappingYs.sort(function(a, b) {
      return a - b;
    });
    // By default, try putting the new box above all other annotations with
    // horizontal overlap.
    if (overlappingYs.length > 0) {
      const topPosition = overlappingYs[overlappingYs.length - 1];
      defaultTop = topPosition - this.verticalOverlap;
    }
    // Check if there is any position with space available between existing
    // annotations.
    for (let i = 0; i < overlappingYs.length - 1; i++) {
      // Check if there is enough space.
      if (overlappingYs[i + 1] - (overlappingYs[i] + this.annotationWidth) >=
          this.horizontalOverlap) {
        defaultTop = overlappingYs[i];
      }
    }
    return defaultTop;
  }
}
