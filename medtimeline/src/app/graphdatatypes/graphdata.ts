import {LabeledSeries} from './labeled-series';

/*
 * The base class for holding data pertaining to one graph.
 */
export class GraphData {
  /** A list of the series to be displayed on the graph. */
  readonly series: LabeledSeries[];


  constructor(series: LabeledSeries[]) {
    this.series = series;
  }
}
