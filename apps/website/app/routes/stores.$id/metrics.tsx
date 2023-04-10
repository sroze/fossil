import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Curve,
  Label,
} from 'recharts';
import { json, LoaderFunction } from '@remix-run/node';
import { PrometheusDriver } from 'prometheus-query';
import { DateTime, DateTimeUnit, Duration } from 'luxon';
import { useLoaderData, useNavigate } from '@remix-run/react';
import React from 'react';
import { DropDown } from '~/modules/design-system/dropdown';
import { SectionHeader } from '~/modules/design-system/section-header';

type PrometheusRangeVector = {
  metric: {
    labels: Record<string, string>;
  };
  values: Array<{ time: Date; value: number }>;
};

type NameResolver = (
  labels?: PrometheusRangeVector['metric']['labels']
) => string;
type ValueTransformer = (value: number) => number;

type NormalisedRangeVector = {
  metric: string;
  values: PrometheusRangeVector['values'];
};

type LoaderData = {
  metrics: RechartsDataRow[];
  time_range_id: string;
};

type RechartsDataRow = { time: string } & Record<string, string | number>;

export const generateConsistentRanges = (
  start: DateTime,
  end: DateTime,
  duration: Duration
): string[] => {
  let cursorDate = start.toUTC();

  const dates: string[] = [];

  while (cursorDate.valueOf() < end.valueOf()) {
    const endOfWeek = cursorDate.plus(duration);

    dates.push(cursorDate.toISO());

    cursorDate = endOfWeek;
  }

  return dates;
};

const chartRangeVectorsToRechartsData = (
  vectors: NormalisedRangeVector[],
  start: DateTime,
  end: DateTime,
  step: Duration
): RechartsDataRow[] => {
  const byTime: Record<
    string,
    Record<string, string | number | Date>
  > = Object.fromEntries(
    generateConsistentRanges(start, end, step).map((time) => [time, {}])
  );

  for (const { metric, values } of vectors) {
    for (const { time: timeAsDate, value } of values) {
      const time = timeAsDate.toISOString();
      if (!(time in byTime)) {
        console.error(`Time ${time} is not in the expected range.`);
      } else {
        byTime[time][metric] = value;
      }
    }
  }

  return Object.entries(byTime)
    .map(([time, values]) => ({
      ...values,
      time,
    }))
    .sort((a, b) => a.time.localeCompare(b.time));
};

async function fetchAndNormalise(
  client: PrometheusDriver,
  start: DateTime,
  end: DateTime,
  step: Duration,
  query: string,
  nameResolver: NameResolver,
  valueTransformer?: ValueTransformer
): Promise<NormalisedRangeVector[]> {
  const { resultType, result } = await client.rangeQuery(
    query,
    start.toJSDate(),
    end.toJSDate(),
    Math.round(step.toMillis() / 1000)
  );
  if (resultType !== 'matrix' || !result) {
    throw new Error(`Unexpected response from Prometheus.`);
  }

  if (result.length === 0) {
    return [{ metric: nameResolver(), values: [] }];
  }

  return (result as PrometheusRangeVector[]).map((vector) => ({
    metric: nameResolver(vector.metric.labels),
    values: vector.values.map(({ time, value }) => ({
      time,
      value: valueTransformer ? valueTransformer(value) : value,
    })),
  }));
}

type TimeRange = {
  label: string;
  subtitle: string;
  step: { quantity: number; unit: DateTimeUnit };
  duration: Duration;
};
const timeRanges: Record<string, TimeRange> = {
  '2h': {
    label: 'Past 2hrs',
    subtitle: '1 min resolution',
    duration: Duration.fromObject({ hour: 2 }),
    step: { quantity: 1, unit: 'minute' },
  },
  '24h': {
    label: 'Past 24hrs',
    subtitle: '5 min resolution',
    duration: Duration.fromObject({ hour: 24 }),
    step: { quantity: 5, unit: 'minute' },
  },
  '72h': {
    label: 'Past 72hrs',
    subtitle: '15 min resolution',
    duration: Duration.fromObject({ hour: 72 }),
    step: { quantity: 15, unit: 'minute' },
  },
  '7d': {
    label: 'Past 7 days',
    subtitle: '2 hr resolution',
    duration: Duration.fromObject({ day: 7 }),
    step: { quantity: 2, unit: 'hour' },
  },
};

