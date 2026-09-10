// The two feeds: Center Ice (every story) and the Leafs aggregator (stories
// naming Toronto). Filters live in the hash so a filtered view is a link.
const BUILD = document.querySelector('meta[name="build"]')?.content || "0";
const page = document.querySelector("main.agg")?.dataset.page || "center";
const root = page === "leafs" ? "../" : "";
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmt = d => new Date(d + "T00:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const KIND = { wire: "News", news: "News", board: "Numbers", analysis: "Analysis", rumor: "Rumor", opinion: "Opinion", feature: "Feature" };
let D = {};

function state() {
  const h = new URLSearchParams(location.hash.slice(1));
  return { team: h.get("team") || (page === "leafs" ? "TOR" : ""), outlet: h.get("outlet") || "", kind: h.get("kind") || "", player: h.get("player") || "", q: h.get("q") || "" };
}
function setState(patch) {
  const s = { ...state(), ...patch };
  const h = new URLSearchParams(); for (const [k, v] of Object.entries(s)) if (v && !(page === "leafs" && k === "team" && v === "TOR")) h.set(k, v);
  history.replaceState(null, "", "#" + h.toString()); render();
}
function teaser(a) {
  const o = D.index.outlets[a.outlet];
  const pl = (a.players || []).slice(0, 3).map(id => D.players[id]).filter(Boolean);
  return `<article class="tease">
    <a class="tease-outlet" href="${root}${a.outlet}/"><img src="${root}assets/brand/${o.emblem}" alt="">${esc(o.name)}</a>
    <h3><a href="${root}${a.url}">${esc(a.headline)}</a></h3>
    ${a.dek ? `<p class="dek">${esc(a.dek)}</p>` : ""}
    <div class="tease-meta"><span class="kind kind-${a.kind}">${KIND[a.kind] || a.kind}</span>${a.byline ? `<span>${esc(a.byline)}</span>` : ""}<time>${fmt(a.date)}</time>
      ${(a.teams || []).slice(0, 4).map(t => `<button class="crest-btn" data-team="${t}" title="${t}"><img class="crest" src="${root}assets/crests/${t}.png" alt="${t}"></button>`).join("")}
      ${pl.map(p => `<a class="pl" href="${D.index.front_office}#player/${p.id}">${esc(p.last_name)}</a>`).join(" ")}</div>
    ${a.image ? `<img class="thumb" src="${root}${esc(a.image)}" alt="" loading="lazy">` : ""}
  </article>`;
}
function render() {
  const s = state();
  let items = D.index.items;
  if (s.team) items = items.filter(a => (a.teams || []).includes(s.team));
  if (s.outlet) items = items.filter(a => a.outlet === s.outlet);
  if (s.kind) items = items.filter(a => a.kind === s.kind);
  if (s.player) items = items.filter(a => (a.players || []).includes(Number(s.player)));
  if (s.q) { const q = s.q.toLowerCase(); items = items.filter(a => (a.headline + " " + a.dek).toLowerCase().includes(q)); }
  const outlets = Object.entries(D.index.outlets).filter(([k]) => k !== "center-ice");
  const kinds = [...new Set(D.index.items.map(a => a.kind))];
  const who = s.player && D.players[s.player];
  $("#filters").innerHTML = `
    <select data-f="outlet" aria-label="Outlet"><option value="">All outlets</option>${outlets.map(([k, o]) => `<option value="${k}" ${s.outlet === k ? "selected" : ""}>${esc(o.name)}</option>`).join("")}</select>
    <select data-f="kind" aria-label="Category"><option value="">All categories</option>${kinds.map(k => `<option value="${k}" ${s.kind === k ? "selected" : ""}>${KIND[k] || k}</option>`).join("")}</select>
    <input data-f="q" type="search" placeholder="Search headlines" value="${esc(s.q)}" aria-label="Search">
    ${s.team && page !== "leafs" ? `<button class="chip" aria-pressed="true" data-clear="team"><img class="crest" src="${root}assets/crests/${s.team}.png" alt=""> ${esc(D.teams[s.team]?.name || s.team)} ×</button>` : ""}
    ${who ? `<button class="chip" aria-pressed="true" data-clear="player">${esc(who.first_name + " " + who.last_name)} ×</button>` : ""}
    <span class="muted">${items.length} stor${items.length === 1 ? "y" : "ies"}</span>`;
  let html = "", day = "";
  for (const a of items) { if (a.date !== day) { day = a.date; html += `<div class="day-h">${fmt(day)}</div>`; } html += teaser(a); }
  $("#feed").innerHTML = html || `<div class="empty">Nothing matches. Clear a filter.</div>`;
  const tr = $("#teamrow");
  if (tr) tr.innerHTML = Object.keys(D.teams).map(t => `<button data-team="${t}" aria-pressed="${s.team === t}" title="${esc(D.teams[t].name)}"><img src="${root}assets/crests/${t}.png" alt="${t}"></button>`).join("");
  document.querySelectorAll("[data-team]").forEach(b => b.onclick = () => setState({ team: state().team === b.dataset.team && page !== "leafs" ? "" : b.dataset.team }));
  document.querySelectorAll("[data-f]").forEach(el => el.onchange = el.oninput = () => setState({ [el.dataset.f]: el.value }));
  document.querySelectorAll("[data-clear]").forEach(b => b.onclick = () => setState({ [b.dataset.clear]: "" }));
  side(s);
}
function side(s) {
  const L = D.league, st = L.standings, us = L.team;
  const div = D.teams[us]?.division, conf = D.teams[us]?.conference;
  const table = (rows, cls) => `<table><tr><th>Club</th><th>GP</th><th>W</th><th>L</th><th>OTL</th><th>Pts</th></tr>${rows.map(r => `<tr class="${r.abbr === us ? "us" : ""}"><td><img class="crest" src="${root}assets/crests/${r.abbr}.png" alt=""> ${r.abbr}</td><td>${r.gp}</td><td>${r.w}</td><td>${r.l}</td><td>${r.otl}</td><td>${r.pts}</td></tr>`).join("")}</table>`;
  const north = st.filter(r => D.teams[r.abbr]?.division === div);
  const latestBy = {};
  for (const a of D.index.items) if (!latestBy[a.outlet]) latestBy[a.outlet] = a;
  const hl = Object.values(latestBy).slice(0, 8).map(a => `<li class="hl"><a href="${root}${a.url}">${esc(a.headline)}</a><br><span class="muted">${esc(D.index.outlets[a.outlet].name)}</span></li>`).join("");
  const next = L.upcoming[0];
  const leafs = page === "leafs" ? `
    <div class="box"><h2>Next</h2>${next ? `<b>${next.at_home ? "vs" : "at"} ${esc(D.teams[next.opponent]?.name || next.opponent)}</b><br><span class="muted">${fmt(next.game_date)}</span>` : "No game scheduled"}
      <h2 style="margin-top:.75rem">Last games</h2><ul>${L.recent.slice(0, 6).map(g => `<li><b>${g.result}</b> ${g.gf}-${g.ga} ${g.at_home ? "vs" : "at"} ${g.opponent}${g.overtime ? " (OT)" : ""} <span class="muted">${g.game_date.slice(5)}</span></li>`).join("")}</ul></div>
    <div class="box"><h2>Injured</h2>${L.injuries.length ? `<ul>${L.injuries.map(i => `<li><a class="pl" href="${D.index.front_office}#player/${i.player_id}">${esc(i.first_name + " " + i.last_name)}</a> <span class="muted">back ${i.return_date}</span></li>`).join("")}</ul>` : "<span class='muted'>Nobody on the list.</span>"}</div>` : "";
  $("#side").innerHTML = `
    <div class="box"><h2>${esc(D.teams[us]?.division_name || "Division")}</h2>${table(north)}</div>
    ${leafs}
    <div class="box"><h2>League</h2>${table(st.slice(0, 10))}</div>
    <div class="box"><h2>Latest from each desk</h2><ul>${hl}</ul></div>
    <div class="box"><h2>Front office</h2><a href="${D.index.front_office}">Open the club's internal system</a></div>`;
}
(async () => {
  const [index, players, teams, league] = await Promise.all(["index", "players", "teams", "league"].map(n => fetch(`${root}data/${n}.json?b=${BUILD}`).then(r => r.json())));
  D = { index, players: Object.fromEntries(Object.entries(players).map(([k, v]) => [k, { id: Number(k), ...v }])), teams, league };
  window.addEventListener("hashchange", render);
  render();
})();
