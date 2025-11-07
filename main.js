
const state = {
  years: [],
  byYear: new Map(),
  frameIndex: 0,
  playing: false,
  timer: null,
  topN: 10,
  speedMultiplier: 1.0
};

const btnPlay     = document.getElementById("btnPlay");
const btnPause    = document.getElementById("btnPause");
const btnReset    = document.getElementById("btnReset");
const speedSlider = document.getElementById("speedSlider");
const speedLabel  = document.getElementById("speedLabel");
const yearSlider  = document.getElementById("yearSlider");
const yearInput   = document.getElementById("yearInput");
const yearError   = document.getElementById("yearError");
const yearBadge   = document.getElementById("yearBadge");
const svg         = d3.select("#chart");

const margin = { top: 24, right: 16, bottom: 32, left: 160 };
const width  = svg.node().clientWidth || 900;
const height = svg.node().clientHeight || 500;
const innerW = width - margin.left - margin.right;
const innerH = height - margin.top - margin.bottom;

svg.attr("viewBox", [0, 0, width, height]);

const g  = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
const defs = svg.append("defs");
const gx = g.append("g").attr("class", "axis x");
const gy = g.append("g").attr("class", "axis y");
const layerBars = g.append("g").attr("class", "layer-bars");
const layerText = g.append("g").attr("class", "layer-text");

// Create tooltip
const tooltip = d3.select("body").append("div")
  .attr("class", "tooltip")
  .style("position", "absolute")
  .style("visibility", "hidden")
  .style("background-color", "rgba(0, 0, 0, 0.8)")
  .style("color", "#fff")
  .style("padding", "8px 12px")
  .style("border-radius", "4px")
  .style("font-size", "14px")
  .style("pointer-events", "none")
  .style("z-index", "1000");

// X axis label
g.append("text")
  .attr("class", "axis-label x")
  .attr("x", innerW - 50)
  .attr("y", innerH - 10)
  .attr("text-anchor", "middle")
  .text("Rating (Adjusted Elo)");

const x = d3.scaleLinear().range([0, innerW]);
const y = d3.scaleBand().range([0, innerH]).padding(0.20);

