import { useEffect, useState } from 'react';
import type { ManualPunches } from '../../types';
import { t } from '../../lib/i18n';
import { validPunchTimes } from '../../lib/time-utils';
import styles from './DailyPunchEditor.module.css';

interface Props {
  portal: ManualPunches;
  manual: ManualPunches | undefined;
  disabled: boolean;
  onSave: (punches: ManualPunches) => Promise<void>;
}

export function DailyPunchEditor({ portal, manual, disabled, onSave }: Props) {
  const savedEntry = manual?.entry ?? portal.entry ?? '';
  const savedExit = manual?.exit ?? portal.exit ?? '';
  const [entry, setEntry] = useState(savedEntry);
  const [exit, setExit] = useState(savedExit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<'invalidPunchTimes' | 'punchSaveFailed'>();
  useEffect(() => {
    setEntry(savedEntry);
    setExit(savedExit);
    setError(undefined);
  }, [savedEntry, savedExit]);

  async function save(punches: ManualPunches) {
    setSaving(true);
    setError(undefined);
    try {
      await onSave(punches);
      setEntry(punches.entry ?? portal.entry ?? '');
      setExit(punches.exit ?? portal.exit ?? '');
    } catch {
      setError('punchSaveFailed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className={styles.editor} onSubmit={event => {
      event.preventDefault();
      const resolvedEntry = entry || portal.entry;
      const resolvedExit = exit || portal.exit;
      if (!validPunchTimes(resolvedEntry, resolvedExit)) {
        setError('invalidPunchTimes');
        return;
      }
      void save({
        entry: entry && entry !== portal.entry ? entry : undefined,
        exit: exit && exit !== portal.exit ? exit : undefined,
      });
    }}>
      <div className={styles.header}><strong>{t('dailyPunches')}</strong></div>
      <div className={styles.punchControls}>
        <label>{t('punchEntry')}<input type="time" value={entry} disabled={disabled || saving}
          onChange={event => setEntry(event.target.value)} /></label>
        <label>{t('punchExit')}<input type="time" value={exit} disabled={disabled || saving}
          onChange={event => setExit(event.target.value)} /></label>
        <button type="submit" disabled={disabled || saving || (entry === savedEntry && exit === savedExit)}>{t('save')}</button>
      </div>
      {manual && <button className={styles.resetPunches} type="button" disabled={disabled || saving}
        onClick={() => void save({})}>{t('resetPunchTimes')}</button>}
      <small>{t('punchTimesHint')}</small>
      {savedExit && !savedEntry && <small role="status">{t('missingPunchEntry')}</small>}
      {error && <small role="alert">{t(error)}</small>}
    </form>
  );
}
