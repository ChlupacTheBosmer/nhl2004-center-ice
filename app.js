// Center Ice (HockeyFeed shape: lead card, three-column cards, rail) and the
// Leafs aggregator (mapleleafsaggr shape: nav card, feed, trending). Filters
// live in the hash so a filtered view is a link.
const BUILD = document.querySelector('meta[name="build"]')?.content || "0";
const page = document.querySelector("main.agg")?.dataset.page || "center";
const root = page === "leafs" ? "../" : "";
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmt = d => new Date(d + "T00:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const fmtS = d => new Date(d + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" });
const KIND = { wire: "Wire", news: "News", board: "Numbers", analysis: "Analysis", rumor: "Rumour", opinion: "Opinion", feature: "Feature" };
let D = {};

function state() {
  const h = new URLSearchParams(location.hash.slice(1));
  return { team: h.get("team") || (page === "leafs" ? "TOR" : ""), outlet: h.get("outlet") || "", kind: h.get("kind") || "", player: h.get("player") || "", q: h.get("q") || "", view: h.get("view") || "" };
}
function setState(patch) {
  const s = { ...state(), ...patch };
  const h = new URLSearchParams(); for (const [k, v] of Object.entries(s)) if (v && !(page === "leafs" && k === "team" && v === "TOR")) h.set(k, v);
  history.replaceState(null, "", "#" + h.toString()); render();
}
const outletOf = a => D.index.outlets[a.outlet];
const crest = t => `<img class="crest" src="${root}assets/crests/${t}.png" alt="${t}" title="${esc(D.teams[t]?.name || t)}">`;
const readTime = a => `${Math.max(1, Math.round((a.words || 300) / 220))} min read`;

