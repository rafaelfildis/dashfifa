import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import type { NamedCount } from '../types';

interface Props {
  side: 'a' | 'b';
  variant: 'player' | 'team';
  /** Rótulo acessível; o visível fica com o `<label>` do bloco. */
  label: string;
  value: string;
  options: NamedCount[];
  /** Texto do gatilho quando nada está escolhido — e da linha que limpa a escolha. */
  emptyLabel: string;
  /** Só o seletor de time pode voltar a "qualquer". */
  clearable?: boolean;
  onChange: (value: string) => void;
}

/**
 * Seletor com busca. As listas de jogador chegam a centenas de nomes, então o
 * `<select>` nativo não dá conta: aqui há campo de busca, a contagem de partidas
 * de cada um e navegação por teclado (setas, Enter, Escape).
 */
export function Combo({
  side,
  variant,
  label,
  value,
  options,
  emptyLabel,
  clearable = false,
  onChange,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const listId = useId();

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const hits = q ? options.filter((o) => o.name.toLowerCase().includes(q)) : options;
    // A linha que limpa só faz sentido enquanto a lista está inteira.
    return clearable && !q ? [{ name: '', played: 0 }, ...hits] : hits;
  }, [clearable, options, query]);

  useEffect(() => {
    setCursor(0);
  }, [query, open]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  // Com centenas de nomes, a navegação por setas precisa arrastar a lista junto.
  useEffect(() => {
    if (!open) return;
    list.current?.children[cursor]?.scrollIntoView({ block: 'nearest' });
  }, [cursor, open]);

  function close() {
    setOpen(false);
    setQuery('');
    trigger.current?.focus();
  }

  function choose(name: string) {
    onChange(name);
    close();
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setCursor((c) => Math.min(c + 1, rows.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const row = rows[cursor];
      if (row) choose(row.name);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      close();
    }
  }

  const selected = options.find((o) => o.name === value);
  const meta =
    variant === 'player'
      ? selected
        ? `${selected.played} jogos`
        : 'escolher'
      : '';

  return (
    <div className={`combo combo--${variant} combo--${side}`} ref={root}>
      <button
        type="button"
        ref={trigger}
        className="combo__trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="combo__value">{value || emptyLabel}</span>
        <span className="combo__meta num">
          {meta}
          <span className="combo__caret" aria-hidden="true">
            ⌄
          </span>
        </span>
      </button>

      {open && (
        <div className="combo__pop">
          <input
            className="combo__search"
            type="search"
            autoFocus
            autoComplete="off"
            placeholder="Buscar…"
            aria-label={`Buscar em ${label}`}
            aria-controls={listId}
            aria-activedescendant={rows[cursor] ? `${listId}-${cursor}` : undefined}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
          />
          <ul className="combo__list" id={listId} role="listbox" aria-label={label} ref={list}>
            {rows.map((option, index) => (
              <li
                key={option.name || '__any'}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={option.name === value}
                className={`combo__opt${index === cursor ? ' combo__opt--cursor' : ''}${
                  option.name === value ? ' combo__opt--on' : ''
                }`}
                onMouseEnter={() => setCursor(index)}
                onClick={() => choose(option.name)}
              >
                <span className="combo__opt-name">{option.name || emptyLabel}</span>
                {option.name && <span className="combo__opt-count num">{option.played}</span>}
              </li>
            ))}
            {rows.length === 0 && <li className="combo__none">Nada com esse nome.</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
