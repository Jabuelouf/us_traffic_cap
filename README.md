# US Traffic Accident Analysis


## Data-Driven Insights for Road Safety | Department of Transportation

### Quick Links

| Resource | Link |
|----------|------|
| **Presentation** | <a href="https://jabuelouf.github.io/us_traffic_cap/" target="_blank">View Presentation</a> |
| **Interactive Dashboard** | <a href="https://public.tableau.com/app/profile/jonathan8167/viz/US_Traffic_Cap/TrafficAnalysisDashboard" target="_blank">View on Tableau Public</a> |
| **Run the Analysis** | <a href="https://colab.research.google.com/github/jabuelouf/US_Traffic_Cap/blob/main/US_Traffic_Accident_Analysis.ipynb" target="_blank"><img src="https://colab.research.google.com/assets/colab-badge.svg" alt="Open In Colab"></a> |

---

## Executive Summary

Analysis of **7.7 million US traffic accidents** (2016-2023) reveals three actionable insights:

| Finding | Key Statistic | Recommendation |
|---------|---------------|----------------|
| **Temporal Clustering** | Rush hours = 33.5% of accidents | Time-based enforcement (7-9 AM, 3-6 PM) |
| **Weather Impact** | Rain shows 23.5% severe rate vs 16.9% fair | Weather-responsive warning systems |
| **Geographic Concentration** | Top 5 states = 50.9% of accidents | Targeted infrastructure investment |

---

## Project Overview

The Department of Transportation (DOT) needs data-driven guidance to reduce traffic accidents. This analysis identifies **when**, **where**, and **under what conditions** accidents are most likely to occur and be severe.

### Key Questions Answered

1. **When** do accidents cluster? Peak hours, days, and seasons
2. **What conditions** increase severity? Weather and environmental factors  
3. **Where** should resources focus? Geographic hotspots

---

## View the Results

### Interactive Dashboard
Explore the data yourself with filters for time, weather, and location.

<a href="https://public.tableau.com/app/profile/jonathan8167/viz/US_Traffic_Cap/TrafficAnalysisDashboard" target="_blank"><strong>Open Tableau Dashboard</strong></a>

### Full Analysis
The complete Jupyter notebook with code, visualizations, and statistical analysis.

<a href="https://colab.research.google.com/github/Jabuelouf/US_Traffic_Cap/blob/main/US_Traffic_Accident_Analysis.ipynb" target="_blank"><strong>Open in Google Colab</strong></a> - No setup required, runs in browser

---

## Running the Analysis

### Option 1: Google Colab (Recommended)
Click the "Open in Colab" badge above. The notebook includes code to download the dataset automatically.

### Option 2: Local Setup

#### Using pip (requirements.txt)
```bash
# Clone the repository
git clone https://github.com/Jabuelouf/us_traffic_cap.git
cd us_traffic_cap

# Create a virtual environment (recommended)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies from requirements.txt
pip install -r requirements.txt

# Download dataset from Kaggle
# https://www.kaggle.com/datasets/sobhanmoosavi/us-accidents
# Place US_Accidents_March23.csv in the Data/ folder

# Run Jupyter
jupyter notebook US_Traffic_Accident_Analysis.ipynb
```

#### Using conda (environment.yml) - Optional
```bash
# Clone the repository
git clone https://github.com/Jabuelouf/us_traffic_cap.git
cd us_traffic_cap

# Create conda environment from environment.yml
conda env create -f environment.yml

# Activate the environment
conda activate us_traffic_analysis

# Download dataset from Kaggle
# https://www.kaggle.com/datasets/sobhanmoosavi/us-accidents
# Place US_Accidents_March23.csv in the Data/ folder

# Run Jupyter
jupyter notebook US_Traffic_Accident_Analysis.ipynb
```

---

## Data Source

**US Accidents (March 2023)**  
- **Records:** 7,728,394 accidents  
- **Coverage:** 49 US states  
- **Timeframe:** February 2016 - March 2023  
- **Source:** <a href="https://www.kaggle.com/datasets/sobhanmoosavi/us-accidents" target="_blank">Kaggle</a>

---

## Methodology

This analysis follows **CRISP-DM** (Cross-Industry Standard Process for Data Mining):

1. **Business Understanding** - DOT's need for actionable safety insights
2. **Data Understanding** - 7.7M records across 49 states
3. **Data Preparation** - Feature engineering, cleaning, categorization
4. **Analysis** - Statistical testing (Chi-square, Cramer's V, Relative Risk)
5. **Evaluation** - Validated patterns with effect sizes
6. **Deployment** - Dashboard, notebook, and presentation

---

## Key Findings

### Temporal Patterns
- **Peak Hours:** 7-9 AM and 3-6 PM account for 33.5% of accidents (2,588,624 accidents in peak hours)
- **Peak Day:** Friday (peak day for accidents)
- **Peak Month:** December (758,783 incidents, 9.8% of total)

### Weather Impact
| Condition | Severe Rate |
|-----------|-------------|
| Rain | 23.5% |
| Cloudy | 21.7% |
| Snow/Ice | 19.5% |
| Fair | 16.9% |

**Volume Distribution:** Fair (44.1%) and Cloudy (40.9%) together account for 85% of all accidents. Adverse weather (Rain, Snow/Ice, Fog/Haze) represents 12% of total volume but warrants targeted interventions.

**Relative Risk:** Adverse weather = 1.252x higher severe rate than fair weather (Adverse group average: 21.16% vs Fair: 16.91%)

### Geographic Concentration
| Rank | State | % of Total |
|------|-------|------------|
| 1 | California | 22.5% |
| 2 | Florida | 11.4% |
| 3 | Texas | 7.5% |
| 4 | South Carolina | 5.0% |
| 5 | New York | 4.5% |

**Top 5 States:** Account for 3,934,979 accidents (50.9% of total)

**Top 3 Cities:** Miami (186,768), Houston (169,428), Los Angeles (156,491) - Combined: 512,687 accidents (6.6% of total)

---

## Recommendations

### 1. Time-Based Enforcement Programs
Deploy additional traffic patrol and safety messaging during peak accident windows.
- **Target:** 7-9 AM and 3-6 PM weekdays
- **Metric:** Accident count during target hours

### 2. Weather-Responsive Warning Systems  
Activate dynamic message signs and speed advisories when high-risk conditions are forecasted.
- **Target:** Rain, Snow/Ice conditions
- **Metric:** Severe accident rate during adverse weather

### 3. Hotspot Infrastructure Investment
Prioritize road safety improvements in high-concentration areas.
- **Target:** CA, FL, TX metropolitan areas
- **Metric:** Before/after accident counts

---

## Technologies

- **Python** - pandas, numpy, matplotlib, seaborn, scipy
- **Tableau** - Interactive dashboard
- **Jupyter** - Analysis notebook

---

## Author

**Jonathan Abuelouf**  
Data Science Capstone Project | January 2026

---

## License

This project is for educational purposes. Dataset provided by Sobhan Moosavi via Kaggle.
