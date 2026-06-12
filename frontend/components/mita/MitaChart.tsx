"use client";

import React, { useState, useEffect } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
} from "recharts";
import {
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

// --- TypeScript Interfaces ---

export interface ChartDataPoint {
  name?: string;
  label?: string;
  [key: string]: unknown;
}

export interface KPIItem {
  title: string;
  value: string | number;
  change?: string | number;
  changeType?: "up" | "down" | "neutral";
  description?: string;
  status?: "success" | "warning" | "danger" | "info";
}

export interface ChartSpec {
  type: "chart" | "kpis";
  chartType?: "bar" | "line" | "pie";
  title?: string;
  description?: string;
  xAxis?: string;
  yAxis?: string;
  data: ChartDataPoint[] | KPIItem[];
}

interface LumiiChartProps {
  spec: ChartSpec;
}

// --- Harmonious Design Tokens & Colors ---

const COLORS = [
  "#10b981", // Emerald
  "#3b82f6", // Blue
  "#f97316", // Orange
  "#eab308", // Yellow
  "#8b5cf6", // Purple
  "#ec4899", // Pink
  "#14b8a6", // Teal
];

const styles = {
  container: {
    background: "rgba(15, 23, 42, 0.4)",
    backdropFilter: "blur(12px)",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    borderRadius: "20px",
    padding: "20px",
    marginTop: "16px",
    marginBottom: "16px",
    boxShadow: "0 10px 30px -10px rgba(0, 0, 0, 0.5)",
    fontFamily: "inherit",
    width: "100%",
  },
  title: {
    fontSize: "14px",
    fontWeight: 700,
    color: "#ffffff",
    letterSpacing: "-0.01em",
    margin: "0 0 4px 0",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  description: {
    fontSize: "12px",
    color: "#94a3b8",
    margin: "0 0 16px 0",
  },
  tooltip: {
    background: "rgba(15, 23, 42, 0.95)",
    border: "1px solid rgba(255, 255, 255, 0.15)",
    borderRadius: "10px",
    padding: "8px 12px",
    backdropFilter: "blur(8px)",
    boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
  },
  tooltipTitle: {
    fontSize: "11px",
    fontWeight: 600,
    color: "#94a3b8",
    margin: "0 0 4px 0",
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
  },
  tooltipVal: {
    fontSize: "13px",
    fontWeight: 700,
    color: "#10b981",
    margin: 0,
  },
  kpiGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "12px",
    width: "100%",
  },
  kpiCard: {
    background: "rgba(255, 255, 255, 0.02)",
    border: "1px solid rgba(255, 255, 255, 0.05)",
    borderRadius: "14px",
    padding: "16px",
    display: "flex",
    flexDirection: "column" as const,
    gap: "6px",
    transition: "all 0.2s ease-in-out",
  },
  kpiHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "8px",
    color: "#94a3b8",
    fontSize: "11px",
    fontWeight: 600,
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
  },
  kpiValue: {
    fontSize: "22px",
    fontWeight: 800,
    color: "#ffffff",
    letterSpacing: "-0.02em",
    lineHeight: 1,
    margin: "4px 0",
  },
  kpiFooter: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    fontSize: "11px",
  },
};

// --- Custom Interactive Components ---

