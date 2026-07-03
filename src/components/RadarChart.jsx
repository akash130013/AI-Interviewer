import { View, Text, StyleSheet } from "react-native";
import Svg, { Polygon, Line, Circle, Text as SvgText } from "react-native-svg";

const LABELS = ["Clarity", "Relevance", "Depth", "Structure", "Confidence"];
const SIZE = 180;
const CENTER = SIZE / 2;
const RADIUS = 70;
const LEVELS = 4;

function polarToXY(angle, r) {
  const rad = (angle - 90) * (Math.PI / 180);
  return { x: CENTER + r * Math.cos(rad), y: CENTER + r * Math.sin(rad) };
}

function getAxes() {
  return LABELS.map((_, i) => {
    const angle = (360 / LABELS.length) * i;
    return polarToXY(angle, RADIUS);
  });
}

export default function RadarChart({ scores }) {
  const axes = getAxes();

  // Build filled polygon points from scores (0-10 scale → 0-RADIUS)
  const dataPoints = scores.map((score, i) => {
    const angle = (360 / LABELS.length) * i;
    const r = (Math.min(score, 10) / 10) * RADIUS;
    return polarToXY(angle, r);
  });
  const dataPolygon = dataPoints.map((p) => `${p.x},${p.y}`).join(" ");

  // Build grid polygons
  const gridLevels = Array.from({ length: LEVELS }, (_, lvl) => {
    const r = (RADIUS / LEVELS) * (lvl + 1);
    return LABELS.map((_, i) => {
      const angle = (360 / LABELS.length) * i;
      const p = polarToXY(angle, r);
      return `${p.x},${p.y}`;
    }).join(" ");
  });

  return (
    <View style={styles.container}>
      <Svg width={SIZE} height={SIZE}>
        {/* Grid */}
        {gridLevels.map((pts, i) => (
          <Polygon key={i} points={pts} fill="none" stroke="#e5e7eb" strokeWidth={1} />
        ))}

        {/* Axis lines */}
        {axes.map((pt, i) => (
          <Line key={i} x1={CENTER} y1={CENTER} x2={pt.x} y2={pt.y} stroke="#e5e7eb" strokeWidth={1} />
        ))}

        {/* Data area */}
        <Polygon
          points={dataPolygon}
          fill="rgba(17,17,17,0.12)"
          stroke="#111"
          strokeWidth={2}
        />

        {/* Data dots */}
        {dataPoints.map((pt, i) => (
          <Circle key={i} cx={pt.x} cy={pt.y} r={4} fill="#111" />
        ))}

        {/* Labels */}
        {axes.map((pt, i) => {
          const angle = (360 / LABELS.length) * i;
          const labelPt = polarToXY(angle, RADIUS + 18);
          return (
            <SvgText
              key={i}
              x={labelPt.x}
              y={labelPt.y}
              textAnchor="middle"
              alignmentBaseline="middle"
              fontSize={9}
              fontWeight="500"
              fill="#555"
            >
              {LABELS[i]}
            </SvgText>
          );
        })}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center", marginVertical: 8 },
});