// Federation flag colors (arrays of colors to create striped patterns)
// Direction refers to gradient direction: 'vertical' = horizontal stripes, 'horizontal' = vertical stripes
const federationColors = {
  'USSR': { colors: ['#C1272D', '#F9D616'], direction: 'vertical', proportions: [75, 25] },  // Deep Soviet red, Hammer & sickle gold (horizontal stripes)
  'RUS': { colors: ['#FFFFFF', '#0039A6', '#D52B1E'], direction: 'vertical' }, // White, Blue, Red (horizontal stripes)
  'USA': { colors: ['#B22234', '#FFFFFF', '#3C3B6E'], direction: 'vertical', proportions: [40, 30, 30] }, // Red, White, Blue (horizontal stripes)
  'ENG': { colors: ['#FFFFFF', '#CE1124'], direction: 'vertical' }, // White, Red (St. George's Cross - horizontal representation)
  'GER': { colors: ['#000000', '#DD0000', '#FFCE00'], direction: 'vertical' }, // Black, Red, Gold (horizontal stripes)
  'FRA': { colors: ['#0055A4', '#FFFFFF', '#EF4135'], direction: 'horizontal' }, // Blue, White, Red (vertical stripes)
  'IND': { colors: ['#FF9933', '#FFFFFF', '#138808'], direction: 'vertical' }, // Saffron, White, Green (horizontal stripes)
  'ESP': { colors: ['#C60B1E', '#FFC400', '#C60B1E'], direction: 'vertical' }, // Red, Yellow, Red (horizontal stripes)
  'ITA': { colors: ['#009246', '#FFFFFF', '#CE2B37'], direction: 'horizontal' }, // Green, White, Red (vertical stripes)
  'AUT': { colors: ['#ED2939', '#FFFFFF', '#ED2939'], direction: 'vertical' }, // Red, White, Red (horizontal stripes)
  'HUN': { colors: ['#CD2A3E', '#FFFFFF', '#436F4D'], direction: 'vertical' }, // Red, White, Green (horizontal stripes)
  'POL': { colors: ['#FFFFFF', '#DC143C'], direction: 'vertical' }, // White, Red (horizontal stripes)
  'CSK': { colors: ['#FFFFFF', '#11457E', '#D7141A'], direction: 'vertical' }, // White, Blue, Red (horizontal stripes with triangle)
  'YUG': { colors: ['#0C4076', '#FFFFFF', '#DE000F'], direction: 'vertical' }, // Blue, White, Red (horizontal stripes)
  'SWE': { colors: ['#006AA7', '#FECC00'], direction: 'vertical' }, // Blue, Yellow (Nordic cross - horizontal representation)
  'NED': { colors: ['#AE1C28', '#FFFFFF', '#21468B'], direction: 'vertical' }, // Red, White, Blue (horizontal stripes)
  'DEN': { colors: ['#C8102E', '#FFFFFF'], direction: 'vertical' }, // Red, White (Nordic cross - horizontal representation)
  'SUI': { colors: ['#FF0000', '#FFFFFF'], direction: 'vertical' }, // Red, White (Swiss cross - horizontal representation)
  'ISR': { colors: ['#FFFFFF', '#0038B8', '#FFFFFF'], direction: 'vertical' }, // White, Blue, White (horizontal stripes with Star of David)
  'UKR': { colors: ['#0057B7', '#FFD700'], direction: 'vertical' }, // Blue, Yellow (horizontal stripes)
  'ARM': { colors: ['#D90012', '#0033A0', '#F2A800'], direction: 'vertical' }, // Red, Blue, Orange (horizontal stripes)
  'BUL': { colors: ['#FFFFFF', '#00966E', '#D62612'], direction: 'vertical' }, // White, Green, Red (horizontal stripes)
  'CUB': { colors: ['#002A8F', '#FFFFFF', '#CF142B'], direction: 'vertical' }, // Blue, White, Red (horizontal stripes with triangle)
  'ARG': { colors: ['#74ACDF', '#FFFFFF', '#74ACDF'], direction: 'vertical' }, // Blue, White, Blue (horizontal stripes)
  'BRA': { colors: ['#009C3B', '#FFDF00', '#002776'], direction: 'vertical' }, // Green, Yellow, Blue (diamond on field - horizontal representation)
  'MEX': { colors: ['#006847', '#FFFFFF', '#CE1126'], direction: 'horizontal' }, // Green, White, Red (vertical stripes)
  'LAT': { colors: ['#9E3039', '#FFFFFF', '#9E3039'], direction: 'vertical' }, // Red, White, Red (horizontal stripes)
};

// Player to federation mapping
const playerFederations = new Map();

// Federation code to country name mapping
const federationNames = {
  'USSR': 'Soviet Union',
  'RUS': 'Russia',
  'USA': 'United States',
  'ENG': 'England',
  'GER': 'Germany',
  'FRA': 'France',
  'IND': 'India',
  'ESP': 'Spain',
  'ITA': 'Italy',
  'AUT': 'Austria',
  'HUN': 'Hungary',
  'POL': 'Poland',
  'CSK': 'Czechoslovakia',
  'YUG': 'Yugoslavia',
  'SWE': 'Sweden',
  'NED': 'Netherlands',
  'DEN': 'Denmark',
  'SUI': 'Switzerland',
  'ISR': 'Israel',
  'UKR': 'Ukraine',
  'ARM': 'Armenia',
  'BUL': 'Bulgaria',
  'CUB': 'Cuba',
  'ARG': 'Argentina',
  'BRA': 'Brazil',
  'MEX': 'Mexico',
  'LAT': 'Latvia',
};

