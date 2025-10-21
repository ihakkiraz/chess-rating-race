
const state = {
  years: [],
  byYear: new Map(),
  frameIndex: 0,
  playing: false,
  timer: null,
  topN: 10
};

const btnPlay    = document.getElementById("btnPlay");
const btnPause   = document.getElementById("btnPause");
const btnReset   = document.getElementById("btnReset");
const yearSlider = document.getElementById("yearSlider");
const yearLabel  = document.getElementById("yearLabel");
const yearBadge  = document.getElementById("yearBadge");
const svg        = d3.select("#chart");

const margin = { top: 24, right: 16, bottom: 32, left: 160 };
const width  = svg.node().clientWidth || 900;
const height = svg.node().clientHeight || 500;
const innerW = width - margin.left - margin.right;
const innerH = height - margin.top - margin.bottom;

svg.attr("viewBox", [0, 0, width, height]);

const g  = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
const gx = g.append("g").attr("class", "axis x");
const gy = g.append("g").attr("class", "axis y");
const layerBars = g.append("g").attr("class", "layer-bars");
const layerText = g.append("g").attr("class", "layer-text");

// X axis label
g.append("text")
  .attr("class", "axis-label x")
  .attr("x", innerW - 50)
  .attr("y", innerH - 10)
  .attr("text-anchor", "middle")
  .text("Rating (Adjusted Elo)");

const x = d3.scaleLinear().range([0, innerW]);
const y = d3.scaleBand().range([0, innerH]).padding(0.12);
const color = d3.scaleOrdinal(d3.schemePaired);

// helpers
function parseRow(d) {
  return {
    player: (d.Player || "").trim(),
    rating: +d.Rating,
    year: +d.year,
    age: d.Age ? +d.Age : null,
    worldRank: d.ranking ? +d.ranking : null
  };
}

function groupByYear(rows) {
  const by = d3.group(rows, d => d.year);
  const years = Array.from(by.keys()).sort((a, b) => a - b);
  return { years, byYear: by };
}

function frameData(year) {
  const rows = state.byYear.get(year) || [];
  const byPlayer = d3.group(rows, d => d.player);
  const unique = Array.from(byPlayer, ([player, arr]) =>
    arr.reduce((best, r) => (r.rating > best.rating ? r : best))
  );
  return unique
    .filter(r => Number.isFinite(r.rating))
    .sort((a, b) => d3.descending(a.rating, b.rating))
    .slice(0, state.topN);
}

function parseDateRanges(dateStr) {
  if (!dateStr) return [];
  const ranges = [];
  const parts = dateStr.split(",").map(s => s.trim());
  
  for (const part of parts) {
    const match = part.match(/(\d{4})-(\d{2,4})/);
    if (match) {
      const startYear = parseInt(match[1]);
      let endYear = parseInt(match[2]);
      // Handle 2-digit years 
      if (endYear < 100) {
        endYear = Math.floor(startYear / 100) * 100 + endYear;
      }
      ranges.push({ start: startYear, end: endYear });
    }
  }
  return ranges;
}

// Map of year -> reigning world champion name
let CHAMPION_BY_YEAR = new Map();

const isChampion = (name, year) => {
  const championName = CHAMPION_BY_YEAR.get(year);
  if (!championName) return false;
  return name === championName;
};

