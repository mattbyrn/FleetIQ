import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ResponsiveContainer,
  Text,
} from 'recharts';
import { Typography, Box } from '@material-ui/core';

const HOUR_START = 5;
const HOUR_END = 23;
const MINUTES_RANGE = (HOUR_END - HOUR_START) * 60;

const COLORS = [
  '#1976d2',
  '#388e3c',
  '#f57c00',
  '#7b1fa2',
  '#c62828',
  '#00838f',
  '#4e342e',
  '#283593',
  '#558b2f',
  '#ad1457',
];

function parseTime(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const parts = timeStr.split(':');
  if (parts.length < 2) return null;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
}

function formatMinutes(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function buildChartData(jobs) {
  const grouped = {};

  jobs.forEach((job) => {
    const startMins = parseTime(job.startTime);
    const endMins = parseTime(job.endTime);
    if (startMins === null || endMins === null) return;
    if (endMins <= startMins) return;

    const label = job.driverName || job.vehicleRegistration || 'Unassigned';

    if (!grouped[label]) {
      grouped[label] = [];
    }
    grouped[label].push({
      ...job,
      startMins,
      endMins,
      label,
    });
  });

  const rows = Object.entries(grouped)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, items], idx) => ({
      label,
      items,
      index: idx,
    }));

  return rows;
}

const CustomBar = (props) => {
  const { x, y, width, height, payload, barIndex } = props;
  if (!payload || !payload.items || !payload.items[barIndex]) return null;

  const item = payload.items[barIndex];
  const barStart =
    ((item.startMins - HOUR_START * 60) / MINUTES_RANGE) * width + x;
  const barEnd = ((item.endMins - HOUR_START * 60) / MINUTES_RANGE) * width + x;
  const barWidth = barEnd - barStart;
  const colorIdx = (payload.index * 3 + barIndex) % COLORS.length;

  if (barWidth <= 0) return null;

  return (
    <g>
      <rect
        x={barStart}
        y={y + 2}
        width={barWidth}
        height={height - 4}
        fill={COLORS[colorIdx]}
        rx={4}
        ry={4}
        style={{ cursor: 'pointer' }}
      />
      {barWidth > 60 && (
        <text
          x={barStart + barWidth / 2}
          y={y + height / 2 + 1}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="white"
          fontSize={12}
          fontWeight={500}
        >
          {(() => {
            const client = item.client || '';
            const vehicle = item.vehicleRegistration
              ? ` — ${item.vehicleRegistration}`
              : '';
            const text = client
              ? `${client}${vehicle}`
              : item.vehicleRegistration || 'No client';
            const maxChars = Math.floor(barWidth / 8);
            return text.length > maxChars
              ? text.substring(0, maxChars) + '...'
              : text;
          })()}
        </text>
      )}
    </g>
  );
};

const CustomTooltipContent = ({ active, payload }) => {
  if (!active || !payload || !payload[0]) return null;
  const row = payload[0]?.payload;
  if (!row || !row.items) return null;

  return (
    <Box
      style={{
        background: 'white',
        border: '1px solid #ccc',
        borderRadius: 4,
        padding: '8px 12px',
        maxWidth: 300,
      }}
    >
      <Typography style={{ fontWeight: 600, marginBottom: 4 }}>
        {row.label}
      </Typography>
      {row.items.map((item, i) => (
        <Box key={i} style={{ marginBottom: i < row.items.length - 1 ? 6 : 0 }}>
          <Typography variant="body2">
            {item.client || 'No client'} &mdash; {item.startTime} to{' '}
            {item.endTime}
          </Typography>
          {item.vehicleRegistration && (
            <Typography variant="caption" style={{ color: '#666' }}>
              Vehicle: {item.vehicleRegistration}
            </Typography>
          )}
        </Box>
      ))}
    </Box>
  );
};

export default function GanttChart({ jobs }) {
  if (!jobs || jobs.length === 0) {
    return (
      <Box
        style={{
          textAlign: 'center',
          padding: '60px 20px',
          color: '#999',
        }}
      >
        <Typography variant="h6">No jobs scheduled for this date</Typography>
      </Box>
    );
  }

  const chartData = buildChartData(jobs);

  if (chartData.length === 0) {
    return (
      <Box
        style={{
          textAlign: 'center',
          padding: '60px 20px',
          color: '#999',
        }}
      >
        <Typography variant="h6">
          No jobs with valid start/end times for this date
        </Typography>
      </Box>
    );
  }

  const maxItems = Math.max(...chartData.map((r) => r.items.length));
  const rowHeight = 48;
  const chartHeight = Math.max(chartData.length * rowHeight + 80, 200);

  const ticks = [];
  for (let h = HOUR_START; h <= HOUR_END; h++) {
    ticks.push(h * 60);
  }

  return (
    <ResponsiveContainer width="100%" height={chartHeight}>
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
        barCategoryGap="20%"
      >
        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
        <XAxis
          type="number"
          domain={[HOUR_START * 60, HOUR_END * 60]}
          ticks={ticks}
          tickFormatter={(val) => formatMinutes(val)}
          fontSize={12}
        />
        <YAxis
          type="category"
          dataKey="label"
          width={140}
          fontSize={13}
          tick={{ fill: '#333' }}
        />
        <Tooltip content={<CustomTooltipContent />} />
        {Array.from({ length: maxItems }).map((_, barIdx) => (
          <Bar
            key={barIdx}
            dataKey={() => HOUR_END * 60}
            shape={(props) => <CustomBar {...props} barIndex={barIdx} />}
            isAnimationActive={false}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
