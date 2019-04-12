// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {Input, OnChanges, SimpleChanges} from '@angular/core';
import {DomSanitizer} from '@angular/platform-browser';
import {ChartDataSets, ChartOptions} from 'chart.js';
import {ChartXAxe} from 'chart.js';
import * as pluginAnnotations from 'chartjs-plugin-annotation';
import {DateTime, Interval, IntervalObject} from 'luxon';
import {Color} from 'ng2-charts';
import {GraphData} from 'src/app/graphdatatypes/graphdata';
import {LabeledSeries} from 'src/app/graphdatatypes/labeled-series';
import {LineGraphData} from 'src/app/graphdatatypes/linegraphdata';
import {v4 as uuid} from 'uuid';

import {StandardTooltip} from '../tooltips/tooltip';

import {DateTimeXAxis} from './datetimexaxis';
import {RenderedChart} from './renderedchart';
import {RenderedCustomizableChart} from './renderedcustomizablechart';

export enum ChartType {
  SCATTER,
  LINE,
  STEP,
  MICROBIO
}

/**
 * Displays a graph. T is the data type the graph is equipped to display.
 */
export abstract class GraphComponent<T extends GraphData> implements OnChanges {
  /** Dummy data series label. */
  private static readonly DEFAULT_BLANK_DATA_LABEL = 'blankdatalabel';

  /**
   * The amount of padding to add to the left of the graph. This goes hand in
   * hand with how we choose to wrap the labels in the rendered chart, so if
   * Y_AXIS_TICK_MAX changes, this probably needs to change, too.
   */
  private static readonly Y_AXIS_LEFT_PADDING = 125;

  /** Line weights for emphasized and non-emphasized line graphs. */
  private static readonly THICK_LINE = 3;
  private static readonly THIN_LINE = 1;

  /** Constants for x and y axis names. */
  static readonly Y_AXIS_ID = 'y-axis-0';
  static readonly X_AXIS_ID = 'x-axis-0';

  /** The base chart height to use when rendering. */
  readonly BASE_CHART_HEIGHT_PX = 150;

  /*****************************************
   * Bound input variables
   */

  /** The x-axis eventlines to display on the chart. */
  @Input() eventlines: Array<{[key: string]: number | string}>;
  /** The x-axis to use for the chart. */
  @Input() dateRange: Interval;
  /** The y-axis label to display. */
  @Input() axisLabel: string;
  /** The graph data to show.  */
  @Input() data: T;
  /** The x regions to mark on this graph. */
  @Input() xRegions: Array<[DateTime, DateTime]>;

  /*****************************************
   * Variables the chart.js directive binds to.
   */

  /** Plugins for chart.js. */
  lineChartPlugins = [pluginAnnotations];

  /**
   * Sets the tooltip for the graph.
   * If the class has a tooltipMap set, then we look up the tooltip from that
   * map. If there's no tooltipMap, then we return a simple formatted tooltip
   * of just the string representing the data plus the appropriate units for
   * a linegraph, or just the unedited value if it's a different kind of graph.
   */
  readonly customTooltips = (tooltipContext) => {
    // Get, or construct, a tooltip element to put all the tooltip HTML into.
    const canvas = document.getElementById(this.chartDivId);
    const tooltipEl = this.findOrCreateTooltipElement(canvas);

    // Hide the element if there is no tooltip-- this function gets called
    // back whether you're hovering over an element or not.
    if (tooltipContext.opacity === 0) {
      tooltipEl.style.opacity = '0';
      return;
    }

    if (tooltipContext.body) {
      tooltipEl.innerHTML = this.getTooltipInnerHtml(tooltipContext);
    }

    // Display the tooltip lined up with the data point.
    const positionY = canvas.offsetTop;
    const positionX = canvas.offsetLeft;
    tooltipEl.style.opacity = '1';
    tooltipEl.style.left = positionX + tooltipContext.caretX + 'px';
    tooltipEl.style.top = positionY + tooltipContext.caretY + 'px';
  };

  // The bindings are unhappy when you provide an empty data array, so we
  // give it a fake label.
  chartData: ChartDataSets[] = [
    {data: [], label: GraphComponent.DEFAULT_BLANK_DATA_LABEL},
  ];

  private generateXAxis(): ChartXAxe {
    return {
      id: GraphComponent.X_AXIS_ID,
      type: 'time',
      gridLines: {
        display: false,
      },
      time: {
        // This sets the bounds of the x-axis. The default values of 0 and 10
        // are nonsensical but necessary since the graph is first rendered
        // before xAxis is bound.
        min: this.dateRange ? this.dateRange.start.toISO() :
                              DateTime.utc().toISO(),
        max: this.dateRange ? this.dateRange.end.toISO() :
                              DateTime.utc().toISO(),
        displayFormats: {
          minute: 'MM/DD H:mm',
          hour: 'MM/DD H:mm',
          day: 'MM/DD H:mm',
          week: 'MM/DD H:mm',
          month: 'MM/DD H:mm',
          quarter: 'MM/DD H:mm',
          year: 'MM/DD H:mm'
        }
      },
      ticks: {
        // Only show as many tick labels will fit neatly on the axis.
        autoSkip: true,
      }
    };
  }

