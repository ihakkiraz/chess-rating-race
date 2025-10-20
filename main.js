
const state = {
  years: [],
  byYear: new Map(),
  frameIndex: 0,
  playing: false,
  timer: null,
  topN: 10
};

const btnPlay = document.getElementById("btnPlay");
const btnPause = document.getElementById("btnPause");
const btnReset = document.getElementById("btnReset");
const yearSlider = document.getElementById("yearSlider");
const yearLabel = document.getElementById("yearLabel");
const yearBadge = document.getElementById("yearBadge");
const svg = d3.select("#chart");

const margin = { top: 24, right: 16, bottom: 32, left: 160 };
const width  = svg.node().clientWidth || 900;
const height = svg.node().clientHeight || 500;
const innerW = width - margin.left - margin.right;
const innerH = height - margin.top - margin.bottom;

svg.attr("viewBox", [0, 0, width, height]);

const g = svg.append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);

const gx = g.append("g").attr("class", "axis x");
const gy = g.append("g").attr("class", "axis y");

const layerBars = g.append("g").attr("class", "layer-bars");
const layerText = g.append("g").attr("class", "layer-text");

const x = d3.scaleLinear().range([0, innerW]);
const y = d3.scaleBand().range([0, innerH]).padding(0.12);
const color = d3.scaleOrdinal(d3.schemeTableau10);

// helpers
function parseRow(d) {
  return {
    player: d.player,
    rating: +d.rating,
    year: +d.year
  };
}

function groupByYear(rows) {
  const by = d3.group(rows, d => d.year);
  const years = Array.from(by.keys()).sort((a, b) => a - b);
  return { years, byYear: by };
}

function frameData(year) {
  const rows = state.byYear.get(year) || [];
  return rows
    .filter(r => Number.isFinite(r.rating))
    .sort((a, b) => d3.descending(a.rating, b.rating))
    .slice(0, state.topN);
}

