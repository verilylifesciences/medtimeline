import {formatNumberWithPrecision} from './number_utils';

// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

describe('formatNumberWithPrecision', () => {
  it('should handle no precision given with a decimal', () => {
    expect(formatNumberWithPrecision(5000.12)).toEqual('5,000.12');
  });

  it('should handle no precision given for a number without a decimal', () => {
    expect(formatNumberWithPrecision(5000)).toEqual('5,000');
  });

  it('should handle 0 precision for a number with a decimal', () => {
    expect(formatNumberWithPrecision(5000.12, 0)).toEqual('5,000');
  });

  it('should handle 0 precision for a number without a decimal', () => {
    expect(formatNumberWithPrecision(5000, 0)).toEqual('5,000');
  });

  it('should handle 2 precision for a number with more than 2 decimal places',
     () => {
       expect(formatNumberWithPrecision(5000.127, 2)).toEqual('5,000.13');
     });

  it('should handle 2 precision for a number with less than 2 decimal places',
     () => {
       expect(formatNumberWithPrecision(5000.1, 2)).toEqual('5,000.10');
     });

  it('should handle 2 precision for a number with 2 decimal places', () => {
    expect(formatNumberWithPrecision(5000.12, 2)).toEqual('5,000.12');
  });

  it('should handle non-0 precision for a number without a decimal', () => {
    expect(formatNumberWithPrecision(5000, 2)).toEqual('5,000.00');
  });

  it('should round numbers to correct precision', () => {
    expect(formatNumberWithPrecision(5000.9, 0)).toEqual('5,001');
    expect(formatNumberWithPrecision(5000.29, 1)).toEqual('5,000.3');
    expect(formatNumberWithPrecision(5000.22, 1)).toEqual('5,000.2');
  });
});
