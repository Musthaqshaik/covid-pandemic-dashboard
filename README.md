# Global COVID-19 Pandemic Dashboard

An interactive, animated dashboard built on the official Our World in Data COVID-19 dataset — 243 countries, January 2020 through August 2024. Built to demonstrate the visualization techniques that separate a portfolio piece from a tutorial: an animated choropleth, multi-metric toggling, and cross-country comparison, all in a single self-contained file.

**[➡️ Open the live interactive dashboard](dashboard.html)** *(download the repo and open `dashboard.html` in any browser — no install needed)*



## The signature visual: an animated world map

Press play and watch case density, death rate, or vaccination coverage spread across the globe month by month (Jan 2020 → Aug 2024). This single interaction does more to communicate the shape of the pandemic than any static chart could — which is the point: it's the kind of visual choice that makes a reviewer stop scrolling.

## Key insights

1. **The pandemic moved in three distinct global waves**, visible directly on the animated map — an initial 2020 wave concentrated in early-affected regions, the Delta wave through mid-2021, and the much larger Omicron wave at the start of 2022 that dwarfs the earlier peaks in case volume.
2. **Peak global daily cases hit ~6.3M** around December 25, 2022 — far higher than any 2020 or 2021 peak, despite vaccination already being widespread, illustrating how transmissibility (Omicron) outpaced immunity at a population level.
3. **Vaccination coverage varied enormously by country** even among large nations — the leaderboard shows several countries cleared 90%+ fully vaccinated while others among the top 20 (by population) sit well below that, a gap with real public-health implications.
4. **Cases-per-million vs. deaths-per-million reveals very different outcomes per region** — some countries with very high case counts per capita have comparatively low death rates per capita and vice versa, a divergence worth digging into by continent in the scatter chart (testing capacity, healthcare access, age demographics, and reporting standards are all plausible drivers).

## What's in this dashboard

- **Animated choropleth world map** — toggle between Cases/million, Deaths/million, and Vaccinated % with a play button and timeline scrubber
- **4 KPI cards**: total cases, total deaths, peak daily cases, average vaccination rate
- **Global daily trend** (smoothed cases & deaths, dual-axis)
- **Reproduction rate (R) timeline**
- **Country comparison chart** with clickable chips — toggle any of the top 12 most-affected countries on/off
- **Monthly new cases by continent** (stacked bar)
- **Vaccination leaderboard** — top 20 countries (5M+ population) by % fully vaccinated
- **Cases vs. deaths scatter plot**, colored by continent

## Methodology

- **Data cleaning**: filtered out aggregate rows (World, continents, income brackets) to isolate country-level data; coerced dates; handled nulls in vaccination/reproduction-rate fields which aren't reported by every country at every point
- **Map animation**: built monthly snapshots (last reported value per country per month) rather than daily, both to keep the file size reasonable and because daily granularity doesn't add visual information at world-map scale
- **Time series downsampling**: country comparison lines are resampled to weekly to keep the chart legible and the embedded payload small
- **Reproducibility**: `process.py` automatically downloads the full official dataset from OWID's GitHub repo if it isn't present locally — no manual data wrangling needed to reproduce

## Tools used

- **Python** (pandas) for cleaning, monthly aggregation, and downsampling
- **Plotly.js** for the animated choropleth map (true geographic projection, no external geojson file needed — uses ISO-3 country codes)
- **Chart.js** for trend lines, comparisons, stacked bars, and the scatter plot
- Designed to be reproduced natively in **Power BI** or **Tableau** — see `BUILD_IN_POWERBI_TABLEAU.md`

## Repo structure

```
covid-dashboard/
├── README.md
├── dashboard.html                  ← open this to view the live dashboard
├── dashboard.js                    ← map animation + chart logic
├── embedded_data.js                ← pre-aggregated data embedded for the dashboard
├── process.py                      ← downloads raw data + builds dashboard_data.json
├── dashboard_data.json             ← cleaned/aggregated output of process.py
├── BUILD_IN_POWERBI_TABLEAU.md     ← steps to recreate this in Power BI / Tableau
└── images/
    └── (add your screenshot/GIF here)
```

## Data source

[Our World in Data COVID-19 dataset](https://github.com/owid/covid-19-data) — the same dataset used by major news outlets and public health bodies throughout the pandemic, updated through August 2024 (OWID's last full update before transitioning to a lighter-weight tracking cadence).
