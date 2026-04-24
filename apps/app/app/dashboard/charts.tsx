import React from "react";
import type { ScorePoint, StatusSegment, TrendPoint } from "./analytics";

const SURFACE_STROKE = "#D9D4CA";
const SUBTLE_TEXT = "#6B6860";

function createPolyline(points: Array<{ x: number; y: number }>) {
  return points.map((point) => `${point.x},${point.y}`).join(" ");
}

function getPointValue(point: ScorePoint | TrendPoint) {
  return "score" in point ? point.score : point.value;
}

function buildChartPoints(values: number[], maxValue: number) {
  if (values.length === 1) {
    return [{ x: 144, y: 56 }];
  }

  return values.map((value, index) => ({
    x: 24 + (index * 240) / (values.length - 1),
    y: 112 - (value / maxValue) * 88,
  }));
}

type LineChartProps = {
  color: string;
  emptyMessage: string;
  maxValue?: number;
  points: ScorePoint[] | TrendPoint[];
  title: string;
};

export function LineChartCard({
  color,
  emptyMessage,
  maxValue,
  points,
  title,
}: LineChartProps) {
  const values = points.map(getPointValue);
  const safeMax = Math.max(maxValue ?? 0, ...values, 1);
  const chartPoints = buildChartPoints(values, safeMax);
  const polyline = createPolyline(chartPoints);

  return (
    <div
      style={{
        backgroundColor: "#FFFFFF",
        border: `1px solid ${SURFACE_STROKE}`,
        borderRadius: "1rem",
        display: "grid",
        gap: "0.85rem",
        padding: "1rem",
      }}
    >
      <strong style={{ color: "#1A1A18" }}>{title}</strong>
      {points.length === 0 ? (
        <p style={{ color: SUBTLE_TEXT, lineHeight: 1.6, margin: 0 }}>{emptyMessage}</p>
      ) : (
        <>
          <svg
            aria-label={title}
            role="img"
            viewBox="0 0 288 132"
            style={{ height: "auto", width: "100%" }}
          >
            <path
              d="M24 112 H264"
              fill="none"
              stroke={SURFACE_STROKE}
              strokeDasharray="4 4"
              strokeWidth="1"
            />
            <path
              d="M24 68 H264"
              fill="none"
              stroke={SURFACE_STROKE}
              strokeDasharray="4 4"
              strokeWidth="1"
            />
            <polyline
              fill="none"
              points={polyline}
              stroke={color}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="4"
            />
            {chartPoints.map((point, index) => (
              <circle
                key={`${points[index]?.label ?? index}-${point.x}`}
                cx={point.x}
                cy={point.y}
                fill="#FFFFFF"
                r="5"
                stroke={color}
                strokeWidth="3"
              />
            ))}
          </svg>
          <div
            style={{
              display: "grid",
              gap: "0.5rem",
              gridTemplateColumns: "repeat(auto-fit, minmax(92px, 1fr))",
            }}
          >
            {points.map((point) => (
              <div key={point.label} style={{ display: "grid", gap: "0.15rem" }}>
                <span style={{ color: SUBTLE_TEXT, fontSize: "0.9rem" }}>{point.label}</span>
                <strong style={{ color: "#1A1A18" }}>
                  {getPointValue(point)}
                  {"score" in point ? "/100" : ""}
                </strong>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

type DonutChartProps = {
  segments: StatusSegment[];
  title: string;
};

export function DonutChartCard({ segments, title }: DonutChartProps) {
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  const total = segments.reduce((sum, segment) => sum + segment.count, 0);

  return (
    <div
      style={{
        backgroundColor: "#FFFFFF",
        border: `1px solid ${SURFACE_STROKE}`,
        borderRadius: "1rem",
        display: "grid",
        gap: "0.85rem",
        padding: "1rem",
      }}
    >
      <strong style={{ color: "#1A1A18" }}>{title}</strong>
      <div
        style={{
          alignItems: "center",
          display: "grid",
          gap: "1rem",
          gridTemplateColumns: "minmax(0, 160px) minmax(0, 1fr)",
        }}
      >
        <svg
          aria-label={title}
          role="img"
          viewBox="0 0 140 140"
          style={{ justifySelf: "center", maxWidth: "140px", width: "100%" }}
        >
          <circle
            cx="70"
            cy="70"
            fill="none"
            r={radius}
            stroke={SURFACE_STROKE}
            strokeWidth="18"
          />
          {total === 0 ? null : segments.map((segment) => {
            const length = (segment.count / total) * circumference;
            const circle = (
              <circle
                key={segment.status}
                cx="70"
                cy="70"
                fill="none"
                r={radius}
                stroke={segment.color}
                strokeDasharray={`${length} ${circumference - length}`}
                strokeDashoffset={-offset}
                strokeLinecap="round"
                strokeWidth="18"
                transform="rotate(-90 70 70)"
              />
            );

            offset += length;

            return circle;
          })}
          <text
            fill="#1A1A18"
            fontSize="16"
            fontWeight="700"
            textAnchor="middle"
            x="70"
            y="66"
          >
            {total}
          </text>
          <text
            fill={SUBTLE_TEXT}
            fontSize="11"
            textAnchor="middle"
            x="70"
            y="84"
          >
            candidatures
          </text>
        </svg>
        <div style={{ display: "grid", gap: "0.65rem" }}>
          {segments.map((segment) => (
            <div
              key={segment.status}
              style={{
                alignItems: "center",
                display: "grid",
                gap: "0.5rem",
                gridTemplateColumns: "12px minmax(0, 1fr) auto",
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  backgroundColor: segment.color,
                  borderRadius: "999px",
                  display: "block",
                  height: "12px",
                  width: "12px",
                }}
              />
              <span style={{ color: "#1A1A18" }}>{segment.label}</span>
              <span style={{ color: SUBTLE_TEXT }}>
                {segment.count} · {segment.percentage}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
