import pandas as pd
import numpy as np
import json
import os
import urllib.request

RAW_PATH = 'data/owid_covid.csv'
SOURCE_URL = 'https://raw.githubusercontent.com/owid/covid-19-data/master/public/data/owid-covid-data.csv'

if not os.path.exists(RAW_PATH):
    print(f"Raw data not found locally — downloading from {SOURCE_URL} ...")
    os.makedirs('data', exist_ok=True)
    urllib.request.urlretrieve(SOURCE_URL, RAW_PATH)
    print("Download complete.")

print("Loading...")
df = pd.read_csv(RAW_PATH, low_memory=False,
    usecols=['iso_code','continent','location','date','total_cases','new_cases',
             'new_cases_smoothed','total_deaths','new_deaths','new_deaths_smoothed',
             'total_cases_per_million','total_deaths_per_million',
             'people_fully_vaccinated_per_hundred','total_vaccinations',
             'people_vaccinated_per_hundred','stringency_index','population',
             'icu_patients','hosp_patients','reproduction_rate'])

df['date'] = pd.to_datetime(df['date'])

# Exclude aggregate rows (World, continents, income groups) for country-level views
AGGREGATE_NAMES = {'World','International','European Union','Africa','Asia','Europe',
    'North America','South America','Oceania','High income','Low income',
    'Lower middle income','Upper middle income'}
countries = df[~df['location'].isin(AGGREGATE_NAMES) & df['continent'].notna()].copy()
world = df[df['location']=='World'].copy()

print(f"Date range: {df['date'].min()} to {df['date'].max()}")
print(f"Countries: {countries['location'].nunique()}")

# ---------- 1. World map snapshot (latest available per country) ----------
latest_idx = countries.sort_values('date').groupby('location').tail(1).index
latest = countries.loc[latest_idx].copy()

map_data = latest[['iso_code','location','continent','total_cases','total_deaths',
                    'total_cases_per_million','total_deaths_per_million',
                    'people_fully_vaccinated_per_hundred','population','date']].copy()
map_data = map_data.dropna(subset=['iso_code'])
map_data['date'] = map_data['date'].astype(str)
for c in ['total_cases','total_deaths','total_cases_per_million','total_deaths_per_million',
          'people_fully_vaccinated_per_hundred','population']:
    map_data[c] = map_data[c].fillna(0)

# ---------- 1b. Monthly map frames (for animated choropleth) ----------
cm = countries.dropna(subset=['iso_code']).copy()
cm['month'] = cm['date'].dt.to_period('M').astype(str)
cm_monthly = cm.sort_values('date').groupby(['iso_code','month']).last().reset_index()
map_frames_full = {}
for month, sub in cm_monthly.groupby('month'):
    map_frames_full[month] = sub[['iso_code','total_cases_per_million','total_deaths_per_million','people_fully_vaccinated_per_hundred']].fillna(0).round(1).to_dict('records')
map_months = sorted(map_frames_full.keys())
map_months_sampled = map_months[::2]
if map_months[-1] not in map_months_sampled:
    map_months_sampled.append(map_months[-1])
map_frames = {m: map_frames_full[m] for m in map_months_sampled}
print(f"Map frames: {len(map_frames)} months")


# ---------- 2. Global daily trend (smoothed) ----------
world_trend = world[['date','new_cases_smoothed','new_deaths_smoothed','total_cases','total_deaths','reproduction_rate']].copy()
world_trend = world_trend.dropna(subset=['new_cases_smoothed'])
world_trend['date'] = world_trend['date'].dt.strftime('%Y-%m-%d')

# ---------- 3. Top 12 countries by total cases - full time series for comparison chart ----------
top_countries = latest.nlargest(12, 'total_cases')['location'].tolist()
ts = countries[countries['location'].isin(top_countries)][['location','date','new_cases_smoothed','total_cases','new_deaths_smoothed','total_deaths']].copy()
ts = ts.dropna(subset=['new_cases_smoothed','date'])
# Downsample to weekly to keep payload small (date is still datetime here)
ts_list = []
for loc, sub in ts.groupby('location'):
    sub = sub.set_index('date').resample('W').last()
    sub['location'] = loc
    ts_list.append(sub.reset_index())
