import { View, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { Palette } from '@/constants/theme';

type Slice = {
  value: number;
  color: string;
};

const STROKE = 26;
const RADIUS = 62;
const SIZE = (RADIUS + STROKE / 2) * 2;
const CENTER = SIZE / 2;

/** Polar -> cartesian point on the circle, clockwise from 12 o'clock. */
function polar(cx: number, cy: number, r: number, angleDeg: number): { x: number; y: number } {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx: number, cy: number, r: number, start: number, end: number): string {
  const largeArc = end - start > 180 ? 1 : 0;
  const startPt = polar(cx, cy, r, start);
  const endPt = polar(cx, cy, r, end);
  return [
    `M ${startPt.x} ${startPt.y}`,
    `A ${r} ${r} 0 ${largeArc} 1 ${endPt.x} ${endPt.y}`,
  ].join(' ');
}

/** Donut chart with a center total label. Renders nothing when there are no slices. */
export function DonutChart({
  slices,
  centerLabel,
  centerValue,
}: {
  slices: Slice[];
  centerLabel: string;
  centerValue: string;
}) {
  const total = slices.reduce((sum, s) => sum + s.value, 0);
  if (total <= 0) return null;

  const GAP = 2; // degrees between segments
  const usable = 360 - GAP * slices.length;
  let angle = 0;
  const arcs: { d: string; color: string }[] = [];
  for (const slice of slices) {
    const sweep = (slice.value / total) * usable;
    arcs.push({
      d: arcPath(CENTER, CENTER, RADIUS, angle, angle + sweep),
      color: slice.color,
    });
    angle += sweep + GAP;
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.chartWrap}>
        <Svg width={SIZE} height={SIZE}>
          {arcs.map((a, i) => (
            <Path key={i} d={a.d} stroke={a.color} strokeWidth={STROKE} fill="none" />
          ))}
        </Svg>
        <View style={styles.center}>
          <ThemedText style={styles.centerValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
            {centerValue}
          </ThemedText>
          <ThemedText style={styles.centerLabel}>{centerLabel}</ThemedText>
        </View>
      </View>
    </View>
  );
}

/** Horizontal legend row used under the donut. */
export function DonutLegend({ slices }: { slices: Slice[] }) {
  const total = slices.reduce((sum, s) => sum + s.value, 0);
  if (total <= 0) return null;
  return (
    <View style={styles.legend}>
      {slices.map((s) => (
        <View key={s.color + s.value} style={styles.legendRow}>
          <View style={[styles.legendDot, { backgroundColor: s.color }]} />
          <ThemedText style={styles.legendLabel}>{Math.round((s.value / total) * 100)}%</ThemedText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: 16,
  },
  chartWrap: {
    width: SIZE,
    height: SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    maxWidth: SIZE * 0.55,
  },
  centerValue: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 26,
    lineHeight: 30,
    color: Palette.ink,
  },
  centerLabel: {
    fontSize: 13,
    lineHeight: 18,
    color: Palette.inkMuted,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Palette.surface,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Palette.outline,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    fontSize: 13,
    lineHeight: 18,
    color: Palette.ink,
  },
});
