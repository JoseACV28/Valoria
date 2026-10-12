// Local SVG flags avoid unsupported regional-indicator emoji on Windows.
export function LanguageFlag({code}) {
  return <svg viewBox="0 0 30 20" width="27" height="18" aria-hidden="true" focusable="false">
    {code==='es' && <><path fill="#aa151b" d="M0 0h30v20H0z"/><path fill="#f1bf00" d="M0 5h30v10H0z"/><path fill="#aa151b" d="M8 8h3v5H8z"/></>}
    {code==='en' && <><path fill="#012169" d="M0 0h30v20H0z"/><path stroke="white" strokeWidth="5" d="m0 0 30 20M30 0 0 20"/><path stroke="#c8102e" strokeWidth="2" d="m0 0 30 20M30 0 0 20"/><path stroke="white" strokeWidth="7" d="M15 0v20M0 10h30"/><path stroke="#c8102e" strokeWidth="4" d="M15 0v20M0 10h30"/></>}
    {code==='fr' && <><path fill="white" d="M0 0h30v20H0z"/><path fill="#002395" d="M0 0h10v20H0z"/><path fill="#ed2939" d="M20 0h10v20H20z"/></>}
    {code==='zh' && <><path fill="#de2910" d="M0 0h30v20H0z"/><path fill="#ffde00" d="m6 3 .9 2.8h2.9L7.5 7.5l.9 2.8L6 8.6l-2.4 1.7.9-2.8-2.3-1.7h2.9Z"/><g fill="#ffde00"><circle cx="11" cy="3" r=".8"/><circle cx="13" cy="5" r=".8"/><circle cx="13" cy="8" r=".8"/><circle cx="11" cy="10" r=".8"/></g></>}
    {code==='ja' && <><path fill="white" d="M0 0h30v20H0z"/><circle fill="#bc002d" cx="15" cy="10" r="5"/></>}
    {code==='ko' && <><path fill="white" d="M0 0h30v20H0z"/><circle fill="#cd2e3a" cx="15" cy="10" r="4.6"/><path fill="#0047a0" d="M10.4 10a4.6 4.6 0 0 0 9.2 0 2.3 2.3 0 0 0-4.6 0 2.3 2.3 0 0 1-4.6 0"/><g stroke="#151515" strokeWidth=".7"><path d="m4 5 3-3m-2 4 3-3m-2 4 3-3m-5 11 3 3m-2-4 3 3m-2-4 3 3m12-9 3-3m-2 4 3-3m-2 4 3-3m-5 11 3 3m-2-4 3 3m-2-4 3 3"/></g></>}
  </svg>;
}
