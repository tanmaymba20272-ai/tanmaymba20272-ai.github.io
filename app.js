// Everything on the page that can change is read from data files, so the site evolves
// by updating data/changelog.json or by the harness publishing new results.

const $ = (id) => document.getElementById(id);
const pct = (x, d = 1) => (x == null ? "n/a" : `${(x * 100).toFixed(d)}%`);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

async function getJSON(url) {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`${url}: ${r.status}`);
  return r.json();
}

async function main() {
  const site = await getJSON("data/site.json");
  links(site);
  getJSON("data/changelog.json").then(changelog).catch(() => {});

  // ?results=<url> lets you preview a local file before publishing.
  const override = new URLSearchParams(location.search).get("results");
  let results = null;
  try {
    results = await getJSON(override || site.results_url);
  } catch {
    results = null;
  }
  drawChart(results);
  figures(results);
}

function links(site) {
  const n = $("notion-link");
  if (site.notion_url) {
    n.innerHTML = `<a class="btn ghost" href="${esc(site.notion_url)}">Open the Notion workspace</a>`;
  } else {
    n.textContent = "The Notion workspace is being prepared for public viewing.";
    n.className = "intro";
  }
  if (site.linkedin_url) {
    $("linkedin").innerHTML = ` and <a href="${esc(site.linkedin_url)}">LinkedIn</a>`;
  }
}

