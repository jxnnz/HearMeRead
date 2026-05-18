// ============================================================
// HearMeRead — ReadingProfileChart Component
// Left: grouped bar chart — % of students per reading profile
//       grouped by Female / Male / Total
// Right: pie chart — % of learners assessed by sex
//
// Props:
//   data — { female: {...profiles}, male: {...profiles}, total: {...profiles} }
//   genderData — { female: number, male: number }
// ============================================================
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, LabelList,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";

// Reading profile colors
const PROFILE_COLORS = {
  "Low Emerging Reader":    "#c0392b",
  "High Emerging Reader":   "#e67e22",
  "Developing Reader":      "#f1c40f",
  "Transitioning Reader":   "#2c3e6b",
  "Reading at Grade Level": "#27ae60",
};

const PROFILES = Object.keys(PROFILE_COLORS);

const GENDER_COLORS = ["#e07070", "#4a6fa5"];

// Custom tooltip
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
          {p.name}: {p.value}%
        </p>
      ))}
    </div>
  );
}

// ============================================================
export default function ReadingProfileChart({ data = {}, genderData = {} }) {
  // Build bar chart data
  const barData = [
    { group: "Female", ...data.female },
    { group: "Male",   ...data.male   },
    { group: "Total",  ...data.total  },
  ];

  // Build pie data
  const pieData = [
    { name: "Female", value: genderData.female ?? 0 },
    { name: "Male",   value: genderData.male   ?? 0 },
  ];

  return (
    <div className="db-chart-row">
      {/* Left: Reading Profile Bar Chart */}
      <div className="db-chart-card db-chart-card--wide">
        <div className="db-chart-header">
          <h3 className="db-chart-title">
            Percentage of Students Assessed by Reading Profile
          </h3>
        </div>

        <ResponsiveContainer width="100%" height={240}>
          <BarChart
            data={barData}
            margin={{ top: 16, right: 16, left: -16, bottom: 0 }}
            barCategoryGap="20%"
            barGap={2}
          >
            <XAxis
              dataKey="group"
              tick={{ fontSize: 12, fontFamily: "Poppins" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fontFamily: "Poppins" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v}%`}
              domain={[0, 100]}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: 11, fontFamily: "Poppins", paddingTop: 8 }}
              iconType="circle"
              iconSize={8}
            />
            {PROFILES.map((profile) => (
              <Bar
                key={profile}
                dataKey={profile}
                name={profile}
                fill={PROFILE_COLORS[profile]}
                radius={[3, 3, 0, 0]}
                maxBarSize={36}
              >
                <LabelList
                  dataKey={profile}
                  position="insideTop"
                  formatter={(v) => (v > 0 ? `${v}%` : "")}
                  style={{ fill: "#fff", fontSize: 9, fontFamily: "Poppins", fontWeight: 700 }}
                />
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Right: Gender Pie Chart */}
      <div className="db-chart-card db-chart-card--narrow">
        <div className="db-chart-header">
          <h3 className="db-chart-title">Percentage of Learners Assessed</h3>
        </div>

        <div className="db-pie-legend">
          {pieData.map((d, i) => (
            <span key={d.name} className="db-pie-legend__item">
              <span
                className="db-pie-legend__dot"
                style={{ background: GENDER_COLORS[i] }}
              />
              {d.name}
            </span>
          ))}
        </div>

        <ResponsiveContainer width="100%" height={180}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={0}
              outerRadius={75}
              dataKey="value"
              label={({ cx, cy, midAngle, innerRadius, outerRadius, value }) => {
                if (!value) return null;
                const RADIAN = Math.PI / 180;
                const r = innerRadius + (outerRadius - innerRadius) * 0.5;
                const x = cx + r * Math.cos(-midAngle * RADIAN);
                const y = cy + r * Math.sin(-midAngle * RADIAN);
                return (
                  <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central"
                        fontSize={11} fontFamily="Poppins" fontWeight={700}>
                    {value}%
                  </text>
                );
              }}
              labelLine={false}
            >
              {pieData.map((_, i) => (
                <Cell key={i} fill={GENDER_COLORS[i]} />
              ))}
            </Pie>
            <Tooltip formatter={(v) => `${v}%`} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}