// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {DateTime, Interval} from 'luxon';
import {Specimen} from './specimen';

const REQUEST_ID = '1234';

describe('Specimen', () => {
  const specimenString = {
    id: 'specimen_id',
    type: {text: 'specimen_source_type'},
    collection: {
      collectedPeriod:
          {start: '2018-08-31T13:48:00-04:00', end: '2018-09-21T13:48:00-04:00'}
    }
  };

  it('should get ID from json if it is present', () => {
    const specimen = new Specimen(specimenString, REQUEST_ID);
    expect(specimen.id).toBe('specimen_id');
  });

  it('should get source type from json', () => {
    const specimen = new Specimen(specimenString, REQUEST_ID);
    expect(specimen.type).toBe('specimen_source_type');
  });

  it('should raise an error if collectedPeriod and collectedDateTime' +
         ' are both present',
     () => {
       expect(() => {
         const specimen = new Specimen(
             {
               id: 'specimen_id',
               type: {text: 'specimen_source_type'},
               collection: {
                 collectedPeriod: {start: '1957-01-14T13:48:00-04:00'},
                 collectedDateTime: '1957-01-14T13:48:00-04:00'
               }
             },
             REQUEST_ID);
       }).toThrowError(new RegExp(`Request IDs: ${REQUEST_ID}`));
     });


  it('should raise an error if there is no type', () => {
    expect(() => {
      const specimen = new Specimen(
          {
            id: 'specimen_id',
            collection: {collectedDateTime: '1957-01-14T13:48:00-04:00'}
          },
          REQUEST_ID);
    }).toThrowError(new RegExp(`Request IDs: ${REQUEST_ID}`));
  });

  it('should raise an error if there is no collection information', () => {
    expect(() => {
      const specimen = new Specimen(
          {
            id: 'specimen_id',
            type: {text: 'specimen_source_type'},
          },
          REQUEST_ID);
    }).toThrowError(new RegExp(`Request IDs: ${REQUEST_ID}`));
  });

  it('should get collection time from collectedDateTime in json', () => {
    const specimen = new Specimen(
        {
          id: 'specimen_id',
          type: {text: 'specimen_source_type'},
          collection: {collectedDateTime: '1957-01-15T13:48:00-04:00'}
        },
        REQUEST_ID);
    expect(specimen.collectedDateTime)
        .toEqual(DateTime.fromISO('1957-01-15T13:48:00-04:00'));
  });

  it('should get collection time from collectedPeriod in json', () => {
    const specimen = new Specimen(specimenString, REQUEST_ID);
    expect(specimen.collectedPeriod)
        .toEqual(Interval.fromDateTimes(
            DateTime.fromISO('2018-08-31T13:48:00-04:00'),
            DateTime.fromISO('2018-09-21T13:48:00-04:00')));
  });

  it('should assign the start time from collectedPeriod to collectedDateTime' +
         ' when only start time is present',
     () => {
       const specimen = new Specimen(
           {
             id: 'specimen_id',
             type: {text: 'specimen_source_type'},
             collection: {collectedPeriod: {start: '2018-08-31T13:48:00-04:00'}}
           },
           REQUEST_ID);
       expect(specimen.collectedDateTime)
           .toEqual(DateTime.fromISO('2018-08-31T13:48:00-04:00'));
     });
});