function changelog(items) {
  $("log-list").innerHTML = items
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((it) => {
      const d = new Date(it.date + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
      const ls = (it.links || []).map((l) => `<a href="${esc(l.href)}">${esc(l.label)}</a>`).join(", ");
      return `<li><time datetime="${esc(it.date)}">${d}</time><div><h3>${esc(it.title)}</h3><p>${esc(it.body)}</p>${ls ? `<p>${ls}</p>` : ""}</div></li>`;
    })
    .join("");
}

function figures(r) {
  if (!r) {
    $("caveat").textContent = "The harness publishes here after its first run with live data.";
    return;
  }
  const th = r.autonomy_threshold?.recalibrated;
  const rows = [
    ["Complaints evaluated", r.n.toLocaleString(), `${esc(r.model || "")}, ${new Date(r.generated_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`],
    ["Product accuracy", pct(r.accuracy.value), `95% interval ${pct(r.accuracy.ci95[0])} to ${pct(r.accuracy.ci95[1])}`],
    ["Calibration error", `${r.calibration.raw.ece.toFixed(3)} to ${r.calibration.recalibrated_cross_fitted.ece.toFixed(3)}`, "As returned, then after recalibration. Lower is more honest."],
    ["Safe to automate", th ? pct(th.coverage) : "None yet", th ? `of complaints, with precision of at least ${pct(th.precision_lower)} at the lower bound` : `No threshold reaches ${pct(r.autonomy_threshold.target_precision_lower_bound, 0)} at the lower bound, so all cases go to people`],
  ];
  if (r.baseline_rules) rows.push(["Keyword-rule baseline", pct(r.baseline_rules.accuracy_all), "Accuracy of the rules the AI has to beat"]);
  if (r.ops?.latency_ms_p50 != null) rows.push(["Speed and cost", `${Math.round(r.ops.latency_ms_p50)} ms`, `Median per complaint (95th percentile ${Math.round(r.ops.latency_ms_p95)} ms), about $${(r.ops.cost_usd_per_case * 1000).toFixed(3)} per 1,000 complaints`]);
  $("figures").innerHTML = rows.map(([t, v, s]) => `<div><dt>${t}</dt><dd>${v}<small>${s}</small></dd></div>`).join("");
  $("caveat").textContent = r.label_caveat + " " + (r.signals?.note || "");
}

function drawChart(r) {
  const W = 520, H = 400, m = { t: 12, r: 16, b: 52, l: 56 };
  const iw = W - m.l - m.r, ih = H - m.t - m.b;
  const x = (v) => m.l + v * iw;
  const y = (v) => m.t + (1 - v) * ih;
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="chart-title chart-sub">`;
  for (let v = 0; v <= 1.0001; v += 0.25) {
    s += `<line class="grid" x1="${m.l}" x2="${W - m.r}" y1="${y(v)}" y2="${y(v)}"/>`;
    s += `<text x="${m.l - 10}" y="${y(v) + 4}" text-anchor="end">${Math.round(v * 100)}%</text>`;
    s += `<text x="${x(v)}" y="${H - m.b + 20}" text-anchor="middle">${Math.round(v * 100)}%</text>`;
  }
  s += `<text class="axis-title" x="${m.l + iw / 2}" y="${H - 8}" text-anchor="middle">How sure the model said it was</text>`;
  s += `<text class="axis-title" transform="translate(14 ${m.t + ih / 2}) rotate(-90)" text-anchor="middle">How often it was right</text>`;
  s += `<line x1="${x(0)}" y1="${y(0)}" x2="${x(1)}" y2="${y(1)}" stroke="var(--ideal)" stroke-width="1.5" stroke-dasharray="4 3"/>`;

  if (!r) {
    s += `<text class="empty" x="${m.l + iw / 2}" y="${m.t + ih / 2 - 30}" text-anchor="middle">The first live run will be plotted here.</text></svg>`;
    $("chart").innerHTML = s;
    $("chart-sub").textContent = "Each week, a fixed sample of real complaints is scored and checked against its labels. Points on the dashed line mean the model's stated certainty matches reality.";
    return;
  }

  const series = [
    { key: "raw", name: "Jev, as returned", color: "var(--series-raw)", bins: r.calibration.raw.bins },
    { key: "cal", name: "After our recalibration", color: "var(--series-cal)", bins: r.calibration.recalibrated_cross_fitted.bins },
  ];
  const points = [];
  for (const se of series) {
    const pts = se.bins.filter((b) => b.n > 0);
    if (pts.length > 1) {
      s += `<polyline fill="none" stroke="${se.color}" stroke-width="2" stroke-linejoin="round" points="${pts.map((b) => `${x(b.mean_p)},${y(b.accuracy)}`).join(" ")}"/>`;
    }
    for (const b of pts) {
      points.push({ ...b, se });
      s += `<circle cx="${x(b.mean_p)}" cy="${y(b.accuracy)}" r="5" fill="${se.color}" stroke="var(--panel)" stroke-width="2"/>`;
      s += `<circle class="hit" data-i="${points.length - 1}" cx="${x(b.mean_p)}" cy="${y(b.accuracy)}" r="14" fill="transparent" tabindex="0"/>`;
    }
  }
  s += "</svg>";
  $("chart").innerHTML = s;
  $("legend").hidden = false;
  $("chart-sub").textContent = `${r.n.toLocaleString()} real CFPB complaints, grouped by the model's stated certainty. Points on the dashed line are perfectly honest; points below it are overconfident.`;

  const tip = $("tip");
  const panel = document.querySelector(".chart-panel");
  const show = (el) => {
    const p = points[+el.dataset.i];
    tip.innerHTML = `<b>${p.se.name}</b><br>Said ${pct(p.mean_p, 0)} sure, right ${pct(p.accuracy, 0)} of the time<br>${p.n} complaints`;
    tip.hidden = false;
    const pr = panel.getBoundingClientRect(), er = el.getBoundingClientRect();
    tip.style.left = Math.min(er.left - pr.left + 16, pr.width - 250) + "px";
    tip.style.top = er.top - pr.top - 8 + "px";
  };
  document.querySelectorAll(".hit").forEach((el) => {
    el.addEventListener("mouseenter", () => show(el));
    el.addEventListener("focus", () => show(el));
    el.addEventListener("mouseleave", () => (tip.hidden = true));
    el.addEventListener("blur", () => (tip.hidden = true));
  });

  // table view for screen readers and anyone who prefers numbers
  const tb = $("table-toggle"), wrap = $("table-wrap");
  tb.hidden = false;
  wrap.innerHTML = `<table><thead><tr><th>Stated certainty</th><th>Complaints</th><th>Right (as returned)</th><th>Right (recalibrated bin)</th></tr></thead><tbody>${r.calibration.raw.bins
    .filter((b) => b.n)
    .map((b) => `<tr><td>${pct(b.lo, 0)} to ${pct(b.hi, 0)}</td><td>${b.n}</td><td>${pct(b.accuracy, 0)}</td><td>${(() => { const c = r.calibration.recalibrated_cross_fitted.bins.find((k) => k.lo === b.lo && k.n); return c ? pct(c.accuracy, 0) : "n/a"; })()}</td></tr>`)
    .join("")}</tbody></table>`;
  tb.addEventListener("click", () => {
    wrap.hidden = !wrap.hidden;
    tb.setAttribute("aria-expanded", String(!wrap.hidden));
    tb.textContent = wrap.hidden ? "Show as table" : "Hide table";
  });
}

main();
