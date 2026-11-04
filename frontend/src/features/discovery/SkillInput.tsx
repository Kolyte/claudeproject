import { useId, useState, type KeyboardEvent } from 'react';
import { canonicalSkill, parseSkillList, suggestSkills } from './skills.ts';
import './discovery.css';

interface Props {
  label: string;
  /** Text value. With `multiple`, a comma-separated list ("React, PostgreSQL"). */
  value: string;
  onChange: (value: string) => void;
  multiple?: boolean;
  placeholder?: string;
  /** Wrapper class, e.g. the shared `field` or discovery's `disc-field`. */
  className?: string;
  id?: string;
  maxLength?: number;
}

const MAX_SUGGESTIONS = 8;

const splitList = (text: string) => text.split(',');

/**
 * Type-ahead for skills (ARIA 1.2 combobox). Suggests known skills for the word being
 * typed ("post" -> PostgreSQL, "reactj" -> React) but still accepts any skill. On leaving
 * the field, known spellings are tidied to their canonical names.
 */
export default function SkillInput({ label, value, onChange, multiple, placeholder, className = '', id, maxLength }: Props) {
  const autoId = useId();
  const inputId = id ?? `skill-${autoId}`;
  const listId = `${inputId}-list`;
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const parts = multiple ? splitList(value) : [value];
  const current = parts[parts.length - 1] ?? '';
  const before = parts.slice(0, -1).map((s) => s.trim()).filter(Boolean);
  const suggestions = suggestSkills(current, MAX_SUGGESTIONS, before).filter(
    (s) => s.toLocaleLowerCase('en-GB') !== current.trim().toLocaleLowerCase('en-GB'),
  );
  const showList = open && current.trim() !== '' && suggestions.length > 0;

  const choose = (skill: string) => {
    onChange(multiple ? [...before, skill].join(', ') + ', ' : skill);
    setOpen(multiple ?? false);
    setActive(0);
  };

  const tidy = () => {
    const next = multiple ? parseSkillList(value).join(', ') : canonicalSkill(value);
    if (next !== value) onChange(next);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) setOpen(true);
      else setActive((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && showList) {
      e.preventDefault();
      choose(suggestions[Math.min(active, suggestions.length - 1)]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div className={`disc-sector ${className}`.trim()}>
      <label htmlFor={inputId}>{label}</label>
      <div className="disc-sector-box">
        <input
          id={inputId}
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={showList}
          aria-controls={listId}
          aria-activedescendant={showList ? `${listId}-${active}` : undefined}
          autoComplete="off"
          placeholder={placeholder}
          value={value}
          maxLength={maxLength}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
            setActive(0);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          onBlur={() => {
            setOpen(false);
            tidy();
          }}
        />
        {showList && (
          <ul id={listId} role="listbox" className="disc-sector-list" aria-label={`${label} suggestions`}>
            {suggestions.map((s, i) => (
              <li
                key={s}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                className={i === active ? 'disc-sector-option active' : 'disc-sector-option'}
                onMouseDown={(e) => {
                  e.preventDefault();
                  choose(s);
                }}
                onMouseEnter={() => setActive(i)}
              >
                {s}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
