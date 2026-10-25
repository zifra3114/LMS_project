/** Student portal ke pages ki shared styling. */
export const PAGE_STYLES = `
  :host { display: block; color: #0f172a; }
  * { box-sizing: border-box; }

  .page-head { margin-bottom: 26px; padding-bottom: 18px; border-bottom: 1px solid #e2e8f0; }
  .page-head .kicker { display: inline-block; padding: 4px 10px; border-radius: 999px; background: #eff6ff; color: #1d4ed8; font-size: 10px; font-weight: 800; letter-spacing: .16em; text-transform: uppercase; }
  .head-row { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; margin: 12px 0 6px; }
  .page-head h1 { margin: 0; font-size: clamp(24px, 3vw, 30px); line-height: 1.2; font-weight: 800; letter-spacing: -.03em; color: #0f172a; }
  .count { padding: 4px 11px; border-radius: 999px; background: #0f172a; color: #fff; font-size: 11px; font-weight: 700; }
  .page-head p { margin: 0; color: #64748b; font-size: 13.5px; line-height: 1.7; }

  .panel { border: 1px solid #e2e8f0; border-radius: 18px; background: #fff; padding: 20px; box-shadow: 0 1px 3px rgb(15 23 42 / 5%); min-width: 0; }
  .panel h2 { margin: 0 0 14px; font-size: 14px; font-weight: 800; color: #0f172a; }

  .cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 18px; }

  .item { position: relative; display: flex; flex-direction: column; gap: 12px; overflow: hidden; border: 1px solid #e2e8f0; border-radius: 18px; background: #fff; padding: 20px; box-shadow: 0 1px 3px rgb(15 23 42 / 5%); transition: border-color .18s ease, box-shadow .18s ease, transform .18s ease; min-width: 0; }
  .item::before { content: ''; position: absolute; inset: 0 0 auto 0; height: 3px; background: linear-gradient(90deg, #2563eb, #6366f1); }
  .item.is-important::before { background: linear-gradient(90deg, #e11d48, #f97316); }
  .item:hover { border-color: #bfdbfe; box-shadow: 0 14px 30px rgb(15 23 42 / 10%); transform: translateY(-2px); }
  .item.is-important:hover { border-color: #fecdd3; }

  .item-top { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
  .item-icon { display: flex; align-items: center; justify-content: center; width: 38px; height: 38px; flex-shrink: 0; border-radius: 12px; background: #eff6ff; color: #2563eb; }
  .item.is-important .item-icon { background: #fff1f2; color: #e11d48; }
  .badges { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 6px; }
  .badge { padding: 3px 9px; border-radius: 999px; font-size: 10px; font-weight: 800; letter-spacing: .04em; text-transform: uppercase; }
  .badge.tag { background: #f1f5f9; color: #475569; }
  .badge.new { background: #dcfce7; color: #15803d; }
  .badge.important { background: #fff1f2; color: #e11d48; border: 1px solid #fecdd3; }

  .item h3 { margin: 0; font-size: 16px; line-height: 1.4; font-weight: 700; color: #0f172a; overflow-wrap: anywhere; }
  .item .body { margin: 0; color: #475569; font-size: 13.5px; line-height: 1.75; overflow-wrap: anywhere; display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; }

  .item-foot { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-top: auto; padding-top: 12px; border-top: 1px solid #f1f5f9; }
  .foot-date { display: inline-flex; align-items: center; gap: 6px; color: #64748b; font-size: 11.5px; font-weight: 600; }
  .foot-ago { color: #94a3b8; font-size: 11px; font-weight: 600; }

  .chips { display: flex; flex-wrap: wrap; gap: 7px; }
  .chip { display: inline-flex; gap: 5px; align-items: center; padding: 5px 10px; border: 1px solid #dbeafe; border-radius: 999px; background: #eff6ff; color: #1d4ed8; font-size: 11px; font-weight: 700; }
  .chip b { color: #64748b; font-weight: 600; }
  .open-btn { align-self: flex-start; display: inline-flex; align-items: center; gap: 6px; padding: 9px 14px; border-radius: 10px; background: #0f172a; color: #fff; font-size: 12px; font-weight: 700; text-decoration: none; transition: background .2s ease; }
  .open-btn:hover { background: #1d4ed8; }

  .state { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 52px 20px; border: 1px dashed #cbd5e1; border-radius: 18px; background: #fff; text-align: center; color: #64748b; font-size: 13px; line-height: 1.7; }
  .state strong { color: #0f172a; font-size: 14.5px; }
  .empty-icon { display: flex; align-items: center; justify-content: center; width: 54px; height: 54px; margin-bottom: 4px; border-radius: 50%; background: #f1f5f9; color: #94a3b8; }
  .state.error { border-color: #fecdd3; background: #fff1f2; color: #be123c; }
  .state.error strong { color: #9f1239; }
  .spinner { display: inline-block; width: 22px; height: 22px; border: 3px solid #2563eb; border-top-color: transparent; border-radius: 50%; animation: spin .8s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { animation-duration: .01ms !important; transition-duration: .01ms !important; }
  }
`;