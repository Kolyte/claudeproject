import { type FormEvent, useId, useState } from 'react';
import { ApiRequestError } from './api';
import { compensationLabels, participationLabels, workModeLabels } from './labels';
import type { Compensation, NeedFields, ParticipationType, WorkMode } from './types';

interface NeedFormProps {
  initial?: NeedFields;
  submitLabel: string;
  onSubmit: (fields: NeedFields) => Promise<void>;
  onCancel: () => void;
}

const blank: NeedFields = {
  title: '',
  description: '',
  requiredSkills: [],
  desirableSkills: [],
  participationType: 'contributor',
  hoursPerWeek: 5,
  workMode: 'hybrid',
  location: '',
  compensation: 'unspecified',
};

const splitSkills = (value: string) =>
  value
    .split(',')
    .map((skill) => skill.trim())
    .filter(Boolean);

function options<T extends string>(labels: Record<T, string>) {
  return (Object.entries(labels) as [T, string][]).map(([value, label]) => (
    <option key={value} value={value}>
      {label}
    </option>
  ));
}

export default function NeedForm({ initial = blank, submitLabel, onSubmit, onCancel }: NeedFormProps) {
  const [fields, setFields] = useState(initial);
  const [required, setRequired] = useState(initial.requiredSkills.join(', '));
  const [desirable, setDesirable] = useState(initial.desirableSkills.join(', '));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<ApiRequestError | null>(null);
  const idPrefix = useId();

  const update = <K extends keyof NeedFields>(key: K, value: NeedFields[K]) =>
    setFields((previous) => ({ ...previous, [key]: value }));
  const fieldError = (key: string) =>
    error?.fields[key] && <span className="op-field-error">{error.fields[key]}</span>;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSubmit({
        ...fields,
        requiredSkills: splitSkills(required),
        desirableSkills: splitSkills(desirable),
      });
    } catch (caught) {
      setError(caught as ApiRequestError);
      setSaving(false);
    }
  }

  return (
    <form className="op-form" onSubmit={submit}>
      <label className="field" htmlFor={`${idPrefix}-title`}>
        Role title
        <input
          id={`${idPrefix}-title`}
          required
          maxLength={120}
          value={fields.title}
          onChange={(event) => update('title', event.target.value)}
        />
        {fieldError('title')}
      </label>

      <label className="field" htmlFor={`${idPrefix}-description`}>
        What will this person do?
        <textarea
          id={`${idPrefix}-description`}
          required
          maxLength={5000}
          value={fields.description}
          onChange={(event) => update('description', event.target.value)}
        />
        {fieldError('description')}
      </label>

      <label className="field" htmlFor={`${idPrefix}-required`}>
        Required skills, separated by commas
        <input id={`${idPrefix}-required`} value={required} onChange={(event) => setRequired(event.target.value)} />
        {fieldError('requiredSkills')}
      </label>

      <label className="field" htmlFor={`${idPrefix}-desirable`}>
        Desirable skills, separated by commas
        <input id={`${idPrefix}-desirable`} value={desirable} onChange={(event) => setDesirable(event.target.value)} />
        {fieldError('desirableSkills')}
      </label>

      <div className="op-form-row">
        <label className="field" htmlFor={`${idPrefix}-type`}>
          Type
          <select
            id={`${idPrefix}-type`}
            value={fields.participationType}
            onChange={(event) => update('participationType', event.target.value as ParticipationType)}
          >
            {options(participationLabels)}
          </select>
        </label>
        <label className="field" htmlFor={`${idPrefix}-hours`}>
          Hours per week
          <input
            id={`${idPrefix}-hours`}
            type="number"
            required
            min={1}
            max={80}
            step={1}
            value={fields.hoursPerWeek}
            onChange={(event) => update('hoursPerWeek', event.target.valueAsNumber)}
          />
          {fieldError('hoursPerWeek')}
        </label>
      </div>

      <div className="op-form-row">
        <label className="field" htmlFor={`${idPrefix}-mode`}>
          Work mode
          <select
            id={`${idPrefix}-mode`}
            value={fields.workMode}
            onChange={(event) => update('workMode', event.target.value as WorkMode)}
          >
            {options(workModeLabels)}
          </select>
        </label>
        <label className="field" htmlFor={`${idPrefix}-location`}>
          Location
          <input
            id={`${idPrefix}-location`}
            required
            maxLength={120}
            value={fields.location}
            onChange={(event) => update('location', event.target.value)}
          />
          {fieldError('location')}
        </label>
      </div>

      <label className="field" htmlFor={`${idPrefix}-compensation`}>
        Compensation
        <select
          id={`${idPrefix}-compensation`}
          value={fields.compensation}
          onChange={(event) => update('compensation', event.target.value as Compensation)}
        >
          {options(compensationLabels)}
        </select>
      </label>

      {error && (
        <div className="op-error" role="alert">
          {error.message}
        </div>
      )}

      <div className="op-actions">
        <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
          {saving ? 'Saving…' : submitLabel}
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
      </div>
    </form>
  );
}
