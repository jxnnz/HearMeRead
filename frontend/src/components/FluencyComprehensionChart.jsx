import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, LabelList,
  ResponsiveContainer, CartesianGrid,
} from "recharts";
import { useWindowWidth } from "../hooks/useWindowWidth";

const FLUENCY_COLOR       = "#2c3e6b"; // dark navy
const COMPREHENSION_COLOR = "#f39c12"; // amber/orange

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "#fff", border: "1px solid #eee",
      borderRadius: 8, padding: "8px 12px", fontSize: 12,
    }}>
      <p style={{ fontWeight: 700, marginBottom: 4 }}>{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.fill, margin: "2px 0" }}>
          {p.name}: {p.value}{p.unit ?? ""}
        </p>
      ))}
    </div>
  );
}

export default function FluencyComprehensionChart({
  data  = [],
  title = "Reading Fluency and Comprehension Average %",
  unit  = "%",
}) {
  const windowWidth = useWindowWidth();
  const isMobile    = windowWidth <= 768;

  const chartHeight = isMobile ? 160 : 220;
  const tickSize    = isMobile ? 10  : 12;
  const axisSz      = isMobile ? 9   : 11;

  return (
    <div className="db-chart-card db-chart-card--full">
      <div className="db-chart-header">
        <h3 className="db-chart-title">{title}</h3>
      </div>

      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart
          data={data}
          margin={{ top: 16, right: 8, left: -16, bottom: 0 }}
          barCategoryGap="35%"
          barGap={4}
        >
          <CartesianGrid vertical={false} stroke="#f0f2f8" />
          <XAxis
            dataKey="group"
            tick={{ fontSize: tickSize, fontFamily: "Poppins" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: axisSz, fontFamily: "Poppins" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${v}${unit}`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: axisSz, fontFamily: "Poppins", paddingTop: 8 }}
            iconType="circle"
            iconSize={8}
          />
          <Bar
            dataKey="fluency"
            name="Reading Fluency"
            fill={FLUENCY_COLOR}
            radius={[3, 3, 0, 0]}
            maxBarSize={36}
            unit={unit}
          >
            {!isMobile && (
              <LabelList
                dataKey="fluency"
                position="insideTop"
                formatter={(v) => (v > 0 ? `${v}${unit}` : "")}
                style={{ fill: "#fff", fontSize: 9, fontFamily: "Poppins", fontWeight: 700 }}
              />
            )}
          </Bar>
          <Bar
            dataKey="comprehension"
            name="Reading Comprehension"
            fill={COMPREHENSION_COLOR}
            radius={[3, 3, 0, 0]}
            maxBarSize={36}
            unit={unit}
          >
            {!isMobile && (
              <LabelList
                dataKey="comprehension"
                position="insideTop"
                formatter={(v) => (v > 0 ? `${v}${unit}` : "")}
                style={{ fill: "#fff", fontSize: 9, fontFamily: "Poppins", fontWeight: 700 }}
              />
            )}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}