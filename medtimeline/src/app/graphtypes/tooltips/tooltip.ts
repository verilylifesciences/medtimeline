// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {SecurityContext} from '@angular/core';
import {DomSanitizer} from '@angular/platform-browser';
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
  static createNewTable(): HTMLTableElement {
    const table: HTMLTableElement = document.createElement('table');
    table.setAttribute('class', 'c3-tooltip');
    return table;
  }

  static addTimeHeader(
      timestamp: DateTime, table: HTMLTableElement, sanitizer: DomSanitizer,
      colSpan = 2) {
    Tooltip.addHeader(
        Tooltip.formatTimestamp(timestamp), table, sanitizer, colSpan);
  }

  static formatTimestamp(timestamp: DateTime) {
    return timestamp.toLocaleString() + ' ' +
        timestamp.toLocal().toLocaleString(DateTime.TIME_24_SIMPLE);
  }

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

  static addRow(
      table: HTMLTableElement, cellText: string[], sanitizer: DomSanitizer) {
    const row = table.insertRow();
    for (let i = 0; i < cellText.length; i++) {
      const cell1 = row.insertCell();
      if (i === 0) {
        cell1.className = 'name';
      } else {
        cell1.className = 'value';
      }
      cell1.innerHTML = sanitizer.sanitize(SecurityContext.HTML, cellText[i]);
    }
  }

  abstract getTooltip(inputValue: T, sanitizer: DomSanitizer): string;
}
