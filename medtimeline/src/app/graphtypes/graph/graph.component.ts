// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {Inject, Input, OnChanges, OnInit, SimpleChanges, ViewChild} from '@angular/core';
import {DomSanitizer} from '@angular/platform-browser';
import {Chart, ChartDataSets, ChartOptions, ChartXAxe, ChartYAxe} from 'chart.js';
import * as pluginAnnotations from 'chartjs-plugin-annotation';
import {DateTime, Interval} from 'luxon';
import {BaseChartDirective, Color} from 'ng2-charts';
import {GraphData} from 'src/app/graphdatatypes/graphdata';
import {LabeledSeries} from 'src/app/graphdatatypes/labeled-series';
import {LineGraphData} from 'src/app/graphdatatypes/linegraphdata';
import {UI_CONSTANTS, UI_CONSTANTS_TOKEN} from 'src/constants';
import {v4 as uuid} from 'uuid';

import {StandardTooltip} from '../tooltips/tooltip';

export enum ChartType {
  SCATTER,
  LINE,
  STEP,
  MICROBIO
}

/**
 * Displays a graph. T is the data type the graph is equipped to display.
 */
export abstract class GraphComponent<T extends GraphData> implements OnInit,
                                                                     OnChanges {
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

  /** The eventline annotations to keep track of. */
  protected annotations = [];

  /**
   * The entire interval represented by the current date range. This Interval
   * goes from the beginning of the first day of the date range, to the end of
   * the last day of the date range.
   */
  protected entireInterval: Interval;

  /** Whether data is available for this graph for the current date range. */
  private dataPointsInDateRange = false;

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

  @ViewChild(BaseChartDirective) chart: BaseChartDirective;
  /** Plugins for chart.js. */
  chartPlugins = [pluginAnnotations];

  /**
   * Sets the tooltip for the graph.
   * If the class has a tooltipMap set, then we look up the tooltip from that
   * map. If there's no tooltipMap, then we return a simple formatted tooltip
   * of just the string representing the data plus the appropriate units for
   * a linegraph, or just the unedited value if it's a different kind of graph.
   */
  readonly customTooltips =
      (tooltipContext) => {
        // Get, or construct, a tooltip element to put all the tooltip HTML
        // into.
        const canvas = document.getElementById(this.chartDivId);
        const tooltipEl = this.findOrCreateTooltipElement(
            canvas, 'chartjs-tooltip' + this.chartDivId);

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
      }

  // The bindings are unhappy when you provide an empty data array, so we
  // give it a fake series to render.
  /**
   * The chart data sets to render.
   */
  chartData: ChartDataSets[] = [
    {data: [], label: GraphComponent.DEFAULT_BLANK_DATA_LABEL},
  ];

  /**
   * Chart options to be rendered.
   */
  readonly chartOptions: (ChartOptions&{annotation: any}) = {
    // Draw straight lines between points instead of curves.
    elements: {line: {tension: 0}},
    layout: {padding: {top: 15}},
    // We make our own legend so we don't show the built-in one.
    legend: {display: false},
    scales: {xAxes: [this.generateXAxis()], yAxes: [this.generateYAxis()]},
    // Needed to grow the graph to fit the space.
    responsive: true,
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
    // Disable any visual changes on hovering.
    hover: {mode: null},
    /** The settings below are just for better performance. */
    animation: {duration: 0},
    responsiveAnimationDuration: 0
  };

  /** A unique identifier for the element to bind the graph to. */
  chartDivId: string;

  /**
   * The default chart type for this chart. The Angular directive binds
   * to this string to tell chart.js which chart type to use.
   */
  chartTypeString = 'line';

  constructor(
      readonly sanitizer: DomSanitizer,
      @Inject(UI_CONSTANTS_TOKEN) readonly uiConstants: any) {
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
    if (changes.eventlines) {
      this.updateEventlines(changes.eventlines.currentValue);
    }
    if (changes.dateRange) {
      this.chartOptions.scales.xAxes = [this.generateXAxis()];
      this.entireInterval = Interval.fromDateTimes(
          this.dateRange.start.toLocal().startOf('day'),
          this.dateRange.end.toLocal().endOf('day'));
    }
    if (changes.xRegions) {
      this.showXRegions();
    }
  }

  /**
   * When the component gets initialized and upon updates, this series of calls
   * modifies the data-bound variables so that the correct chart gets rendered.
   *
   * 1) prepareForChartConfiguration: an overrideable function in which
   *    subclasses can get things ready for the chart to load in data
   * 2) generateBasicChart: load in the chart data and do formatting that all
   *    subclasses share in common
   * 3) adjustGeneratedChartConfiguration: make any tweaks to the chart
   *    that couldn't be made until the data got loaded in
   */

  generateChart(focusOnSeries?: LabeledSeries[]) {
    if (this.data && this.dateRange) {
      this.chartData =
          [{data: [], label: GraphComponent.DEFAULT_BLANK_DATA_LABEL}];
      this.entireInterval = Interval.fromDateTimes(
          this.dateRange.start.toLocal().startOf('day'),
          this.dateRange.end.toLocal().endOf('day'));
      this.dataPointsInDateRange = this.data.dataPointsInRange(this.dateRange);
      this.prepareForChartConfiguration();
      this.generateBasicChart(focusOnSeries);
      this.adjustGeneratedChartConfiguration();
    }
  }

  updateEventlines(eventlines: Array<{[key: string]: number | string}>) {
    const currentInterval = Interval.fromDateTimes(
        this.dateRange.start.toLocal().startOf('day'),
        this.dateRange.end.toLocal().endOf('day'));
    this.chartOptions.annotation.annotations =
        this.chartOptions.annotation.annotations.filter(
            a => !(a.id && a.id.includes('eventline')));
    if (this.chart) {
      for (const eventline of eventlines) {
        const currentDate = DateTime.fromMillis(Number(eventline.value));
        if (currentInterval.contains(currentDate)) {
          const line = {
            type: 'line',
            mode: 'vertical',
            id: 'eventline' + eventline.value,
            scaleID: GraphComponent.X_AXIS_ID,
            value: currentDate.toJSDate(),
            borderColor: eventline.color,
            borderWidth: 2,
          };
          this.chartOptions.annotation.annotations.push(line);
        }
      }
      this.reloadChart();
    }
  }

  reloadChart() {
    if (this.chart !== undefined && this.chart.chart !== undefined) {
      this.chart.chart.destroy();

      this.chart.datasets = this.chartData;
      this.chart.options = this.chartOptions;
      this.chart.ngOnInit();
    }
  }

  /**
   * Lines up any extra things needed to generate the
   * chart. Override this function when you need to make changes before the data
   * is loaded into the chart or when you need to load more data into the chart.
   */
  prepareForChartConfiguration() {}

  /**
   * Tweaks the generated chart. Override this function when you need to make
   * changes based on the data loaded into the chart.
   */
  adjustGeneratedChartConfiguration() {}

  /**
   * Sets up a generalized c3.ChartConfig for the data passed in. See
   * the type definition at:
   * https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/c3/index.d.ts
   */
  private generateBasicChart(focusOnSeries?: LabeledSeries[]) {
    // Transform the data into a format that chart.js can render it.
    Chart.defaults.global.defaultFontFamily = 'Work Sans';
    const data = [];
    for (const series of this.data.series) {
      let lineWidth: number = GraphComponent.THIN_LINE;
      if (focusOnSeries !== undefined && focusOnSeries.includes(series)) {
        lineWidth = GraphComponent.THICK_LINE;
      }
      if (series.coordinates.length > 0) {
        data.push({
          data: series.coordinates.map(pt => {
            return {x: pt[0].toISO(), y: pt[1]};
          }),
          label: series.label,
          // Do not fill the area under the line.
          fill: false,
          borderWidth: lineWidth,
          pointBorderWidth: 2,
          pointRadius: 3,
          backgroundColor: series.legendInfo.fill,
          borderColor: series.legendInfo.fill,
          pointBackgroundColor: series.legendInfo.fill,
          pointBorderColor: series.legendInfo.outline,
        });
      }
    }

    // The subclasses may have already put series in lineChartData, and
    // we don't want to remove them, so we just append them to the
    // series. On the other hand, if there's a blank series in
    // lineChartData, we want to get rid of it before putting everything
    // else in.
    if (data.length > 0 && this.onlyDefaultDataPresent()) {
      this.chartData = data;
    } else {
      this.chartData = this.chartData.concat(data);
    }

    // Set the axis label if it's provided.
    this.chartOptions.scales.yAxes[0].scaleLabel.labelString = this.axisLabel ?
        this.axisLabel.substr(0, 10) +
            (this.axisLabel.length > 10 ? '...' : '') :
        '';

    // Add left-padding so that the y-axes are aligned with one another.
    this.chartOptions.scales.yAxes[0]['afterSetDimensions'] = function(axes) {
      axes.paddingLeft = GraphComponent.Y_AXIS_LEFT_PADDING;
    };

    const self = this;
    this.chartOptions.animation.onComplete = function(chart) {
      self.showNoDataLabel(this);
    };

    this.showXRegions();
  }

  private showXRegions() {
    if (!this.xRegions) {
      return;
    }
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

  showNoDataLabel(chart: any) {
    if (!this.dataPointsInDateRange) {
      // Remove all other ctx objects drawn.
      chart.clear();
      chart.draw();

      const xCoordinate = chart.width / 2;
      const yCoordinate = chart.height / 2;
      chart.ctx.textAlign = 'center';
      chart.ctx.fillText(
          UI_CONSTANTS.NO_DATA_AVAILABLE_TMPL +
              this.entireInterval.start.toLocal().toLocaleString() + ' and ' +
              this.entireInterval.end.toLocal().toLocaleString(),
          xCoordinate, yCoordinate);
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
   * @param uniqueId The unique ID to give to this element. If not provided,
   *     will use 'chartjs-tooltip' + the chart div ID.
   */
  protected findOrCreateTooltipElement(canvas: HTMLElement, uniqueId: string):
      HTMLElement {
    const tooltipTag =
        uniqueId ? uniqueId : 'chartjs-tooltip' + this.chartDivId;
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
   * @param tooltipContext The tooltip context passed into the tooltip
   *     callback
   */
  private getTooltipInnerHtml(tooltipContext: any): string {
    // We squish together all points at the same timestamp preemptively
    // in our tooltip creation so that we just find the index of the
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

  /*************************
   * Helper functions for other chart options
   */
  protected generateXAxis(): ChartXAxe {
    return {
      id: GraphComponent.X_AXIS_ID,
      type: 'time',
      gridLines: {display: true, drawOnChartArea: false},
      time: {
        // This sets the bounds of the x-axis. The default values of 0 and 10
        // are nonsensical but necessary since the graph is first rendered
        // before dateRange is bound.
        min: this.dateRange ? this.dateRange.start.toISO() :
                              DateTime.utc().toISO(),
        max: this.dateRange ? this.dateRange.end.toISO() :
                              DateTime.utc().toISO(),
        // If we're showing fewer than three days, go for the hour axis labels;
        // otherwise go with by-day axis labels.
        unit: this.dateRange && (this.dateRange.length('day') > 3) ? 'day' :
                                                                     'hour',
        displayFormats: {
          hour: 'MM/DD H:mm',
          day: 'MM/DD',
        }
      },
      ticks: {
        // Only show as many tick labels will fit neatly on the axis.
        autoSkip: true,
        display: true
      },
      scaleLabel: {fontFamily: 'Work Sans'}
    };
  }

  private generateYAxis(): ChartYAxe {
    return {
      id: GraphComponent.Y_AXIS_ID,
      position: 'left',
      // Show tick marks but not grid lines.
      gridLines: {display: true, drawOnChartArea: false},
      scaleLabel: {
        display: true,
        labelString: '',
      },
      ticks: {
        // We explicitly set the y values to show, so we don't want to use
        // autoskip.
        autoSkip: false,
        callback: (value, index, values) => {
          if (!this.data || !this.data.precision) {
            return value;
          }
          return (value).toLocaleString('en-us', {
            minimumFractionDigits: this.data.precision,
            maximumFractionDigits: this.data.precision
          });
        }
      }
    };
  }
}