  chartOptions:
      (ChartOptions&{annotation: any}) = {
        // Draw straight lines between points instead of curves.
        elements: {line: {tension: 0}},
        layout: {padding: {top: 15}},
        // We make our own legend so we don't show the built-in one.
        legend: {display: false},
        scales:
            {
              xAxes: [{
                id: GraphComponent.X_AXIS_ID,
                type: 'time',
                gridLines: {
                  display: false,
                },
                time: {
                  // This sets the bounds of the x-axis. The default values of
                  // 0 and 10
                  // are nonsensical but necessary since the graph is first
                  // rendered
                  // before xAxis is bound.
                  min: this.dateRange? this.dateRange.start.toISO():
                         DateTime.utc().toISO(),
                  max: this.dateRange? this.dateRange.end.toISO():
                         DateTime.utc().toISO()
                },
                ticks: {
                  // Only show as many tick labels will fit neatly on the axis.
                  autoSkip: true,
                }
              }],
              yAxes:
                  [
                    {
                      id: GraphComponent.Y_AXIS_ID,
                      position: 'left',
                      gridLines: {
                        display: false,
                      },
                      scaleLabel: {
                        display: true,
                        labelString: '',
                      },
                      ticks:
                          {
                            autoSkip: true,
                            callback:
                                (value, index, values) => {
                                  return (value).toLocaleString('en-us', {
                                    minimumFractionDigits: this.data.precision,
                                    maximumFractionDigits: this.data.precision
                                  });
                                }
                          }
                    },
                  ]
            },
        responsive: false,
        maintainAspectRatio: false,
        // Set up the custom callback for the tooltips.
        tooltips: {
          enabled: false,
          mode: 'x',
          position: 'nearest',
          custom: this.customTooltips
        },
        annotation: {
          // Array of annotation configuration objects to be filled in.
          annotations: []
        },
        /** The settings below are just for better performance. */
        animation: {duration: 0},
        hover: {animationDuration: 0},
        responsiveAnimationDuration: 0
      };

  /**
   * The sequence of colors to use for rendering the LabeledSeries for this
   * chart's data. The ordering of this color array should be in parallel
   * to the ordering of the LabeledSeries in this chart's data.
   */
  chartColors: Color[] = [];

  /** A unique identifier for the element to bind the graph to. */
  chartDivId: string;

  /**
   * The default chart type for this chart. The Angular directive binds
   * to this string to tell chart.js which chart type to use.
   */
  chartTypeString = 'line';

  // Indicating whether are not there are any data points for the current time
  // interval.
  private dataPointsInDateRange: boolean;

  constructor(readonly sanitizer: DomSanitizer) {
    // Generate a unique ID for this chart.
    const chartId = uuid();
    // Replace the dashes in the UUID to meet HTML requirements.
    const re = /\-/gi;
    this.chartDivId = 'chart' + chartId.replace(re, '');
  }

