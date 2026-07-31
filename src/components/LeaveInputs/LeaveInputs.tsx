import { useEffect, useRef } from 'react';
import type { LeaveData } from '../../types';
import { formatOOO, parseOOO } from '../../lib/time-utils';
import { t } from '../../lib/i18n';
import styles from './LeaveInputs.module.css';

interface Props {
  data: LeaveData;
  disabled: boolean;
  onLeaveChange: (data: LeaveData) => void;
}

export function LeaveInputs({ data, disabled, onLeaveChange }: Props) {
  const leaveRef = useRef<HTMLInputElement>(null);
  const oooRef = useRef<HTMLInputElement>(null);

  // The inputs are uncontrolled (so partial OOO typing like "1:" isn't fought).
  // Sync them when the data changes externally — a new week, a loaded scenario,
  // or auto-detected leave — but never while the field is focused.
  useEffect(() => {
    if (leaveRef.current && document.activeElement !== leaveRef.current) {
      leaveRef.current.value = String(data.leave);
    }
    if (oooRef.current && document.activeElement !== oooRef.current) {
      oooRef.current.value = formatOOO(data.ooo);
    }
  }, [data.leave, data.ooo]);

  function getInputValues(): Omit<LeaveData, 'autoDetected'> {
    return {
      leave: Math.max(0, parseInt(leaveRef.current?.value ?? '0') || 0),
      ooo: parseOOO(oooRef.current?.value),
    };
  }

  function handleLeaveChange() {
    if (disabled) return;
    // Editing the leave count manually disables auto-detection for this week.
    onLeaveChange({ ...getInputValues(), autoDetected: false });
  }

  function handleOooChange() {
    if (disabled) return;
    onLeaveChange({ ...getInputValues(), autoDetected: data.autoDetected });
  }

  // On blur, re-assert the current data (normalises the field and recovers from
  // an external change that arrived while this field was focused, which the
  // focus-guarded sync effect skips).
  function syncLeave() {
    if (leaveRef.current) leaveRef.current.value = String(data.leave);
  }
  function syncOoo() {
    if (oooRef.current) oooRef.current.value = formatOOO(data.ooo);
  }

  return (
    <div className={styles.section}>
      <div className={styles.field}>
        <span className={styles.fieldLabel}>{t('leaveLabel')}</span>
        <input
          ref={leaveRef}
          id="pdks-leave"
          type="number"
          min={0}
          max={5}
          defaultValue={data.leave}
          disabled={disabled}
          className={styles.input}
          onChange={handleLeaveChange}
          onBlur={syncLeave}
        />
        <span className={styles.unit}>{t('leaveDays')}</span>
      </div>

      <div className={styles.field}>
        <span className={styles.oooLabel}>{t('oooLabel')}</span>
        <div
          className={styles.tooltip}
          dangerouslySetInnerHTML={{ __html: t('oooTooltip') }}
        />
        <input
          ref={oooRef}
          id="pdks-ooo"
          type="text"
          placeholder="0:00"
          defaultValue={formatOOO(data.ooo)}
          disabled={disabled}
          className={`${styles.input} ${styles.ooo}`}
          onChange={handleOooChange}
          onBlur={syncOoo}
        />
      </div>
    </div>
  );
}
