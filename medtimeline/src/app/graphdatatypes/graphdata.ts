import {DisplayGrouping} from '../clinicalconcepts/display-grouping';

import {LabeledSeries} from './labeled-series';

/*
 * The base class for holding data pertaining to one graph.
 */
export class GraphData {
  constructor(
      /** A list of the series to be displayed on the graph. */ readonly series:
          LabeledSeries[],
      /**
       * The DisplayGroups (for example, lab results, vital signs, medications)
       * associated with particular series. We use this to make a custom legend
       * for the graph.
       */
      readonly seriesToDisplayGroup: Map<LabeledSeries, DisplayGrouping>) {}
}