export const loader: LoaderFunction = async ({ params, request }) => {
  const store_id = params.id!;
  const url = new URL(request.url);
  const time_range_id = url.searchParams.get('time_range') || '24h';
  const timeRange = timeRanges[time_range_id];
  if (!timeRange) {
    throw new Error(`Invalid time range.`);
  }

  const client = new PrometheusDriver({
    endpoint: process.env.PROMETHEUS_API_URL!,
  });

  const step = Duration.fromObject({
    [timeRange.step.unit]: timeRange.step.quantity,
  });
  const end = DateTime.now().set({ millisecond: 0, second: 0 });
  const start = end.minus(timeRange.duration);

  const fetchMetric = (
    query: string,
    name: string | NameResolver,
    valueTransformer?: ValueTransformer
  ) =>
    fetchAndNormalise(
      client,
      start,
      end,
      step,
      query,
      (labels) => (typeof name === 'string' ? name : name(labels)),
      valueTransformer
    );

  const fetchRate = (seriesName: string, transformer?: ValueTransformer) =>
    fetchMetric(
      `irate(fossil_${seriesName}{store_id="${store_id}"}[1m])`,
      seriesName,
      transformer || ((value) => Math.round(value * 10) / 10)
    );

  const fetchPercentiles = (seriesName: string, quantile: number) =>
    fetchMetric(
      `histogram_quantile(${quantile}, sum(rate(fossil_${seriesName}_bucket{store_id="${store_id}"}[1m])) by (le))`,
      `${seriesName}_${quantile}`,
      (value) => Math.round(value * 1000)
    );

  const vectors = await Promise.all([
    fetchRate('read_requests'),
    fetchRate('write_requests'),
    fetchRate('read_events'),
    fetchRate('write_events'),
    fetchRate('read_bytes'),
    fetchRate('write_bytes'),
    fetchPercentiles('read_latency', 0.99),
    fetchPercentiles('read_latency', 0.95),
    fetchPercentiles('read_latency', 0.5),
    fetchPercentiles('write_latency', 0.99),
    fetchPercentiles('write_latency', 0.95),
    fetchPercentiles('write_latency', 0.5),
  ]);

  return json<LoaderData>({
    time_range_id,
    metrics: chartRangeVectorsToRechartsData(vectors.flat(), start, end, step),
  });
};

type ChartSeries = {
  id: string;
  color: string;
};

const Chart: React.FC<{
  metrics: RechartsDataRow[];
  series: ChartSeries[];
  stacked?: boolean;
  unit?: string;
}> = ({ metrics, series, stacked, unit }) => {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart
        width={500}
        height={200}
        data={metrics}
        syncId="anyId"
        margin={{
          top: 10,
          right: 30,
          left: 0,
          bottom: 0,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          fontSize={10}
          dataKey="time"
          tickFormatter={(value) =>
            DateTime.fromISO(value).toLocaleString(DateTime.TIME_SIMPLE)
          }
          tickCount={10}
        />
        <YAxis
          fontSize={10}
          tickFormatter={(value) => (unit ? `${value} ${unit}` : value)}
        />
        <Tooltip />
        {series.map(({ id, color }) => (
          <Area
            key={id}
            type="stepBefore"
            dataKey={id}
            stroke={color}
            fill={color}
            stackId={stacked ? '1' : undefined}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
};

const ChartContainer: React.FC<{ label: string }> = ({ label, children }) => (
  <div className="overflow-hidden rounded-lg bg-white px-4 py-4 shadow">
    <dt className="truncate text-sm font-medium text-gray-500 mb-3">{label}</dt>
    {children}
  </div>
);

export default function Store() {
  const { time_range_id, metrics } = useLoaderData<LoaderData>();
  const navigate = useNavigate();

  return (
    <div className="p-5">
      <SectionHeader
        title={'Metrics'}
        subtitle="An overview of your store's performance."
        right={
          <DropDown label={timeRanges[time_range_id].label}>
            {Object.entries(timeRanges).map(([id, t]) => (
              <DropDown.Item
                key={id}
                onClick={() => {
                  navigate(`?time_range=${id}`);
                }}
                className={id === time_range_id ? 'bg-gray-100' : undefined}
              >
                <div className={id === time_range_id ? 'font-bold' : undefined}>
                  {t.label}
                </div>
                <div className="text-sm text-gray-500">{t.subtitle}</div>
              </DropDown.Item>
            ))}
          </DropDown>
        }
      />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 my-4">
        <ChartContainer label="Requests">
          <Chart
            metrics={metrics}
            stacked
            unit="rps"
            series={[
              { id: 'read_requests', color: '#8884d8' },
              { id: 'write_requests', color: '#82ca9d' },
            ]}
          />
        </ChartContainer>

        <ChartContainer label="Events">
          <Chart
            metrics={metrics}
            stacked
            unit="eps"
            series={[
              { id: 'read_events', color: '#8884d8' },
              { id: 'write_events', color: '#82ca9d' },
            ]}
          />
        </ChartContainer>

        <ChartContainer label="Bytes">
          <Chart
            metrics={metrics}
            stacked
            unit="bps"
            series={[
              { id: 'read_bytes', color: '#8884d8' },
              { id: 'write_bytes', color: '#82ca9d' },
            ]}
          />
        </ChartContainer>

        <ChartContainer label="Read latency">
          <Chart
            metrics={metrics}
            unit="ms"
            series={[
              { id: 'read_latency_0.99', color: '#8884d8' },
              { id: 'read_latency_0.95', color: '#82ca9d' },
              { id: 'read_latency_0.5', color: '#ffc658' },
            ]}
          />
        </ChartContainer>

        <ChartContainer label="Write latency">
          <Chart
            metrics={metrics}
            unit="ms"
            series={[
              { id: 'write_latency_0.99', color: '#8884d8' },
              { id: 'write_latency_0.95', color: '#82ca9d' },
              { id: 'write_latency_0.5', color: '#ffc658' },
            ]}
          />
        </ChartContainer>
      </div>
    </div>
  );
}