type TooltipPayloadItem = { name?: string; value?: number | string; color?: string };

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string | number;
}) => {
  if (active && payload && payload.length) {
    return (
      <div style={styles.tooltip}>
        <p style={styles.tooltipTitle}>{label}</p>
        {payload.map((pld, index) => (
          <p key={index} style={{ ...styles.tooltipVal, color: pld.color || "#10b981" }}>
            {pld.name}: {typeof pld.value === "number" ? pld.value.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 2 }) : pld.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function LumiiChart({ spec }: LumiiChartProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Marca a montagem para o recharts só medir o contêiner no cliente;
    // padrão intencional de hidratação, não um efeito de sincronização.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        style={{
          height: "220px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(255, 255, 255, 0.01)",
          border: "1px solid rgba(255, 255, 255, 0.04)",
          borderRadius: "20px",
          marginTop: "16px",
          marginBottom: "16px",
        }}
      >
        <div style={{ color: "#475569", fontSize: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
          <span
            style={{
              width: "12px",
              height: "12px",
              border: "2px solid #10b981",
              borderTopColor: "transparent",
              borderRadius: "50%",
              display: "inline-block",
              animation: "spin 1s linear infinite",
            }}
          />
          Carregando visualização...
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    );
  }

  // --- KPI Grid Renderer ---
  if (spec.type === "kpis") {
    const kpiData = (spec.data || []) as KPIItem[];
    return (
      <div style={styles.container}>
        {spec.title && (
          <h4 style={styles.title}>
            <Activity size={16} className="text-emerald-400" />
            {spec.title}
          </h4>
        )}
        {spec.description && <p style={styles.description}>{spec.description}</p>}
        <div style={styles.kpiGrid}>
          {kpiData.map((kpi, idx) => {
            const getStatusColor = (status?: string) => {
              switch (status) {
                case "success": return "#10b981";
                case "warning": return "#f59e0b";
                case "danger": return "#ef4444";
                case "info": return "#3b82f6";
                default: return "#94a3b8";
              }
            };
            const statusColor = getStatusColor(kpi.status);

            return (
              <div
                key={idx}
                style={styles.kpiCard}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.02)";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.05)";
                }}
              >
                <div style={styles.kpiHeader}>
                  <span>{kpi.title}</span>
                  {kpi.status === "success" && <CheckCircle2 size={12} style={{ color: statusColor }} />}
                  {kpi.status === "warning" && <AlertTriangle size={12} style={{ color: statusColor }} />}
                  {kpi.status === "danger" && <AlertTriangle size={12} style={{ color: statusColor }} />}
                </div>
                <div style={styles.kpiValue}>{kpi.value}</div>
                {kpi.change !== undefined && (
                  <div
                    style={{
                      ...styles.kpiFooter,
                      color: kpi.changeType === "up" ? "#10b981" : kpi.changeType === "down" ? "#ef4444" : "#94a3b8",
                    }}
                  >
                    {kpi.changeType === "up" ? (
                      <ArrowUpRight size={12} />
                    ) : kpi.changeType === "down" ? (
                      <ArrowDownRight size={12} />
                    ) : null}
                    <span>{kpi.change}</span>
                    {kpi.description && <span style={{ color: "#475569", marginLeft: "2px" }}>• {kpi.description}</span>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // --- Charts Renderer ---
  const chartType = spec.chartType || "bar";
  const data = (spec.data || []) as ChartDataPoint[];
  const xAxisKey = spec.xAxis || "name";
  const yAxisKey = spec.yAxis || "value";

  // Auto-detect keys if not explicitly defined
  const keys = data.length > 0 ? Object.keys(data[0]).filter((k) => k !== xAxisKey && typeof data[0][k] === "number") : [];
  const primaryKey = yAxisKey && keys.includes(yAxisKey) ? yAxisKey : keys[0] || "value";

  return (
    <div style={styles.container}>
      {spec.title && (
        <h4 style={styles.title}>
          <TrendingUp size={16} className="text-emerald-400" />
          {spec.title}
        </h4>
      )}
      {spec.description && <p style={styles.description}>{spec.description}</p>}

      <div style={{ width: "100%", height: 200, minWidth: 0 }}>
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={200}>
          {chartType === "bar" ? (
            <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis
                dataKey={xAxisKey}
                stroke="#64748b"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                dy={6}
              />
              <YAxis
                stroke="#64748b"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                dx={-4}
              />
              <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.02)" }} />
              {keys.length > 1 ? (
                <>
                  <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: 10, color: "#94a3b8" }} />
                  {keys.map((key, i) => (
                    <Bar
                      key={key}
                      dataKey={key}
                      name={key}
                      fill={COLORS[i % COLORS.length]}
                      radius={[4, 4, 0, 0]}
                    />
                  ))}
                </>
              ) : (
                <Bar
                  dataKey={primaryKey}
                  name={primaryKey.toUpperCase()}
                  fill="url(#emeraldGradient)"
                  radius={[6, 6, 0, 0]}
                />
              )}
              <defs>
                <linearGradient id="emeraldGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.8} />
                  <stop offset="100%" stopColor="#047857" stopOpacity={0.1} />
                </linearGradient>
              </defs>
            </BarChart>
          ) : chartType === "line" ? (
            <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis
                dataKey={xAxisKey}
                stroke="#64748b"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                dy={6}
              />
              <YAxis
                stroke="#64748b"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                dx={-4}
              />
              <RechartsTooltip content={<CustomTooltip />} />
              {keys.length > 1 ? (
                <>
                  <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: 10, color: "#94a3b8" }} />
                  {keys.map((key, i) => (
                    <Line
                      key={key}
                      type="monotone"
                      dataKey={key}
                      name={key}
                      stroke={COLORS[i % COLORS.length]}
                      strokeWidth={2}
                      dot={{ r: 3, strokeWidth: 1, fill: "#0f172a" }}
                      activeDot={{ r: 5 }}
                    />
                  ))}
                </>
              ) : (
                <Line
                  type="monotone"
                  dataKey={primaryKey}
                  name={primaryKey.toUpperCase()}
                  stroke="#10b981"
                  strokeWidth={3}
                  dot={{ r: 4, strokeWidth: 2, fill: "#0f172a", stroke: "#10b981" }}
                  activeDot={{ r: 6 }}
                />
              )}
            </LineChart>
          ) : (
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={4}
                dataKey={primaryKey}
                nameKey={xAxisKey}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} style={{ outline: "none" }} />
                ))}
              </Pie>
              <RechartsTooltip content={<CustomTooltip />} />
              <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: 10, color: "#94a3b8", paddingTop: "10px" }} />
            </PieChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
