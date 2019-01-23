// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {SecurityContext} from '@angular/core';
import {DomSanitizer} from '@angular/platform-browser';
import * as Color from 'color';
import * as d3 from 'd3';
import {DateTime} from 'luxon';

/*
 * This base class contains useful helper methods used while making a custom
 * tooltip for a c3 chart, including adding a row to the table, resetting the
 * table, and adding a header.
 */
export abstract class Tooltip {
  static readonly tooltipStyleName = 'c3-tooltip-name--';

  tooltipText: string;
  sanitizer: DomSanitizer;
  readonly timestamp: DateTime;

  constructor(sanitizer: DomSanitizer, timestamp: DateTime) {
    this.sanitizer = sanitizer;
    this.timestamp = timestamp;
  }

  addTimeHeader(timestamp: DateTime, table: HTMLTableElement, colSpan = 2) {
    this.addHeader(this.formatTimestamp(timestamp), table, colSpan);
  }

  formatTimestamp(timestamp: DateTime) {
    return timestamp.toLocaleString() + ' ' +
        timestamp.toLocaleString(DateTime.TIME_24_SIMPLE);
  }

  addHeader(content: string, table: HTMLTableElement, colSpan = 2) {
    // Header row
    const row = table.insertRow();
    const headerCell = document.createElement('th');
    row.appendChild(headerCell);
    headerCell.colSpan = colSpan;
    headerCell.innerHTML =
        this.sanitizer.sanitize(SecurityContext.HTML, content);
  }

  addRow(table: HTMLTableElement, styleName: string, cellText: string[]) {
    const row = table.insertRow();
    row.className = styleName;
    for (let i = 0; i < cellText.length; i++) {
      const cell1 = row.insertCell();
      if (i === 0) {
        cell1.className = 'name';
      } else {
        cell1.className = 'value';
      }
      cell1.innerHTML =
          this.sanitizer.sanitize(SecurityContext.HTML, cellText[i]);
    }
  }

  resetTableVisiblity(table: HTMLTableElement) {
    table.hidden = false;
    const renderedString = table.outerHTML;
    table.hidden = true;
    this.tooltipText = renderedString;
  }

  clearTable(): HTMLTableElement {
    const table = document.getElementById('c3-tooltip') as HTMLTableElement;
    while (table.firstChild) {
      table.removeChild(table.firstChild);
    }
    return table;
  }

  getTooltipName(uniqueId?: string) {
    return Tooltip.tooltipStyleName +
        this.sanitizer.sanitize(SecurityContext.HTML, uniqueId);
  }

  abstract getTooltip(): string;
}


/*
 * This class makes an annotation for a particular timestamp with custom notes.
 */
export class CustomizableGraphAnnotation {
  // The title that will show up in the annotation.
  readonly title: string;
  // The description that will show up in the annotation.
  readonly description: string;
  // Whether or not the full annotation is shown. If false, only the title of
  // the annotation will show.
  private showDetails: boolean;

  // The default y-coordinate for the annotation.
  readonly defaultYCoordinate = 70;

  // The maximum horizontal overlap for any two annotations.
  readonly horizontalOverlap = 20;
  // The maximum vertical overlap for any two annotations.
  readonly verticalOverlap = 10;
  // The width of the annotation.
  readonly annotationWidth = 100;
  // The y-coordinate for the connector.
  readonly connectorYCoord = 50;

  // The color for this annotation and associated point.
  color: Color;
  constructor(
      title: string = '', description: string = '',
      color: Color = Color.rgb('black')) {
    this.title = title;
    this.description = description;
    this.color = color;
  }

