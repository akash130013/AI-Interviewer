import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Polyline, Circle, Line, Text as SvgText } from "react-native-svg";

const W = 280;
const H = 100;
const PAD_LEFT = 28;
const PAD_RIGHT = 12;
const PAD_TOP = 10;
const PAD_BOTTOM = 20;

export default function LineGraph({ data }) {
  if (!data || data.length < 2) return null;

  const vals = data.map((d) => d.value);
  const min = Math.max(0, Math.min(...vals) - 10);
  const max = Math.min(100, Math.max(...vals) + 10);
  const range = max - min || 1;

  const innerW = W - PAD_LEFT - PAD_RIGHT;
  const innerH = H - PAD_TOP - PAD_BOTTOM;

  function toX(i) {
    return PAD_LEFT + (i / (data.length - 1)) * innerW;
  }
  function toY(val) {
    return PAD_TOP + innerH - ((val - min) / range) * innerH;
  }

  const points = data.map((d, i) => `${toX(i)},${toY(d.value)}`).join(" ");

  const gridLines = [0, 25, 50, 75, 100].filter((v) => v >= min - 5 && v <= max + 5);

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Readiness over time</Text>
      <Svg width={W} height={H}>
        {/* Grid lines */}
        {gridLines.map((v) => (
          <Line
            key={v}
            x1={PAD_LEFT} y1={toY(v)}
            x2={W - PAD_RIGHT} y2={toY(v)}
            stroke="#f0f0f0" strokeWidth={1}
          />
        ))}
        {gridLines.map((v) => (
          <SvgText key={`t${v}`} x={PAD_LEFT - 4} y={toY(v) + 4}
            textAnchor="end" fontSize={8} fill="#bbb">{v}</SvgText>
        ))}

        {/* Line */}
        <Polyline
          points={points}
          fill="none"
          stroke="#111"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Dots + date labels */}
        {data.map((d, i) => (
          <React.Fragment key={i}>
            <Circle cx={toX(i)} cy={toY(d.value)} r={4} fill="#111" />
            {(i === 0 || i === data.length - 1) && (
              <SvgText
                x={toX(i)}
                y={H - 4}
                textAnchor={i === 0 ? "start" : "end"}
                fontSize={8}
                fill="#aaa"
              >
                {d.label}
              </SvgText>
            )}
          </React.Fragment>
        ))}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: "#f9f9f9", borderRadius: 14, padding: 14, marginBottom: 16 },
  title: { fontSize: 12, fontWeight: "600", color: "#111", marginBottom: 8 },
});