ts = pd.concat(ts_list, ignore_index=True)
ts['date'] = ts['date'].dt.strftime('%Y-%m-%d')
ts = ts.dropna(subset=['new_cases_smoothed'])

country_series = {}
for loc in top_countries:
    sub = ts[ts['location']==loc]
    country_series[loc] = {
        'dates': sub['date'].tolist(),
        'new_cases': sub['new_cases_smoothed'].round(0).tolist(),
        'total_cases': sub['total_cases'].round(0).tolist(),
        'new_deaths': sub['new_deaths_smoothed'].round(1).tolist(),
        'total_deaths': sub['total_deaths'].round(0).tolist()
    }

# ---------- 4. Vaccination progress - top 20 by population, latest ----------
vax = latest.dropna(subset=['people_fully_vaccinated_per_hundred'])
vax = vax[vax['population'] > 5_000_000].nlargest(20, 'people_fully_vaccinated_per_hundred')
vax_data = vax[['location','people_fully_vaccinated_per_hundred','population']].copy()
vax_data['people_fully_vaccinated_per_hundred'] = vax_data['people_fully_vaccinated_per_hundred'].round(1)

# ---------- 5. Continent rollups over time (monthly) ----------
cont = countries.dropna(subset=['continent']).copy()
cont['month'] = cont['date'].dt.to_period('M').astype(str)
cont_monthly = cont.groupby(['continent','month']).agg(
    new_cases=('new_cases','sum'),
    new_deaths=('new_deaths','sum')
).reset_index()
continent_series = {}
for c in cont_monthly['continent'].unique():
    sub = cont_monthly[cont_monthly['continent']==c].sort_values('month')
    continent_series[c] = {
        'months': sub['month'].tolist(),
        'new_cases': sub['new_cases'].round(0).tolist(),
        'new_deaths': sub['new_deaths'].round(0).tolist()
    }

# ---------- 6. Key global KPIs ----------
latest_world = world.sort_values('date').iloc[-1]
latest_world_cases = world['total_cases'].dropna()
latest_world_deaths = world['total_deaths'].dropna()
kpis = {
    'total_cases': float(latest_world_cases.iloc[-1]) if len(latest_world_cases) else 0,
    'total_deaths': float(latest_world_deaths.iloc[-1]) if len(latest_world_deaths) else 0,
    'countries_count': int(countries['location'].nunique()),
    'latest_date': str(latest_world['date'].date()),
    'peak_daily_cases': float(world_trend['new_cases_smoothed'].max()),
    'peak_daily_cases_date': world_trend.loc[world_trend['new_cases_smoothed'].idxmax(), 'date'],
    'avg_fully_vaccinated_pct': float(latest.dropna(subset=['people_fully_vaccinated_per_hundred'])['people_fully_vaccinated_per_hundred'].mean())
}

# ---------- 7. Stringency vs case correlation (per country snapshot, scatter) ----------
scatter = latest.dropna(subset=['total_cases_per_million'])[['location','continent','total_cases_per_million','total_deaths_per_million','population']].copy()
scatter = scatter[scatter['population'] > 1_000_000]
scatter_data = scatter[['location','continent','total_cases_per_million','total_deaths_per_million']].to_dict('records')

output = {
    'kpis': kpis,
    'map_data': map_data.to_dict('records'),
    'map_frames': map_frames,
    'map_months': sorted(map_frames.keys()),
    'world_trend': {
        'dates': world_trend['date'].tolist(),
        'new_cases': world_trend['new_cases_smoothed'].round(0).tolist(),
        'new_deaths': world_trend['new_deaths_smoothed'].round(1).tolist(),
        'reproduction_rate': world_trend['reproduction_rate'].fillna(0).round(2).tolist()
    },
    'country_series': country_series,
    'top_countries': top_countries,
    'vax_data': vax_data.to_dict('records'),
    'continent_series': continent_series,
    'scatter_data': scatter_data
}

with open('dashboard_data.json','w') as f:
    json.dump(output, f, default=str)

import os
print(f"\nOutput size: {os.path.getsize('dashboard_data.json')/1024:.0f} KB")
print(f"Map countries: {len(map_data)}")
print(f"KPIs: {kpis}")
