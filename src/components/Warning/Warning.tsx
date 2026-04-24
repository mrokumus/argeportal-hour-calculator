import styles from './Warning.module.css';

interface Props {
  text: string;
}

export function Warning({ text }: Props) {
  return <div className={styles.warning}>{text}</div>;
}
