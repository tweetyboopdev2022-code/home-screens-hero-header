import React from 'react';
import { Icon, wxIcon, ink, fmtTime, dayKey } from './ui';

type Hour = { time: string; temp: number; icon?: string; description?: string; precipProbability?: number };
type Day = { date: string; high: number; low: number; icon?: string; description?: string; precipProbability?: number };

/** Pop-up layer. On the wall it covers the WHOLE screen (portal into the display canvas, which carries the
 *  wall's scaling/rotation); anywhere else (editor preview) it covers just this block. */
export function Overlay({ children, onClose, style }: { children: React.ReactNode; onClose: () => void; style: any }) {
  const anchor = React.useRef<HTMLSpanElement>(null);
  const [host, setHost] = React.useState<HTMLElement | null>(null);
  React.useLayoutEffect(() => {
    if (/\/editor/.test(location.pathname)) return;
    const screen = (anchor.current?.closest('[data-module-type]') as HTMLElement | null)?.parentElement ?? null;
    if (screen && screen.offsetHeight > 600 && (window as any).ReactDOM?.createPortal) setHost(screen);
  }, []);
  const fs = Math.max(24, (Number(style?.fontSize) || 18) * 1.45);
  const layer = (full: boolean) => (
    <div onClick={(ev) => { ev.stopPropagation(); onClose(); }} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: full ? 10000 : 7,
      borderRadius: full ? 0 : 'inherit', ...(full ? { fontSize: fs, fontFamily: style?.fontFamily, color: style?.textColor } : {}) }}>
      {children}
    </div>
  );
  return (
    <>
      <span ref={anchor} style={{ display: 'none' }} />
      {host ? (window as any).ReactDOM.createPortal(layer(true), host) : layer(false)}
    </>
  );
}

const pct = (p?: number) => (typeof p === 'number' && p >= 20 ? `${Math.round(p / 10) * 10}%` : '');

/** Next 24 hours (6 × 4 grid, no scrolling on the touch screen) and the next days, with a low–high bar. */
export function WeatherPopup({ hourly, forecast, now, tz, tf, deg, accent, style, onClose }: {
  hourly: Hour[]; forecast: Day[]; now: Date; tz?: string; tf?: string; deg: string; accent: string; style: any; onClose: () => void;
}) {
  React.useEffect(() => { const t = setTimeout(onClose, 60000); return () => clearTimeout(t); }, [onClose]);
  const hrs = hourly.filter((x) => new Date(x.time).getTime() >= now.getTime() - 3600000).slice(0, 24);
  const today = dayKey(now, tz);
  const days = forecast.filter((d) => d.date >= today).slice(0, 7);
  const lo = Math.min(...days.map((d) => d.low)); const hi = Math.max(...days.map((d) => d.high)); const span = Math.max(1, hi - lo);
  const hourOf = (d: Date) => Number(new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hour12: false, timeZone: tz }).format(d));
  const hourLabel = (d: Date) => fmtTime(d, tz, tf).replace(/:00/, '').replace(/\s?([AP])M$/i, (_, a) => a.toLowerCase() + 'm');
  const dayLabel = (k: string, i: number) => (k === today ? 'Today' : i === 1 && days[0]?.date === today ? 'Tomorrow'
    : new Intl.DateTimeFormat(undefined, { weekday: 'long', timeZone: 'UTC' }).format(new Date(k + 'T12:00:00Z')));
  const caps: React.CSSProperties = { fontSize: '0.62em', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.55, margin: '0.2em 0 0.5em' };

  return (
    <div onClick={(ev) => ev.stopPropagation()} style={{ width: 'min(94%, 36em)', maxHeight: '92%', overflow: 'auto', background: style.backgroundColor || '#1c1b1a', color: style.textColor,
      borderRadius: '1em', padding: '1em 1.2em 1.2em', borderTop: `0.35em solid ${accent}`, boxShadow: '0 1em 3em rgba(0,0,0,0.5)', scrollbarWidth: 'none' } as React.CSSProperties}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6em', marginBottom: '0.6em' }}>
        <div style={{ flex: 1, fontSize: '1.25em', fontWeight: 600 }}>Weather</div>
        <button onClick={onClose} aria-label="Close" style={{ appearance: 'none', border: 'none', font: 'inherit', color: 'inherit', cursor: 'pointer', background: ink(style, 0.08), borderRadius: '999px', width: '1.8em', height: '1.8em', flexShrink: 0 }}>✕</button>
      </div>

      {hrs.length > 0 && <>
        <div style={caps}>Next {hrs.length} hours</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '0.35em', marginBottom: '1em' }}>
          {hrs.map((x, i) => {
            const d = new Date(x.time); const h = hourOf(d); const p = pct(x.precipProbability);
            return (
              <div key={x.time} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.15em', padding: '0.4em 0.2em', borderRadius: '0.6em', background: ink(style, i === 0 ? 0.1 : 0.05) }}>
                <div style={{ fontSize: '0.7em', opacity: 0.6, whiteSpace: 'nowrap' }}>{i === 0 ? 'Now' : hourLabel(d)}</div>
                <Icon d={wxIcon((x.icon ?? '') + ' ' + (x.description ?? ''), h < 6 || h >= 20)} size="1.4em" stroke={1.6} style={{ opacity: 0.85 }} />
                <div style={{ fontSize: '1em', fontWeight: 500 }}>{Math.round(x.temp)}{deg}</div>
                <div style={{ fontSize: '0.62em', color: '#60a5fa', minHeight: '1.2em' }}>{p}</div>
              </div>
            );
          })}
        </div>
      </>}

      {days.length > 0 && <>
        <div style={caps}>Next {days.length} days</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25em' }}>
          {days.map((d, i) => {
            const p = pct(d.precipProbability);
            return (
              <div key={d.date} style={{ display: 'grid', gridTemplateColumns: '6.2em 1.6em 1fr 2.4em 6em 2.4em', alignItems: 'center', gap: '0.5em', padding: '0.35em 0.5em', borderRadius: '0.6em', background: ink(style, i === 0 ? 0.08 : 0.04) }}>
                <div style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>{dayLabel(d.date, i)}</div>
                <Icon d={wxIcon((d.icon ?? '') + ' ' + (d.description ?? ''))} size="1.4em" stroke={1.6} style={{ opacity: 0.85 }} />
                <div style={{ fontSize: '0.75em', opacity: 0.6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.description}{p && <span style={{ color: '#60a5fa' }}> · {p}</span>}</div>
                <div style={{ textAlign: 'right', opacity: 0.55 }}>{Math.round(d.low)}°</div>
                <div style={{ position: 'relative', height: '0.4em', borderRadius: '999px', background: ink(style, 0.1) }}>
                  <div style={{ position: 'absolute', top: 0, bottom: 0, borderRadius: '999px', left: `${((d.low - lo) / span) * 100}%`, right: `${100 - ((d.high - lo) / span) * 100}%`,
                    background: `linear-gradient(90deg, #60a5fa, ${accent})`, minWidth: '0.4em' }} />
                </div>
                <div style={{ fontWeight: 500 }}>{Math.round(d.high)}°</div>
              </div>
            );
          })}
        </div>
      </>}
    </div>
  );
}
