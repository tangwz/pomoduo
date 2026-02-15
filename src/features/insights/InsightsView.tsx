import { useEffect, useMemo, useState } from 'react';
import { useI18n } from '../../i18n';
import { buildTrendSeries } from './trends';
import type { ChartDimension, InsightsSnapshot, TrendPoint } from './types';

interface InsightsViewProps {
  snapshot: InsightsSnapshot | null;
  errorMessage: string | null;
}

const DIMENSION_ORDER: ChartDimension[] = ['daily', 'weekly', 'monthly'];

function levelClass(focusCompleted: number): string {
  if (focusCompleted <= 0) {
    return 'insights-heatmap-cell--0';
  }
  if (focusCompleted <= 2) {
    return 'insights-heatmap-cell--1';
  }
  if (focusCompleted <= 4) {
    return 'insights-heatmap-cell--2';
  }
  if (focusCompleted <= 7) {
    return 'insights-heatmap-cell--3';
  }
  return 'insights-heatmap-cell--4';
}

interface TrendLineChartProps {
  points: TrendPoint[];
  dimension: ChartDimension;
}

function TrendLineChart({ points, dimension }: TrendLineChartProps) {
  const { messages } = useI18n();
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  useEffect(() => {
    setHoverIndex(null);
  }, [dimension]);

  if (points.length === 0) {
    return <p className="insights-chart-empty">{messages.insights.chartEmpty}</p>;
  }

  const chartHeight = 220;
  const paddingLeft = 30;
  const paddingRight = 18;
  const paddingTop = 12;
  const paddingBottom = 30;
  const innerHeight = chartHeight - paddingTop - paddingBottom;
  const innerWidth = Math.max(280, (points.length - 1) * 42);
  const svgWidth = paddingLeft + innerWidth + paddingRight;

  const maxValue = Math.max(
    1,
    ...points.map((point) => Math.max(point.focusCompleted, point.longCycleCompleted)),
  );

  const yTickCount = 4;
  const step = points.length > 1 ? innerWidth / (points.length - 1) : 0;
  const xAt = (index: number): number => paddingLeft + index * step;
  const yAt = (value: number): number =>
    paddingTop + innerHeight - (value / maxValue) * innerHeight;

  const buildPath = (series: 'focus' | 'longCycle'): string => {
    return points
      .map((point, index) => {
        const x = xAt(index);
        const value =
          series === 'focus' ? point.focusCompleted : point.longCycleCompleted;
        const y = yAt(value);
        return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .join(' ');
  };

  const focusPath = buildPath('focus');
  const longCyclePath = buildPath('longCycle');
  const xLabelStep = Math.max(1, Math.ceil(points.length / 6));
  const activePoint = hoverIndex === null ? null : points[hoverIndex];

  return (
    <div className="insights-chart-wrap">
      <div className="insights-chart-scroll">
        <svg
          className="insights-chart-svg"
          viewBox={`0 0 ${svgWidth} ${chartHeight}`}
          style={{ width: `${svgWidth}px`, height: `${chartHeight}px` }}
          role="img"
          aria-label={messages.insights.chartTitle}
          data-testid="insights-trend-chart"
        >
          {Array.from({ length: yTickCount + 1 }).map((_, index) => {
            const value = Math.round((maxValue * index) / yTickCount);
            const y = yAt(value);
            return (
              <g key={value}>
                <line
                  className="insights-chart-grid"
                  x1={paddingLeft}
                  y1={y}
                  x2={paddingLeft + innerWidth}
                  y2={y}
                />
                <text className="insights-chart-y-label" x={paddingLeft - 8} y={y + 3}>
                  {value}
                </text>
              </g>
            );
          })}

          <path className="insights-chart-line insights-chart-line--focus" d={focusPath} />
          <path
            className="insights-chart-line insights-chart-line--long-cycle"
            d={longCyclePath}
          />

          {points.map((point, index) => {
            const x = xAt(index);
            const focusY = yAt(point.focusCompleted);
            const longCycleY = yAt(point.longCycleCompleted);
            const showLabel = index % xLabelStep === 0 || index === points.length - 1;

            return (
              <g key={point.key}>
                <circle
                  cx={x}
                  cy={focusY}
                  r={3.2}
                  className="insights-chart-point insights-chart-point--focus"
                  data-series="focus"
                  onMouseEnter={() => setHoverIndex(index)}
                  onMouseLeave={() => setHoverIndex((prev) => (prev === index ? null : prev))}
                />
                <circle
                  cx={x}
                  cy={longCycleY}
                  r={3.2}
                  className="insights-chart-point insights-chart-point--long-cycle"
                  data-series="longCycle"
                  onMouseEnter={() => setHoverIndex(index)}
                  onMouseLeave={() => setHoverIndex((prev) => (prev === index ? null : prev))}
                />
                {showLabel ? (
                  <text className="insights-chart-x-label" x={x} y={chartHeight - 8}>
                    {point.label}
                  </text>
                ) : null}
              </g>
            );
          })}
        </svg>
      </div>

      <div className="insights-chart-meta">
        <div className="insights-chart-legend">
          <span className="legend-item">
            <span className="legend-dot legend-dot--focus" />
            {messages.insights.series.focus}
          </span>
          <span className="legend-item">
            <span className="legend-dot legend-dot--long-cycle" />
            {messages.insights.series.longCycle}
          </span>
        </div>
        <div className="insights-chart-tooltip" role="status">
          {activePoint
            ? messages.insights.chartTooltip(
                activePoint.label,
                activePoint.focusCompleted,
                activePoint.longCycleCompleted,
              )
            : messages.insights.chartHint}
        </div>
      </div>
    </div>
  );
}

export default function InsightsView({ snapshot, errorMessage }: InsightsViewProps) {
  const { locale, messages } = useI18n();
  const [dimension, setDimension] = useState<ChartDimension>('weekly');

  const trendSeries = useMemo(
    () => (snapshot ? buildTrendSeries(snapshot.heatmap, dimension, locale) : []),
    [snapshot, dimension, locale],
  );

  return (
    <section className="insights-page">
      <header className="insights-page-head">
        <h2>{messages.insights.drawerTitle}</h2>
      </header>
      {errorMessage ? (
        <p className="app-error" role="alert">
          {errorMessage}
        </p>
      ) : null}
      {!snapshot ? (
        <p className="insights-loading">{messages.insights.loading}</p>
      ) : (
        <section className="insights-page-card">
          <section className="insights-section">
            <p className="insights-week-start">{messages.insights.weekStart}</p>
            <div className="insights-heatmap-wrap">
              <div className="insights-heatmap-title">{messages.insights.heatmapTitle}</div>
              <div
                className="insights-heatmap-grid"
                role="img"
                aria-label={messages.insights.heatmapTitle}
              >
                {snapshot.heatmap.map((day) => (
                  <div
                    key={day.date}
                    className={`insights-heatmap-cell ${levelClass(day.focusCompleted)}`}
                    title={`${day.date}: ${day.focusCompleted} / ${day.longCycleCompleted}`}
                  />
                ))}
              </div>
              <div className="insights-heatmap-legend">
                <span>{messages.insights.heatmapLegendLess}</span>
                <span className="insights-heatmap-cell insights-heatmap-cell--0" />
                <span className="insights-heatmap-cell insights-heatmap-cell--1" />
                <span className="insights-heatmap-cell insights-heatmap-cell--2" />
                <span className="insights-heatmap-cell insights-heatmap-cell--3" />
                <span className="insights-heatmap-cell insights-heatmap-cell--4" />
                <span>{messages.insights.heatmapLegendMore}</span>
              </div>
            </div>

            <div className="insights-chart-card">
              <div className="insights-chart-head">
                <h4>{messages.insights.chartTitle}</h4>
                <div
                  className="insights-dimension-switch"
                  role="tablist"
                  aria-label={messages.insights.chartTitle}
                >
                  {DIMENSION_ORDER.map((item) => (
                    <button
                      key={item}
                      type="button"
                      role="tab"
                      aria-selected={dimension === item}
                      className={dimension === item ? 'is-active' : ''}
                      onClick={() => setDimension(item)}
                    >
                      {messages.insights.dimension[item]}
                    </button>
                  ))}
                </div>
              </div>
              <TrendLineChart points={trendSeries} dimension={dimension} />
            </div>
          </section>
        </section>
      )}
    </section>
  );
}
