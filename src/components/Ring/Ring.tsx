import styles from './Ring.module.css';

interface Props {
  label: string;
  /** Worked time, e.g. "6:12". */
  timeText: string;
  /** Target label, e.g. "9 sa". */
  targetText: string;
  percent: number;
  chipText: string;
  chipTone: 'amber' | 'green';
  showPercent: boolean;
  onToggle: () => void;
  overflowText?: string;
  segments?: Array<{ value: number; color: string }>;
  dayBars?: Array<{ label: string; minutes: number; color: string }>;
  showBreakdown?: boolean;
}

const R = 40;
const CIRC = 2 * Math.PI * R; // 251.33

function bandColor(p: number): string {
  if (p >= 100) return 'var(--accent)';
  if (p >= 70) return 'var(--blue)';
  return 'var(--amber)';
}

export function Ring({ label, timeText, targetText, percent, chipText, chipTone, showPercent, onToggle, overflowText, segments, dayBars, showBreakdown = false }: Props) {
  const p = Math.max(0, Math.min(100, percent));
  const offset = CIRC * (1 - p / 100);
  const center = showPercent ? `%${Math.round(percent)}` : timeText;
  const sub = showPercent ? timeText : `/ ${targetText}`;

  return (
    <button
      type="button"
      className={styles.gauge}
      onClick={onToggle}
      aria-pressed={showPercent || showBreakdown}
      aria-label={`${label}: ${timeText} / ${targetText} — ${chipText}`}
      title={showPercent ? timeText : `%${Math.round(percent)}`}
    >
      <span className={styles.eyebrow} aria-hidden="true">{label}</span>
      <span className={styles.ringWrap}>
        <span
          key={`circle-${showPercent}-${showBreakdown}`}
          className={`${styles.ringView} ${styles.circleAnimated} ${showBreakdown ? styles.viewHidden : ''}`}
        >
        <svg className={styles.ring} viewBox="0 0 120 120" aria-hidden="true">
          <circle className={styles.track} cx="60" cy="60" r="40" />
          {segments?.length ? (() => {
            let cumulative = 0;
            return segments.map((segment, index) => {
              const length = CIRC * Math.max(0, Math.min(segment.value, 100 - cumulative)) / 100;
              const dashOffset = -CIRC * cumulative / 100;
              cumulative += segment.value;
              return (
                <circle
                  key={index}
                  className={styles.fill}
                  cx="60"
                  cy="60"
                  r="40"
                  style={{
                    stroke: segment.color,
                    strokeDasharray: `${length} ${CIRC - length}`,
                    strokeDashoffset: dashOffset,
                  }}
                />
              );
            });
          })() : (
            <circle
              className={`${styles.fill} ${styles.singleFill}`}
              cx="60"
              cy="60"
              r="40"
              style={{ stroke: bandColor(percent), strokeDashoffset: offset }}
            />
          )}
        </svg>
        <span className={styles.center}>
          <span className={styles.val}>{center}</span>
          <span className={styles.sub}>{sub}</span>
        </span>
        {overflowText && <span className={styles.overflow}>{overflowText}</span>}
        </span>
        {dayBars && (
          <span className={`${styles.breakdown} ${showBreakdown ? styles.breakdownVisible : ''}`} aria-hidden={!showBreakdown}>
            {dayBars.map((day) => (
              <span className={styles.dayRow} key={day.label}>
                <span className={styles.dayLabel}>{day.label}</span>
                <span className={styles.dayTrack}>
                  <span
                    className={styles.dayFill}
                    style={{
                      backgroundColor: day.color,
                      transform: `scaleX(${Math.min(day.minutes / (11 * 60), 1)})`,
                    }}
                  />
                </span>
                <span className={styles.dayTime}>{Math.floor(day.minutes / 60)}:{String(day.minutes % 60).padStart(2, '0')}</span>
              </span>
            ))}
          </span>
        )}
      </span>
      <span className={`${styles.chip} ${chipTone === 'green' ? styles.green : styles.amber}`}>{chipText}</span>
    </button>
  );
}