// Federation code to flag emoji mapping
const federationFlags = {
  'USSR': '☭',
  'RUS': '🇷🇺',
  'USA': '🇺🇸',
  'ENG': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  'GER': '🇩🇪',
  'FRA': '🇫🇷',
  'IND': '🇮🇳',
  'ESP': '🇪🇸',
  'ITA': '🇮🇹',
  'AUT': '🇦🇹',
  'HUN': '🇭🇺',
  'POL': '🇵🇱',
  'CSK': '🇨🇿',
  'YUG': '🏴',
  'SWE': '🇸🇪',
  'NED': '🇳🇱',
  'DEN': '🇩🇰',
  'SUI': '🇨🇭',
  'ISR': '🇮🇱',
  'UKR': '🇺🇦',
  'ARM': '🇦🇲',
  'BUL': '🇧🇬',
  'CUB': '🇨🇺',
  'ARG': '🇦🇷',
  'BRA': '🇧🇷',
  'MEX': '🇲🇽',
  'LAT': '🇱🇻',
};

const color = (player) => {
  const federation = playerFederations.get(player);
  return federation ? `url(#pattern-${federation})` : '#888888';
};

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

  // Scale transition duration with speed multiplier to prevent overlap
  const transitionDuration = 700 / state.speedMultiplier;
  const t = d3.transition().duration(transitionDuration).ease(d3.easeCubicInOut);

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
    .style("opacity", 1)
    .on("end", function() {
      // Add tooltip handlers after transition
      d3.select(this)
        .on("mouseover", function(event, d) {
          const federation = playerFederations.get(d.player);
          const countryName = federation ? federationNames[federation] || federation : 'Unknown';
          const flag = federation ? (federationFlags[federation] || '') : '';
          const rank = d.worldRank || '—';
          tooltip.html(`
            <strong>${d.player}</strong><br/>
            ${flag} ${countryName}<br/>
            Rank: ${rank}<br/>
            Rating: ${Math.round(d.rating)}
          `)
          .style("visibility", "visible");
        })
        .on("mousemove", function(event) {
          tooltip
            .style("top", (event.pageY - 10) + "px")
            .style("left", (event.pageX + 10) + "px");
        })
        .on("mouseout", function() {
          tooltip.style("visibility", "hidden");
        });
    });

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
    .on("mouseover", function(event, d) {
      const federation = playerFederations.get(d.player);
      const countryName = federation ? federationNames[federation] || federation : 'Unknown';
      const flag = federation ? (federationFlags[federation] || '') : '';
      const rank = d.worldRank || '—';
      tooltip.html(`
        <strong>${d.player}</strong><br/>
        ${flag} ${countryName}<br/>
        Rank: ${rank}<br/>
        Rating: ${Math.round(d.rating)}
      `)
      .style("visibility", "visible");
    })
    .on("mousemove", function(event) {
      tooltip
        .style("top", (event.pageY - 10) + "px")
        .style("left", (event.pageX + 10) + "px");
    })
    .on("mouseout", function() {
      tooltip.style("visibility", "hidden");
    })
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
}


// helpers for animation
function syncUIToIndex(i) {
  state.frameIndex = i;
  yearSlider.value = String(i);
  yearInput.value = state.years[i];
  yearError.textContent = ""; // Clear any errors
  render(state.years[i]);
}

function play() {
  if (state.playing || !state.years.length) return;
  state.playing = true;

  btnPlay.disabled = true;
  btnPause.disabled = false;
  enableResetButton();

  const frameDuration = 900 / state.speedMultiplier; // base 900ms adjusted by multiplier
  state.timer = d3.interval(() => {
    const next = Math.min(state.frameIndex + 1, state.years.length - 1);
    syncUIToIndex(next);
    if (next >= state.years.length - 1) pause(); // auto-stop at end
  }, frameDuration);
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

  // Reset speed to 1.0x
  state.speedMultiplier = 1.0;
  speedSlider.value = "1";
  speedLabel.textContent = "Speed: 1.0x";

  syncUIToIndex(0);

  // Disable reset button after resetting
  btnReset.disabled = true;
}

function enableResetButton() {
  btnReset.disabled = false;
}

