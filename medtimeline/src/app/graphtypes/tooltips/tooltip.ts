// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {SecurityContext} from '@angular/core';
import {DomSanitizer} from '@angular/platform-browser';
import * as Color from 'color';
import * as Colors from '../../theme/verily_colors';
import {DateTime} from 'luxon';

/*
 * This base class contains useful helper methods used while making a custom
 * tooltip for a c3 chart, including adding a row to the table, resetting the
 * table, and adding a header.
 *
 * This is functionally a static class, but Typescript doesn't allow for
 * abstract static functions. We make all tooltip classes inherit from Tooltip
 * so that they must implement the getTooltip function.
 *
 * @param T The type of data that the tooltip is derived from.
 */
export abstract class Tooltip<T> {
  /**
   * Creates a new table for the tooltip. Returns a HTMLTableElement.
   */
  static createNewTable(): HTMLTableElement {
    const table: HTMLTableElement = document.createElement('table');
    table.setAttribute('class', 'c3-tooltip');
    return table;
  }

  /**
   * Adds a header on the tooltips depicting the timepoint of the data
   * @param timestamp DateTime reflecting the datapoint depicted on the tooltip
   * @param table HTMLTableElement on the tooltip that needs to be edited
   * @param sanitizer A DOM sanitizer
   * @param colSpan The number of columns that the header spans
   */
  static addTimeHeader(
      timestamp: DateTime, table: HTMLTableElement, sanitizer: DomSanitizer,
      colSpan = 2) {
    Tooltip.addHeader(
        Tooltip.formatTimestamp(timestamp), table, sanitizer, colSpan);
  }

  /**
   * Returns a string of the timestamp in format: MM/DD/YYYY HH:MM
   * @param timestamp DateTime reflecting the datapoint depicted on the tooltip
   */
  static formatTimestamp(timestamp: DateTime) {
    return timestamp.toLocal().toLocaleString() + ' ' +
        timestamp.toLocal().toLocaleString(DateTime.TIME_24_SIMPLE);
  }

  /**
   * Adds a header to the HTMLTableElement
   * @param content String reflecting content inside the header
   * @param table HTMLTableElement on the tooltip that needs to be edited
   * @param sanitizer A DOM sanitizer
   * @param colSpan The number of columns that the header spans
   */
  static addHeader(
      content: string, table: HTMLTableElement, sanitizer: DomSanitizer,
      colSpan = 2) {
    // Header row
    const row = table.insertRow();
    const headerCell = document.createElement('th');
    row.appendChild(headerCell);
    headerCell.colSpan = colSpan;
    headerCell.innerHTML = sanitizer.sanitize(SecurityContext.HTML, content);
  }

  /**
   * Adds row to the HTMLTableElement
   * @param table HTMLTableElement on the tooltip that needs to be edited
   * @param cellText String array reflecting the content on the tooltip
   * @param sanitizer A DOM sanitizer
   * @param color Color that is displayed on the legend and the graph.
   * @param isAbnormal Boolean that depicts whether the datapoint is abnormal
   */
  static addRow(
      table: HTMLTableElement, cellText: string[], sanitizer: DomSanitizer,
      color?: Color, isAbnormal?: boolean) {
    const row = table.insertRow();
    for (let i = 0; i < cellText.length; i++) {
      const cell1 = row.insertCell();
      if (i === 0) {
        cell1.className = 'name';
        if (isAbnormal) {
          cell1.setAttribute('style', 'color: ' + Colors.ABNORMAL);
        }
        if (color) {
          cell1.appendChild(Tooltip.makeColorSwatch(color, isAbnormal));
          const div = document.createElement('div');
          div.setAttribute('style', 'display: inline-block;');
          div.innerHTML = sanitizer.sanitize(SecurityContext.HTML, cellText[i]);
          cell1.appendChild(div);
          continue;
        }
      } else {
          cell1.className = 'value';
          if (isAbnormal) {
            cell1.setAttribute('style', 'color: ' + Colors.ABNORMAL);
          }
      }
      cell1.innerHTML = sanitizer.sanitize(SecurityContext.HTML, cellText[i]);
    }
  }

  /**
   * Helper function that creates the color swatch on the tooltips. If it
   * is regular, it is rectangular. If it is abnormal, it is triangular.
   * @param color Color that is displayed on the legend and the graph.
   * @param isAbnormal Boolean that depicts whether the datapoint is abnormal
   */
  static makeColorSwatch(color: Color, isAbnormal: boolean = false): HTMLSpanElement {
    const colorSpan: HTMLSpanElement = document.createElement('span');
    if (isAbnormal) {
      // Creates a triangular color swatch
      colorSpan.setAttribute(
        'style',
        'width: 0; display:inline-block; margin-right: 6px; ' +
            'height: 0; border-left: 6px solid transparent; ' +
            'border-right: 6px solid transparent; border-bottom: ' +
            '6px solid ' + color.toString() );
    } else {
      // Creates a rectangular color swatch
      colorSpan.setAttribute(
        'style',
        'background-color: ' + color.toString() +
            '; display: inline-block; height: 10px; width: 10px; ' +
            'margin-right: 6px; border-radius: 50%;');
    }
    return colorSpan;
  }

  abstract getTooltip(inputValue: T, sanitizer: DomSanitizer): string;
}

/**
 * This is a generic tooltip for a data point on the graph. It just takes in
 * the data points C3 provides to the tooltip function, then returns a table
 * with a header of the timestamp and a row for each included point.
 * The left hand side of each row is the series label. The right hand side of
 * each row is the y-value.
 */
export class StandardTooltip extends Tooltip<any> {
  constructor(
      private dataPoints: any[], private color: Function, private unit = '') {
    super();
  }

  getTooltip(unused: any, sanitizer: DomSanitizer): string {
    const table = Tooltip.createNewTable();
    Tooltip.addTimeHeader(
        DateTime.fromJSDate(new Date(this.dataPoints[0].x)), table, sanitizer);

    for (const pt of this.dataPoints) {
      Tooltip.addRow(
          table, [pt.name, pt.value + ' ' + this.unit], sanitizer,
          this.color(pt));
    }
    return table.outerHTML;
  }
}