  addAnnotation(millis: number, xCoordinate: string, chart: any) {
    const self = this;
    this.showDetails = false;
    const xAxisYCoord = '100px';
    const yAxisXCoord = 70;
    // Find the points for where to draw the new annotation & connector, which
    // are on different scales.
    const yCoordinate = this.findBestYCoordinates(xCoordinate);
    const difference = this.defaultYCoordinate - yCoordinate;
    const tooltipContainer =
        chart.internal.selectChart.style('position', 'relative')
            .append('div')
            .attr('class', 'tooltip-custom-' + millis);
    const tooltipTitleContainer = tooltipContainer.append('div');
    const expandIcon = tooltipTitleContainer.append('i')
                           .attr('class', 'material-icons')
                           .attr('id', 'expand-' + millis)
                           .html('expand_more');
    const tooltipTitle = tooltipTitleContainer.append('h6')
                             .attr('class', 'tooltip-title-custom-' + millis)
                             .text(this.title);

    const deleteIcon = tooltipTitleContainer.append('i')
                           .attr('class', 'material-icons')
                           .attr('id', 'delete-' + millis)
                           .html('delete');
    const tooltipDetails = tooltipContainer.append('div').attr(
        'class', 'tooltip-details-custom-' + millis);
    const tooltipDetailsText =
        tooltipDetails.append('div').text(this.description);
    const editIcon = tooltipDetails.append('i')
                         .attr('class', 'material-icons')
                         .attr('id', 'edit-' + millis)
                         .html('edit');
    // The connector is the vertical line rendered that connects the flag to the
    // x-axis.
    const tooltipConnector =
        chart.internal.selectChart.select('svg')
            .append('line')
            .attr('class', 'tooltip-connector' + millis)
            .attr('x1', (Number(xCoordinate) + yAxisXCoord) + 'px')
            .attr('x2', (Number(xCoordinate) + yAxisXCoord) + 'px')
            .attr('y1', (this.connectorYCoord + difference) + 'px')
            .attr('y2', xAxisYCoord)
            .style('stroke-width', '1px');
    tooltipContainer.style('left', (Number(xCoordinate) + yAxisXCoord) + 'px')
        .style('bottom', yCoordinate + 'px')
        .style('background-color', this.color);
    tooltipTitle.on('click', function() {
      // Toggle whether or not the details are shown.
      self.showDetails = !self.showDetails;
      if (self.showDetails) {
        self.showDetailsToggle(millis, true, tooltipContainer.node());
      } else {
        self.showDetailsToggle(millis, false, tooltipContainer.node());
      }
    });
    expandIcon.on('click', function() {
      // Toggle whether or not the details are shown.
      self.showDetails = !self.showDetails;
      if (self.showDetails) {
        self.showDetailsToggle(millis, true, tooltipContainer.node());
      } else {
        self.showDetailsToggle(millis, false, tooltipContainer.node());
      }
    });
    tooltipContainer
        .on('mouseover',
            function() {
              // Only show icons when hovering over the tooltip.
              expandIcon.style('visibility', 'visible');
              deleteIcon.style('visibility', 'visible');
              editIcon.style('visibility', 'visible');
            })
        .on('click',
            function() {
              // Ensure that the annotation comes to the front when clicking
              // on it.
              // TODO(b/122365189): Bring annotation to front while hovering
              // without disturbing scroll.
              // TODO(b/120919698): Bring the connector to the front as well.
              const parent = this.parentNode;
              parent.appendChild(this);
            })
        .on('mouseout', function() {
          expandIcon.style('visibility', 'hidden');
          deleteIcon.style('visibility', 'hidden');
          editIcon.style('visibility', 'hidden');
        });
  }

  // Toogles whether or not the full annotation is shown.
  private showDetailsToggle(millis: number, toggle: boolean, element: any) {
    if (toggle) {
      d3.select(element)
          .select('.tooltip-details-custom-' + millis)
          .style('display', 'inline-block')
          .raise();
      // Switch the orientation of the expand icon.
      d3.select(element).select('#expand-' + millis).html('expand_less');
    } else {
      d3.select(element)
          .select('.tooltip-details-custom-' + millis)
          .style('display', 'none');
      // Switch the orientation of the expand icon.
      d3.select(element).select('#expand-' + millis).html('expand_more');
    }
  }

  private findBestYCoordinates(xCoordinate: string) {
    const newXCoord = Number(xCoordinate.replace('px', ''));
    const nodes: any = d3.selectAll('[class*="tooltip-custom"]').nodes();
    const positions = nodes.map(function(element) {
      return {
        bottom: Number(element.style.bottom.replace('px', '')),
        left: Number(element.style.left.replace('px', '')),
      };
    });
    const overlappingYs = [];
    // Check if there are any annotations with horizontal overlap.
    for (const position of positions) {
      const rightPosition = position.left + this.annotationWidth;

      if (newXCoord <= rightPosition &&
          (newXCoord + this.annotationWidth) >= position.left) {
        overlappingYs.push(position.bottom);
      }
    }

    // Figure out the new y-coordinate for the annotation.
    let defaultBottom = this.defaultYCoordinate;  // The default y-coordinate
                                                  // for all annotations.

    overlappingYs.sort(function(a, b) {
      return a - b;
    });
    // By default, try putting the new box above all other annotations with
    // horizontal overlap.
    if (overlappingYs.length > 0) {
      const topPosition = overlappingYs[overlappingYs.length - 1];
      defaultBottom = topPosition + this.verticalOverlap;
    }
    // Check if there is any position with space available between existing
    // annotaitons.
    for (let i = 0; i < overlappingYs.length - 1; i++) {
      // Check if there is enough space.
      if (overlappingYs[i + 1] - (overlappingYs[i] + this.annotationWidth) >=
          this.horizontalOverlap) {
        defaultBottom = overlappingYs[i];
      }
    }

    return defaultBottom;
  }
}