  ngOnInit() {
    this.generateChart();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.eventlines && this.renderedChart) {
      this.renderedChart.updateEventlines(changes.eventlines.currentValue);
    }
    if (changes.dateRange) {
      this.chartOptions.scales.xAxes = [this.generateXAxis()];
    }
  }

  chartConfiguration: any;
  renderedChart: RenderedChart|RenderedCustomizableChart;

  /**
   * When the component gets initialized, it calls this function to make the
   * c3 chart configuration and render it. As outlined in the function below,
   * there are several steps along the way (please see individual function-level
   * comments for more details):
   *
   * 1) prepareForChartConfiguration: an overrideable function in which
   * subclasses can get things ready for the chart configuration to get
   * generated
   * 2) generateBasicChart: make the chart configuration and store
   * it in this class
   * 3) adjustGeneratedChartConfiguration: make any tweaks to the chart
   *    configuration
   * 4) Work with the renderedChart class variable to render
   * the chart via c3 and do some generic styling of the chart
   * 5) onRender callback runs for the graph generated.
   */

  generateChart(focusOnSeries?: LabeledSeries[]) {
    if (this.data && this.dateRange) {
      this.chartData =
          [{data: [], label: GraphComponent.DEFAULT_BLANK_DATA_LABEL}];
      this.dataPointsInDateRange = this.data.dataPointsInRange(this.dateRange);
      this.prepareForChartConfiguration();
      this.generateBasicChart(focusOnSeries);
      this.adjustGeneratedChartConfiguration();
    }
  }

  /**
   * Lines up any extra things needed to generate the ChartConfiguration.
   * This may include things like adding atypical data series, custom-setting
   * colors, etc.
   */
  prepareForChartConfiguration() {}

  /**
   * Takes the generated chart configuration (in this.chartConfiguration) and
   * tweaks it. Override this function to modify the defaults of the chart
   * configuration.
   */
  adjustGeneratedChartConfiguration() {}

  /**
   * Called every time the graph is rendered. If subclass graphs want to do
   * something special upon rendering, they can override this function.
   */
  onRendered(graphObject): void {}


  /**
   * Sets up a generalized c3.ChartConfig for the data passed in. See the
   * type definition at:
   * https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/c3/index.d.ts
   * @param maxXTicks: The maximum number of tick-marks to include on the x-axis
   */
  private generateBasicChart(focusOnSeries?: LabeledSeries[]) {
    // Transform the data into a format that chart.js can render it.
    const data = [];
    for (const series of this.data.series) {
      let lineWidth: number = GraphComponent.THIN_LINE;
      if (focusOnSeries !== undefined && focusOnSeries.includes(series)) {
        lineWidth = GraphComponent.THICK_LINE;
      }
      data.push({
        data: series.coordinates.map(pt => {
          return {x: pt[0].toISO(), y: pt[1]};
        }),
        label: series.label,
        // Do not fill the area under the line.
        fill: false,
        borderWidth: lineWidth
      });
      this.chartColors.push({
        backgroundColor: series.legendInfo.fill,
        borderColor: series.legendInfo.fill,
      });
    }

    // The subclasses may have already put series in lineChartData, and we don't
    // want to remove them, so we just append them to the series. On the other
    // hand, if there's a blank series in lineChartData, we want to get rid of
    // it before putting everything else in.
    if (data.length > 0 && this.onlyDefaultDataPresent()) {
      this.chartData = data;
    } else {
      this.chartData = this.chartData.concat(data);
    }

    // Set the axis label if it's provided.
    this.chartOptions.scales.yAxes[0].scaleLabel.labelString =
        this.axisLabel ? this.axisLabel : '';

    // Add left-padding so that the y-axes are aligned with one another.
    this.chartOptions.scales.yAxes[0]['afterSetDimensions'] = function(axes) {
      axes.paddingLeft = GraphComponent.Y_AXIS_LEFT_PADDING;
    };

    this.showXRegions();
  }

  private showXRegions() {
    for (const region of this.xRegions) {
      const annotation = {
        // Show the region underneath the data points.
        drawTime: 'beforeDatasetsDraw',
        type: 'box',
        xMin: region[0].toMillis(),
        xMax: region[1].toMillis(),
        xScaleID: GraphComponent.X_AXIS_ID,
        yScaleID: GraphComponent.Y_AXIS_ID,
        backgroundColor: 'rgba(179, 157, 219, 0.3)',  // purple secondary color
        borderColor: 'rgba(179, 157, 219, 0.9)',      // purple secondary color
        borderWidth: 2,
      };
      this.chartOptions.annotation.annotations.push(annotation);
    }
  }

  protected onlyDefaultDataPresent() {
    return this.chartData.length === 1 &&
        this.chartData[0].label === GraphComponent.DEFAULT_BLANK_DATA_LABEL;
  }

  /***************************
   * Legend interactions
   */

  resetChart() {
    this.generateChart();
  }

  focusOnSeries(labeledSeries: LabeledSeries[]) {
    this.generateChart(labeledSeries);
  }

  /******************************
   * Helper functions for tooltipping
   */

  /**
   * Finds or creates a HTML element to render the tooltip onto.
   * @param canvas The Canvas this graph is rendered on
   */
  private findOrCreateTooltipElement(canvas: HTMLElement): HTMLElement {
    const tooltipTag = 'chartjs-tooltip' + this.chartDivId;
    let tooltipEl = document.getElementById(tooltipTag);
    if (!tooltipEl) {
      tooltipEl = document.createElement('div');
      tooltipEl.id = tooltipTag;
      tooltipEl.classList.add('chartjs-tooltip');
      tooltipEl.innerHTML = '<table></table>';
      canvas.parentNode.appendChild(tooltipEl);
    }
    return tooltipEl;
  }

  /**
   * Gets the tooltip text for the given context.
   * @param tooltipContext The tooltip context passed into the tooltip callback
   */
  private getTooltipInnerHtml(tooltipContext: any): string {
    // We squish together all points at the same timestamp preemptively in
    // our tooltip creation so that we just find the index of the
    // tooltip based on the first point's x-value.
    const xValue = tooltipContext.dataPoints[0].label;

    const timestampKey = DateTime.fromISO(xValue).toMillis().toString();
    // Our data class may provide a tooltip key function that will
    // get the correct identifier from the data point. If it does,
    // we'll use that, but by default, the key is the timestamp
    // of the data point.
    const keyToUse = this.data.tooltipKeyFn ?
        this.data.tooltipKeyFn(tooltipContext) :
        timestampKey;

    // If something bad happens and we don't have a tooltip for the
    // key, return a generic tooltip with the value.
    let tooltipText;
    if (!this.data.tooltipMap || !this.data.tooltipMap.has(keyToUse)) {
      tooltipText =
          new StandardTooltip(
              [], undefined,
              this.data instanceof LineGraphData ? this.data.unit : '')
              .getTooltip(undefined, this.sanitizer);
    } else {
      tooltipText = this.data.tooltipMap.get(keyToUse);
    }
    return tooltipText;
  }
}
