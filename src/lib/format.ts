/**
 * Formatação pt-BR da interface: decimal com vírgula, em dash para o que não
 * existe e sinal de menos tipográfico nas linhas de handicap. Só apresentação —
 * nenhum número é recalculado aqui.
 */

export function decimal(value: number, places = 2): string {
  return value.toFixed(places).replace('.', ',');
}

/** `12.5` → `12,5%`, `50` → `50%`. Casas decimais que não agregam saem fora. */
export function pct(value: number): string {
  const text = Number.isInteger(value) ? String(value) : value.toFixed(1);
  return `${text.replace('.', ',')}%`;
}

/** Odd justa sempre com duas casas. Frequência zero não tem odd, e aí é em dash. */
export function odds(value: number | null): string {
  return value === null ? '—' : decimal(value, 2);
}

export function signedDecimal(value: number, places = 2): string {
  const sign = value > 0 ? '+' : value < 0 ? '−' : '';
  return `${sign}${decimal(Math.abs(value), places)}`;
}

/** Contagens sempre como fração, para a frequência não ficar solta. */
export function tally(hits: number, base: number): string {
  return `${hits}/${base}`;
}

/**
 * O módulo compartilhado rotula handicap com hífen ASCII; o design pede o sinal
 * de menos (U+2212), que alinha com os dígitos.
 */
export function minusSign(label: string): string {
  return label.replaceAll('-', '−');
}

export function dayMonth(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

export function hourMinute(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export function stamp(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Idade grosseira do dado no cabeçalho: "agora", "há 8 min", "há 2 h". */
export function since(iso: string, now = Date.now()): string {
  const minutes = Math.floor((now - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return 'agora';
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  return `há ${Math.floor(hours / 24)} d`;
}
