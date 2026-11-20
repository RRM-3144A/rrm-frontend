'use client';

import controls from '@/components/controls.module.css';
import type {Resource} from '@/lib/types';

import styles from './ResourcePicker.module.css';

interface ResourcePickerProps {
  resources: Resource[];
  value: number;
  onChange: (resourceId: number) => void;
}

/** "Resursă" select for the admin pages that work on one resource at a time. */
export function ResourcePicker({resources, value, onChange}: ResourcePickerProps) {
  return (
    <label className={styles.picker}>
      <span className={controls.label}>Resursă</span>
      <select
        className={controls.select}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      >
        {resources.map((resource) => (
          <option key={resource.id} value={resource.id}>
            {resource.name}
          </option>
        ))}
      </select>
    </label>
  );
}
