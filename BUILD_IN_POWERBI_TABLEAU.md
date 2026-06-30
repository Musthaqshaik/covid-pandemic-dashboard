# Recreating this dashboard in Power BI / Tableau

## 1. Load the data

Download the source CSV from [OWID's GitHub repo](https://github.com/owid/covid-19-data/blob/master/public/data/owid-covid-data.csv) (or let `process.py` download it for you, then use the same file).

**Power BI:** Home → Get Data → Text/CSV → select the file. In Power Query: filter out `location` values like "World", "Asia", "European Union", etc. (these are OWID's pre-aggregated rollups, not individual countries) by filtering where `continent` is not null.

**Tableau:** Connect → Text File → select the file. Add a filter: `Continent` is not null, to exclude the rollup rows the same way.

## 2. The choropleth map (the signature visual)

**Tableau** has the best native support for this:
- Drag `iso_code` to Detail, change its geographic role to "ISO 3166-1 Alpha-3 Code" (right-click the field → Geographic Role)
- Drag `total_cases_per_million` to Color
- Drag `date` to the **Pages** shelf — this automatically gives you a play/scrub control that animates the map exactly like the one in this dashboard
- Use a sequential color palette (blue or red works well against a dark background)

**Power BI:**
- Use the **ArcGIS Maps** or **Filled Map** visual, with `iso_code`/`location` as Location and `total_cases_per_million` as Color saturation
- For animation, add `date` (bucketed to month) to the **Play Axis** field of a Power BI **animated scatter/bubble** visual, or use the **Play Axis** custom visual from AppSource for filled maps

## 3. Other chart specs

| Chart | Type | Fields |
|---|---|---|
| Global Trend | Dual-axis line | X: date, Y: new_cases_smoothed, new_deaths_smoothed |
| Reproduction Rate | Line | X: date, Y: reproduction_rate (World row only) |
| Country Comparison | Multi-line | X: date (weekly), Y: new_cases_smoothed, Series: location (filter to top 12 by total_cases) |
| Continent Monthly Cases | Stacked bar | X: month, Y: SUM(new_cases), Color: continent |
| Vaccination Leaderboard | Horizontal bar | Y: location, X: people_fully_vaccinated_per_hundred, filter population > 5M, top 20 |
| Cases vs Deaths Scatter | Scatter | X: total_cases_per_million, Y: total_deaths_per_million, Color: continent, filter population > 1M |

## 4. Filters / interactivity

- Add a **date range slider** as a global filter across all sheets/pages
- Add **Continent** and **Country** as slicers (Power BI) or filters applied to all worksheets (Tableau)
- For the country comparison chart, use a **multi-select filter** so users can toggle individual countries on/off, matching the chip-toggle behavior in the HTML version

## 5. Publish

- **Tableau**: Server menu → Publish to Tableau Public — the Pages-shelf map animation publishes natively and works beautifully on Tableau Public
- **Power BI**: Publish to Power BI Service, then File → Publish to Web (data here is public health data, safe to publish)

Once published, add the live link to your README — this is the single highest-impact addition for a dashboard project, since an animated public map is genuinely fun to interact with and likely to get shared.
