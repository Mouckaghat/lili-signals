import React, { useEffect, useRef, useState } from 'react';
import { Animated, PanResponder, StyleSheet, Text, View } from 'react-native';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ScrubberStage {
  key: string;
  label: string;
}

interface Props {
  stages: ScrubberStage[];
  activeIndex: number;
  onIndexChange: (index: number) => void;
  /** Stages from this index onward are shown as "projected / future" */
  futureStartIndex?: number;
  color?: string;
  style?: object;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const THUMB_R = 11;   // thumb radius → 22px diameter
const DOT_R   = 4;    // dot radius   →  8px diameter
const TRACK_Y = 22;   // vertical centre of track within track-area
const TRACK_AREA_H = TRACK_Y * 2; // 44px
const LABEL_H = 30;
const TOTAL_H = TRACK_AREA_H + LABEL_H + 8; // 8 gap

// ─── Component ────────────────────────────────────────────────────────────────

export default function FutureScrubber({
  stages,
  activeIndex,
  onIndexChange,
  futureStartIndex = stages.length,
  color = '#005F8E',
  style,
}: Props) {
  const [trackWidth, setTrackWidth] = useState(0);
  const trackWidthRef = useRef(0);
  const thumbAnim    = useRef(new Animated.Value(0)).current;
  const dragStartX   = useRef(0);

  // Refs so PanResponder closure is always current
  const activeIndexRef  = useRef(activeIndex);
  const onChangeRef     = useRef(onIndexChange);
  const stagesRef       = useRef(stages);
  useEffect(() => { activeIndexRef.current = activeIndex;   }, [activeIndex]);
  useEffect(() => { onChangeRef.current    = onIndexChange; }, [onIndexChange]);
  useEffect(() => { stagesRef.current      = stages;        }, [stages]);

  const getX = (idx: number, w: number): number => {
    const n = stagesRef.current.length;
    if (w <= 0 || n <= 1) return 0;
    return (idx / (n - 1)) * w;
  };

  // Sync thumb animation whenever activeIndex or trackWidth changes
  useEffect(() => {
    if (trackWidth <= 0) return;
    Animated.spring(thumbAnim, {
      toValue: getX(activeIndex, trackWidth),
      useNativeDriver: false,
      tension: 280,
      friction: 22,
    }).start();
  }, [activeIndex, trackWidth, stages.length]);

  // PanResponder created once; all live values accessed via refs
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder:  () => true,

      onPanResponderGrant: () => {
        thumbAnim.stopAnimation((val) => { dragStartX.current = val; });
      },

      onPanResponderMove: (_, gs) => {
        const w = trackWidthRef.current;
        if (w <= 0) return;
        const n   = stagesRef.current.length;
        const newX = Math.max(0, Math.min(w, dragStartX.current + gs.dx));
        thumbAnim.setValue(newX);
        const segW   = w / Math.max(1, n - 1);
        const newIdx = Math.max(0, Math.min(n - 1, Math.round(newX / segW)));
        if (newIdx !== activeIndexRef.current) {
          onChangeRef.current(newIdx);
        }
      },

      onPanResponderRelease: (evt, gs) => {
        const w = trackWidthRef.current;
        if (w <= 0) return;
        const n = stagesRef.current.length;
        const segW = w / Math.max(1, n - 1);
        let finalIdx: number;

        if (Math.abs(gs.dx) < 8) {
          // Treat as a tap — snap to nearest dot from tap location
          const tapX = evt.nativeEvent.locationX;
          finalIdx = Math.max(0, Math.min(n - 1, Math.round(tapX / segW)));
        } else {
          const newX = Math.max(0, Math.min(w, dragStartX.current + gs.dx));
          finalIdx = Math.max(0, Math.min(n - 1, Math.round(newX / segW)));
        }

        onChangeRef.current(finalIdx);
        Animated.spring(thumbAnim, {
          toValue: getX(finalIdx, w),
          useNativeDriver: false,
          tension: 300,
          friction: 20,
        }).start();
      },
    })
  ).current;

  const n = stages.length;

  return (
    <View style={[sc.wrapper, style]}>
      {/* Track area (relative container for absolute children) */}
      <View
        style={[sc.trackArea, { opacity: trackWidth > 0 ? 1 : 0 }]}
        onLayout={(e) => {
          const w = e.nativeEvent.layout.width;
          trackWidthRef.current = w;
          setTrackWidth(w);
        }}
      >
        {/* ── Background track ── */}
        <View style={[sc.trackBg, { top: TRACK_Y - 1 }]} />

        {/* ── Color fill up to active position ── */}
        <Animated.View
          style={[sc.trackFill, { top: TRACK_Y - 1, backgroundColor: color, width: thumbAnim }]}
        />

        {/* ── Dots at each stage ── */}
        {stages.map((stage, i) => {
          if (trackWidth <= 0) return null;
          const x        = getX(i, trackWidth);
          const isFuture = i >= futureStartIndex;
          return (
            <View
              key={stage.key}
              pointerEvents="none"
              style={[
                sc.dot,
                {
                  left:            x - DOT_R,
                  top:             TRACK_Y - DOT_R,
                  backgroundColor: isFuture ? 'transparent' : color,
                  borderWidth:     isFuture ? 1.5 : 0,
                  borderColor:     '#C7C7CC',
                },
              ]}
            />
          );
        })}

        {/* ── Animated thumb ── */}
        {trackWidth > 0 && (
          <Animated.View
            pointerEvents="none"
            style={[
              sc.thumb,
              {
                top:         TRACK_Y - THUMB_R,
                backgroundColor: color,
                shadowColor:     color,
                transform: [{ translateX: Animated.subtract(thumbAnim, THUMB_R) }],
              },
            ]}
          />
        )}

        {/* ── Touch overlay — captures all drag / tap events ── */}
        <View style={sc.overlay} {...panResponder.panHandlers} />
      </View>

      {/* Labels row (positioned absolutely so they align with dots) */}
      {trackWidth > 0 && (
        <View style={sc.labelsArea}>
          {stages.map((stage, i) => {
            const x        = getX(i, trackWidth);
            const isActive = i === activeIndex;
            const isFuture = i >= futureStartIndex;
            return (
              <View
                key={stage.key}
                pointerEvents="none"
                style={[sc.labelBox, { left: x - 20 }]}
              >
                <Text
                  style={[
                    sc.labelText,
                    {
                      color:      isActive ? color : isFuture ? '#C7C7CC' : '#8E8E93',
                      fontWeight: isActive ? '700' : '500',
                    },
                  ]}
                >
                  {stage.label}
                </Text>
              </View>
            );
          })}
        </View>
      )}

      {/* "PROJECTED" separator hint */}
      {futureStartIndex < n && (
        <View style={sc.projectedHint}>
          <View style={[sc.projectedLine, { backgroundColor: '#E5E5EA' }]} />
          <Text style={sc.projectedLabel}>PROJECTED</Text>
          <View style={[sc.projectedLine, { backgroundColor: '#E5E5EA' }]} />
        </View>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const sc = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 4,
  },
  trackArea: {
    height: TRACK_AREA_H,
    position: 'relative',
  },
  trackBg: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#E8E8ED',
    borderRadius: 1,
  },
  trackFill: {
    position: 'absolute',
    left: 0,
    height: 2,
    borderRadius: 1,
  },
  dot: {
    position: 'absolute',
    width: DOT_R * 2,
    height: DOT_R * 2,
    borderRadius: DOT_R,
  },
  thumb: {
    position: 'absolute',
    width: THUMB_R * 2,
    height: THUMB_R * 2,
    borderRadius: THUMB_R,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.38,
    shadowRadius: 6,
    elevation: 6,
    zIndex: 10,
  },
  overlay: {
    position: 'absolute',
    left: -20,
    right: -20,
    top: -18,
    bottom: -18,
    zIndex: 20,
  },
  labelsArea: {
    height: LABEL_H,
    position: 'relative',
    marginTop: 4,
  },
  labelBox: {
    position: 'absolute',
    width: 40,
    alignItems: 'center',
  },
  labelText: {
    fontSize: 10,
    textAlign: 'center',
  },
  projectedHint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 6,
  },
  projectedLine: {
    flex: 1,
    height: 1,
  },
  projectedLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: '#AEAEB2',
    letterSpacing: 0.6,
  },
});
