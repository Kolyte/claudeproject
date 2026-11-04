import { useId, useState, type KeyboardEvent } from 'react';
import { canonicalSector, suggestSectors } from './sectors.ts';
import './discovery.css';

interface Props {
  label: string;
  /** Canonical sector, or '' for none. */
  value: string;
  /** Called with a canonical sector, or '' when the text is empty or not a listed sector. */
  onChange: (sector: string) => void;
  required?: boolean;
  placeholder?: string;
  /** Class for the wrapper, e.g. the shared `field` or discovery's `disc-field`. */
  className?: string;
  id?: string;
}

const MAX_SUGGESTIONS = 8;

/**
 * Type-ahead for the fixed sector list (an ARIA 1.2 combobox). Typing "fi" suggests
 * Finance, FinTech, …; only listed sectors are accepted, so the form cannot submit free text.
 */
export default function SectorInput({ label, value, onChange, required, placeholder = 'Start typing, e.g. FinTech', className = '', id }: Props) {
  const autoId = useId();
  const inputId = id ?? `sector-${autoId}`;
  const listId = `${inputId}-list`;
  const [text, setText] = useState(value);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [focused, setFocused] = useState(false);

  // Adopt outside changes (reset, URL navigation) without clobbering what is being typed.
  const [seen, setSeen] = useState(value);
  if (seen !== value) {
    setSeen(value);
    if (canonicalSector(text) !== (value || null)) setText(value);
  }

  const suggestions = suggestSectors(text, MAX_SUGGESTIONS);
  const invalid = text.trim() !== '' && !canonicalSector(text);
  // Only show the message once the person leaves the field; validity still blocks submit meanwhile.
  const showError = invalid && !focused;
  const showList = open && suggestions.length > 0;

  const choose = (sector: string) => {
    setText(sector);
    setOpen(false);
    if (sector !== value) onChange(sector);
  };

  const onType = (next: string) => {
    setText(next);
    setOpen(true);
    setActive(0);
    const sector = canonicalSector(next) ?? '';
    if (sector !== value) onChange(sector);
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
      e.preventDefault(); // pick the suggestion instead of submitting the form
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
          aria-invalid={showError || undefined}
          aria-describedby={showError ? `${inputId}-error` : undefined}
          autoComplete="off"
          required={required}
          placeholder={placeholder}
          value={text}
          maxLength={120}
          onChange={(e) => onType(e.target.value)}
          onFocus={() => {
            setFocused(true);
            setOpen(true);
          }}
          onClick={() => setOpen(true)}
          onKeyDown={onKeyDown}
          onBlur={() => {
            setFocused(false);
            setOpen(false);
            const sector = canonicalSector(text);
            if (sector && sector !== text) setText(sector);
          }}
          ref={(el) => el?.setCustomValidity(invalid ? 'Choose a sector from the list.' : '')}
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
                // mousedown keeps focus in the input so blur does not close the list first
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
      {showError && (
        <span id={`${inputId}-error`} className="disc-sector-error" role="alert">
          Choose a sector from the list.
        </span>
      )}
    </div>
  );
}
