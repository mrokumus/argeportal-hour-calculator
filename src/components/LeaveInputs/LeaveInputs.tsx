import { useRef } from 'react';
import type { LeaveData } from '../../types';
import { getLeaveData, saveLeaveData } from '../../lib/storage';
import { formatOOO, parseOOO } from '../../lib/time-utils';
import { t } from '../../lib/i18n';
import styles from './LeaveInputs.module.css';

interface Props {
  weekKey: string;
  disabled: boolean;
  onLeaveChange: (data: LeaveData) => void;
}

export function LeaveInputs({ weekKey, disabled, onLeaveChange }: Props) {
  const data = getLeaveData(weekKey);
  const leaveRef = useRef<HTMLInputElement>(null);
  const oooRef = useRef<HTMLInputElement>(null);

  function getInputValues(): Omit<LeaveData, 'autoDetected'> {
    return {
      leave: Math.max(0, parseInt(leaveRef.current?.value ?? '0') || 0),
      ooo: parseOOO(oooRef.current?.value),
    };
  }

  function handleLeaveChange() {
    if (disabled) return;
    const values = getInputValues();
    const updated: LeaveData = { ...values, autoDetected: false };
    saveLeaveData(weekKey, updated);
    onLeaveChange(updated);
  }

  function handleOooChange() {
    if (disabled) return;
    const values = getInputValues();
    const current = getLeaveData(weekKey);
    const updated: LeaveData = { ...values, autoDetected: current.autoDetected };
    saveLeaveData(weekKey, updated);
    onLeaveChange(updated);
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
        />
      </div>
    </div>
  );
}