Promise.all([
  d3.csv("data/chess_ratings.csv", parseRow),
  d3.csv("data/world_champions.csv", d => ({ player: d.Player, dates: d.Dates })),
  d3.csv("data/players_federation.csv", d => ({
    player: d.Player,
    federation: d.Federation
  }))
]).then(([rows, champs, federations]) => {
  // Map players to their federations
  federations.forEach(d => {
    if (d.player && d.federation) {
      playerFederations.set(d.player, d.federation);
    }
  });

  // Create SVG gradient definitions for each federation (hard stops for color blocks)
  Object.entries(federationColors).forEach(([fed, config]) => {
    const { colors, direction, proportions } = config;
    const gradient = defs.append("linearGradient")
      .attr("id", `pattern-${fed}`)
      .attr("x1", direction === 'horizontal' ? "0%" : "0%")
      .attr("y1", direction === 'horizontal' ? "0%" : "0%")
      .attr("x2", direction === 'horizontal' ? "100%" : "0%")
      .attr("y2", direction === 'horizontal' ? "0%" : "100%");

    const numColors = colors.length;

    // Use custom proportions if provided, otherwise equal splits
    let cumulativePercent = 0;

    colors.forEach((color, i) => {
      let startPercent, endPercent;

      if (proportions && proportions[i]) {
        startPercent = cumulativePercent;
        endPercent = cumulativePercent + proportions[i];
        cumulativePercent = endPercent;
      } else {
        startPercent = (i / numColors) * 100;
        endPercent = ((i + 1) / numColors) * 100;
      }

      // Create hard stops for solid color blocks (no gradients)
      gradient.append("stop")
        .attr("offset", `${startPercent}%`)
        .attr("stop-color", color);

      gradient.append("stop")
        .attr("offset", `${endPercent}%`)
        .attr("stop-color", color);
    });
  });

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

  if (!years.length) return;

  yearSlider.min = 0;
  yearSlider.max = years.length - 1;
  yearSlider.value = 0;
  yearSlider.disabled = false;

  yearInput.min = years[0];
  yearInput.max = years[years.length - 1];
  yearInput.value = years[0];
  yearInput.disabled = false;

  btnReset.disabled = true; // Initially disabled
  btnPlay.disabled = false;
  btnPause.disabled = true;

  syncUIToIndex(0);
});

speedSlider.addEventListener("input", () => {
  const rawValue = +speedSlider.value;
  // Round to nearest 0.25
  const multiplier = Math.round(rawValue * 4) / 4;
  state.speedMultiplier = multiplier;
  speedLabel.textContent = `Speed: ${multiplier.toFixed(2)}x`;

  enableResetButton();

  // If playing, restart with new speed
  if (state.playing) {
    pause();
    play();
  }
});

yearSlider.addEventListener("input", () => {
  if (state.playing) pause();
  const i = +yearSlider.value;
  syncUIToIndex(i);
  enableResetButton();
});

yearInput.addEventListener("change", () => {
  if (state.playing) pause();

  const targetYear = parseInt(yearInput.value, 10);
  const minYear = state.years[0];
  const maxYear = state.years[state.years.length - 1];

  // Validate input
  if (isNaN(targetYear) || yearInput.value === "") {
    yearError.textContent = "Please enter a valid year";
    yearInput.value = state.years[state.frameIndex];
    return;
  }

  if (targetYear < minYear || targetYear > maxYear) {
    yearError.textContent = `Year must be between ${minYear} and ${maxYear}`;
    yearInput.value = state.years[state.frameIndex];
    return;
  }

  // Clear any previous errors
  yearError.textContent = "";

  enableResetButton();

  // Find the index of this year in the years array
  const index = state.years.indexOf(targetYear);

  if (index !== -1) {
    syncUIToIndex(index);
  } else {
    // If exact year not found, find closest year
    const closest = state.years.reduce((prev, curr) =>
      Math.abs(curr - targetYear) < Math.abs(prev - targetYear) ? curr : prev
    );
    const closestIndex = state.years.indexOf(closest);
    syncUIToIndex(closestIndex);
    yearError.textContent = `Year ${targetYear} not in data. Showing ${closest}`;
  }
});

btnPlay.addEventListener("click", play);
btnPause.addEventListener("click", pause);
btnReset.addEventListener("click", reset);