function card(a, size = "md") {
  const o = outletOf(a);
  const pl = (a.players || []).slice(0, 3).map(id => D.players[id]).filter(Boolean);
  return `<article class="card card-${size} ${a.image ? "has-pic" : "no-pic"}">
    ${a.image ? `<a class="pic" href="${root}${a.url}"><img src="${root}${esc(a.image)}" alt="" loading="lazy"></a>` : ""}
    <div class="cb"><div class="meta"><a class="src" href="${root}${a.outlet}/"><img src="${root}assets/brand/${o.emblem}" alt="">${esc(o.name)}</a><span class="kind k-${a.kind}">${KIND[a.kind] || a.kind}</span><time>${fmtS(a.date)}</time></div>
    <h3><a href="${root}${a.url}">${esc(a.headline)}</a></h3>${a.dek ? `<p class="dek">${esc(a.dek)}</p>` : ""}
    <div class="foot">${(a.teams || []).slice(0, 3).map(t => `<button class="crest-btn" data-team="${t}">${crest(t)}</button>`).join("")}<span>${esc(a.byline || o.name)}</span><span>·</span><span>${readTime(a)}</span>${pl.length ? `<span>·</span>${pl.map(p => `<a class="pl" href="${D.index.front_office}#player/${p.id}">${esc(p.last_name)}</a>`).join(" ")}` : ""}</div></div></article>`;
}
function hero(a) {
  const o = outletOf(a);
  return `<article class="hero-card ${a.image ? "has-pic" : ""}">${a.image ? `<img src="${root}${esc(a.image)}" alt="">` : ""}<div class="overlay">
    <div class="meta"><a class="src" href="${root}${a.outlet}/">${esc(o.name)}</a><span>${esc(a.byline || "")}</span><time>${fmt(a.date)}</time></div>
    <h2><a href="${root}${a.url}">${esc(a.headline)}</a></h2>${a.dek ? `<p class="dek">${esc(a.dek)}</p>` : ""}
    <div class="foot"><span class="kind k-${a.kind}">${KIND[a.kind] || a.kind}</span><span>${readTime(a)}</span></div></div></article>`;
}
function filtered(s) {
  let items = D.index.items;
  if (s.team) items = items.filter(a => (a.teams || []).includes(s.team));
  if (s.outlet) items = items.filter(a => a.outlet === s.outlet);
  if (s.kind) items = items.filter(a => a.kind === s.kind);
  if (s.player) items = items.filter(a => (a.players || []).includes(Number(s.player)));
  if (s.q) { const q = s.q.toLowerCase(); items = items.filter(a => (a.headline + " " + a.dek + " " + (a.tags || []).join(" ")).toLowerCase().includes(q)); }
  return items;
}
function filtersHtml(s, n) {
  const outlets = Object.entries(D.index.outlets).filter(([k]) => k !== "center-ice");
  const kinds = [...new Set(D.index.items.map(a => a.kind))];
  const who = s.player && D.players[s.player];
  return `<select data-f="outlet" aria-label="Desk"><option value="">All desks</option>${outlets.map(([k, o]) => `<option value="${k}" ${s.outlet === k ? "selected" : ""}>${esc(o.name)}</option>`).join("")}</select>
    <select data-f="kind" aria-label="Category"><option value="">All categories</option>${kinds.map(k => `<option value="${k}" ${s.kind === k ? "selected" : ""}>${KIND[k] || k}</option>`).join("")}</select>
    <input data-f="q" type="search" placeholder="Search" value="${esc(s.q)}" aria-label="Search">
    ${s.team && page !== "leafs" ? `<button class="chip" data-clear="team">${crest(s.team)} ${esc(D.teams[s.team]?.name || s.team)} ×</button>` : ""}
    ${who ? `<button class="chip" data-clear="player">${esc(who.first_name + " " + who.last_name)} ×</button>` : ""}
    <span class="muted">${n} stor${n === 1 ? "y" : "ies"}</span>`;
}
function render() {
  const s = state();
  const items = filtered(s);
  $("#filters").innerHTML = filtersHtml(s, items.length);
  if (page === "center") {
    const prose = items.filter(a => !["league-wire", "plus-minus"].includes(a.outlet) && a.image && !/figures\//.test(a.image));
    const lead = !s.q && !s.player && !s.outlet && !s.kind ? prose[0] : null;
    $("#hero").innerHTML = lead ? hero(lead) : "";
    const rest = items.filter(a => a !== lead);
    let html = "", day = "";
    for (const a of rest) { if (a.date !== day) { day = a.date; html += `<div class="day">${fmt(day)}</div>`; } html += card(a, ["league-wire", "plus-minus"].includes(a.outlet) ? "md" : "lg"); }
    $("#feed").innerHTML = html || `<div class="empty">Nothing matches. Clear a filter.</div>`;
    const tr = $("#teamrow");
    if (tr) tr.innerHTML = Object.keys(D.teams).map(t => `<button data-team="${t}" aria-pressed="${s.team === t}" title="${esc(D.teams[t].name)}"><img src="${root}assets/crests/${t}.png" alt="${t}"></button>`).join("");
  } else {
    let html = "";
    for (const a of items) html += card(a, "lg");
    $("#feed").innerHTML = html || `<div class="empty">Nothing matches. Clear a filter.</div>`;
    leafsNav(s);
  }
  document.querySelectorAll("[data-team]").forEach(b => b.onclick = () => setState({ team: state().team === b.dataset.team && page !== "leafs" ? "" : b.dataset.team }));
  document.querySelectorAll("[data-f]").forEach(el => el.onchange = el.oninput = () => setState({ [el.dataset.f]: el.value }));
  document.querySelectorAll("[data-clear]").forEach(b => b.onclick = () => setState({ [b.dataset.clear]: "" }));
  rail(s);
}
function leafsNav(s) {
  const tor = D.index.items.filter(a => (a.teams || []).includes("TOR"));
  const byOutlet = {}; for (const a of tor) byOutlet[a.outlet] = (byOutlet[a.outlet] || 0) + 1;
  const byKind = {}; for (const a of tor) byKind[a.kind] = (byKind[a.kind] || 0) + 1;
  $("#lnav").innerHTML = `<div class="box"><a class="${!s.outlet && !s.kind ? "cur" : ""}" href="#" data-nav="all">Home <small>${tor.length}</small></a><p>Curated Leafs coverage in the order it was published</p>
    ${Object.entries(byKind).map(([k, n]) => `<a class="${s.kind === k ? "cur" : ""}" href="#" data-nav="kind:${k}">${KIND[k] || k} <small>${n}</small></a>`).join("")}</div>
    <div class="box"><h2>Desks</h2>${Object.entries(byOutlet).map(([k, n]) => `<a class="${s.outlet === k ? "cur" : ""}" href="#" data-nav="outlet:${k}">${esc(D.index.outlets[k].name)} <small>${n}</small></a>`).join("")}</div>
    <div class="box"><h2>Front office</h2><a href="${D.index.front_office}">Internal system</a><a href="${D.index.front_office}#lines">Lines</a><a href="${D.index.front_office}#roster">Roster</a></div>`;
  document.querySelectorAll("[data-nav]").forEach(a => a.onclick = e => { e.preventDefault(); const [k, v] = a.dataset.nav.split(":"); setState(k === "all" ? { outlet: "", kind: "" } : { [k]: state()[k] === v ? "" : v }); });
}
function rail(s) {
  const L = D.league, st = L.standings, us = L.team;
  const div = D.teams[us]?.division;
  const table = rows => `<table class="st"><tr><th>Club</th><th>GP</th><th>W</th><th>L</th><th>OTL</th><th>Pts</th></tr>${rows.map(r => `<tr class="${r.abbr === us ? "us" : ""}"><td>${crest(r.abbr)} ${r.abbr}</td><td>${r.gp}</td><td>${r.w}</td><td>${r.l}</td><td>${r.otl}</td><td>${r.pts}</td></tr>`).join("")}</table>`;
  const north = st.filter(r => D.teams[r.abbr]?.division === div);
  const latestBy = {}; for (const a of D.index.items) if (!latestBy[a.outlet]) latestBy[a.outlet] = a;
  const desks = Object.values(latestBy).map(a => `<li><img class="crest" src="${root}assets/brand/${outletOf(a).emblem}" alt=""><div><a href="${root}${a.url}">${esc(a.headline)}</a><small>${esc(outletOf(a).name)} · ${fmtS(a.date)}</small></div></li>`).join("");
  const next = L.upcoming[0];
  const trending = D.index.items.filter(a => (a.teams || []).includes("TOR") && !["league-wire", "plus-minus"].includes(a.outlet)).slice(0, 6);
  if (page === "leafs") {
    $("#side").innerHTML = `<div class="box trend"><h2>Trending</h2><ul class="hl">${trending.map((a, i) => `<li><span class="n">${i + 1}</span><div><a href="${root}${a.url}">${esc(a.headline)}</a><small>${esc(outletOf(a).name)} · ${esc(a.byline || "")}</small></div></li>`).join("")}</ul></div>
      <div class="box"><h2>Next</h2>${next ? `<b>${next.at_home ? "vs" : "at"} ${esc(D.teams[next.opponent]?.name || next.opponent)}</b><br><span class="muted">${fmt(next.game_date)}</span>` : "No game scheduled"}
      <h2>Last games</h2><ul class="hl">${L.recent.slice(0, 6).map(g => `<li><div><b>${g.result}</b> ${g.gf}-${g.ga} ${g.at_home ? "vs" : "at"} ${esc(g.opponent)}${g.overtime ? " (OT)" : ""}<small>${fmtS(g.game_date)}</small></div></li>`).join("")}</ul></div>
      <div class="box"><h2>${esc(D.teams[us]?.division_name || "Division")}</h2>${table(north)}</div>
      <div class="box"><h2>Injured</h2>${L.injuries.length ? `<ul class="hl">${L.injuries.map(i => `<li><div><a class="pl" href="${D.index.front_office}#player/${i.player_id}">${esc(i.first_name + " " + i.last_name)}</a><small>back ${i.return_date}</small></div></li>`).join("")}</ul>` : "<span class='muted'>Nobody on the list.</span>"}</div>`;
    return;
  }
  $("#side").innerHTML = `<div class="box"><h2>Latest from each desk</h2><ul class="hl">${desks}</ul></div>
    <div class="box"><h2>Upcoming games</h2><ul class="hl games">${(L.upcoming_all || []).slice(0, 10).map(g => `<li><div class="g"><span>${crest(g.away)} ${g.away}</span><span class="at">at</span><span>${crest(g.home)} ${g.home}</span></div><small>${fmt(g.game_date)}</small></li>`).join("")}</ul></div>
    <div class="box"><h2>League</h2>${table(st.slice(0, 10))}</div>
    <div class="box"><h2>${esc(D.teams[us]?.division_name || "Division")}</h2>${table(north)}</div>`;
}
(async () => {
  const [index, players, teams, league] = await Promise.all(["index", "players", "teams", "league"].map(n => fetch(`${root}data/${n}.json?b=${BUILD}`).then(r => r.json())));
  D = { index, players: Object.fromEntries(Object.entries(players).map(([k, v]) => [k, { id: Number(k), ...v }])), teams, league };
  window.addEventListener("hashchange", render);
  render();
})();