function render(year) {
  const data = frameData(year);
  const minX = 2000;
  const rawMax = (data.length ? d3.max(data, d => d.rating) : 1) || 1;
  const maxX = rawMax * 1.05;   
  x.domain([minX, maxX]).nice();
  y.domain(data.map(d => d.player));
  
  const rowsThisYear = state.byYear.get(year) || [];
  const rank1 = new Set(rowsThisYear.filter(r => r.worldRank === 1).map(r => r.player));

  const t = d3.transition().duration(700).ease(d3.easeCubicOut);

  gx.attr("transform", `translate(0,${innerH})`)
    .transition(t)
    .call(d3.axisBottom(x).ticks(6).tickSizeOuter(0));

  gy.transition(t)
    .call(d3.axisLeft(y).tickSizeInner(0).tickSizeOuter(0));
  gy.select(".domain").remove();

  const ticks = gy.selectAll(".tick");

  ticks.select("text")
    .text(d => d)
    .style("fill", "#e9edff")
    .style("font-weight", 400);

  ticks.filter(d => rank1.has(d))
    .select("text")
    .style("fill", "#FFD700")
    .style("font-weight", 700);

  ticks.select("text.crown").remove();
  ticks.filter(d => isChampion(d, year))
    .each(function() {
      const tick = d3.select(this);
      const textElement = tick.select("text");
      const textWidth = textElement.node().getBBox().width;
      
      tick.append("text")
        .attr("class", "crown")
        .attr("x", -textWidth - 15)
        .attr("y", 0)
        .attr("dy", "0.32em")
        .style("font-size", "16px")
        .text("👑");
    });

  const bars = layerBars.selectAll(".bar").data(data, d => d.player);

  bars.exit()
    .transition(t)
    .attr("width", 0)
    .style("opacity", 0)
    .remove();

  bars.transition(t)
    .attr("y", d => y(d.player))
    .attr("height", y.bandwidth())
    .attr("width", d => x(d.rating))
    .attr("fill", d => color(d.player))
    .style("opacity", 1);

  const prev = new Map(bars.data().map(d => [d.player, d])); // previous data keyed by player
  layerBars.selectAll(".bar").data(data, d => d.player)
    .enter().append("rect")
    .attr("class", "bar")
    .attr("x", 0)
    .attr("y", d => y(d.player))
    .attr("height", y.bandwidth())
    .attr("width", d => x(prev.get(d.player)?.rating ?? minX))
    .attr("fill", d => color(d.player))
    .style("opacity", 1)
    .transition(t)
    .attr("width", d => x(d.rating));

  layerBars.selectAll(".bar").order();

  const values = layerText.selectAll(".value").data(data, d => d.player);

  values.exit()
    .transition(t)
    .style("opacity", 0)
    .remove();

  values.transition(t)
    .style("opacity", 1)
    .attr("x", d => x(d.rating) + 6)
    .attr("y", d => y(d.player) + y.bandwidth() / 2)
    .attr("dominant-baseline", "middle")
    .attr("text-anchor", "start")
    .text(d => Math.round(d.rating));

  layerText.selectAll(".value").data(data, d => d.player)
    .enter().append("text")
    .attr("class", "value")
    .attr("x", d => x(prev.get(d.player)?.rating ?? minX) + 6) // start near old x
    .attr("y", d => y(d.player) + y.bandwidth() / 2)
    .attr("dominant-baseline", "middle")
    .attr("text-anchor", "start")
    .style("opacity", 0.001)
    .text(d => Math.round(d.rating))
    .transition(t)
    .style("opacity", 1)
    .attr("x", d => x(d.rating) + 6);

  yearBadge.textContent = year ?? "—";
  yearLabel.textContent = "Year: " + (year ?? "—");
}


// helpers for animation
function syncUIToIndex(i) {
  state.frameIndex = i;
  yearSlider.value = String(i);
  render(state.years[i]);
}

function play() {
  if (state.playing || !state.years.length) return;
  state.playing = true;

  btnPlay.disabled = true;
  btnPause.disabled = false;

  state.timer = d3.interval(() => {
    const next = Math.min(state.frameIndex + 1, state.years.length - 1);
    syncUIToIndex(next);
    if (next >= state.years.length - 1) pause(); // auto-stop at end
  }, 900); // frame duration (ms)
}

function pause() {
  if (state.timer) state.timer.stop();
  state.timer = null;
  state.playing = false;

  btnPlay.disabled = false;
  btnPause.disabled = true;
}

function reset() {
  pause();
  syncUIToIndex(0);
}

Promise.all([
  d3.csv("data/chess_ratings.csv", parseRow),
  d3.csv("data/world_champions.csv", d => ({ player: d.Player, dates: d.Dates }))
]).then(([rows, champs]) => {
  // Build year-to-champion map
  CHAMPION_BY_YEAR = new Map();
  for (const champ of champs) {
    const name = champ.player;
    const ranges = parseDateRanges(champ.dates);
    for (const range of ranges) {
      for (let year = range.start; year <= range.end; year++) {
        CHAMPION_BY_YEAR.set(year, name);
      }
    }
  }

  const clean = rows.filter(d =>
    d.player && Number.isFinite(d.rating) && Number.isFinite(d.year)
  );

  const { years, byYear } = groupByYear(clean);
  state.years = years;
  state.byYear = byYear;

  color.domain(Array.from(new Set(clean.map(d => d.player))));

  if (!years.length) return;

  yearSlider.min = 0;
  yearSlider.max = years.length - 1;
  yearSlider.value = 0;
  yearSlider.disabled = false;

  btnReset.disabled = false;
  btnPlay.disabled = false;
  btnPause.disabled = true;

  syncUIToIndex(0);
});

yearSlider.addEventListener("input", () => {
  if (state.playing) pause();
  const i = +yearSlider.value;
  syncUIToIndex(i);
});

btnPlay.addEventListener("click", play);
btnPause.addEventListener("click", pause);
btnReset.addEventListener("click", reset);