<div align="center">

# 👁️ Gig-Foundry: Smart Observatory for Digital Platform Workers

**🏆 Hackathon Winner Project — GASTAT Data Innovation Hackathon 2026 🇸🇦**

*Developers: Nada Alharbi & Azzam Alzahrani*
*Acknowledgments: Rashed Alkhaldi*

*What if we could see what official records miss?*

*The Statistical Blind Spot Meets Digital Reality*

---

</div>

## 📌 Vision & Objective

> **An estimated +2,000,000 digital workers — mostly invisible in official records.**

The labor market is undergoing a radical shift towards the digital platform economy: ride-hailing drivers, delivery captains, and freelancers building businesses behind screens. The paradox is that most of these workers are **unregistered** in official insurance systems, creating a massive **statistical gap** and a **blind spot** that hinders decision-makers from understanding the true size of this growing economy.

**"Gig-Foundry"** is not just a traditional dashboard — it is a **sovereign operating system** and a **Digital Twin** of the flexible labor market in Saudi Arabia. It performs:

- 🔍 **Sensing:** Tracking the "digital footprints" of workers across 9 non-traditional data sources.
- 🧠 **Inference:** Automatically classifying workers by sector, activity, and geographic location.
- ⚖️ **Comparison:** Providing a live comparison between official statistics and the observed digital reality.
- 🎯 **Support:** Empowering decision-makers to formulate smart inclusion and incentive policies aligned with **Saudi Vision 2030**.

---

## 🔬 Scientific Methodologies

This project is a practical application of modern scientific and economic methodologies used globally to bridge statistical gaps.

1. **Big Data as Economic Indicators:** Using search trends (Google Trends) to monitor real-time growth and demand, predicting economic shifts months before official reports.
2. **Signaling Theory in Labor Markets:** Scraping open platforms (LinkedIn, Salla, Maroof) because digital behavior is a strong "signal" of actual economic activity.
3. **Digital Triangulation:** Cross-referencing platform data, Last-Mile mobility maps, and NLP analysis to ensure reliable estimates and reduce error margins.
4. **Digital Twin of the Labor Market:** Moving beyond static numbers to a dynamic extrapolation model that scales digital samples to estimate the total market size, exposing the "Statistical Blind Spot."

---

## 📊 9 Data Sources Powering the Observatory

To achieve true digital triangulation, the system ingests data from 9 diverse, non-traditional sources. The architecture uses a Cached/Live approach for high performance.

| Data Source | Purpose & Utilization |
|:---|:---|
| 🔵 **LinkedIn** | Scrapes freelancer profiles to extract job titles, skills, and geographic distribution. |
| 🛒 **Salla** | Analyzes e-commerce stores to identify freelance practitioner documents and trade volume. |
| 🏪 **Maroof** | Tracks and verifies e-commerce and freelance practitioners registered in the local ecosystem. |
| 📈 **Google Trends** | Measures temporal search demand for keywords related to gig apps, delivery, and freelancing. |
| 📱 **App Store Intelligence** | Analyzes delivery app footprints, estimating driver counts via download and review metrics. |
| 🗺️ **Last-Mile Maps (POIs & Traffic)** | Analyzes Points of Interest (Cloud Kitchens, Logistics Hubs) combined with live traffic data to estimate delivery worker density. |
| 🐦 **Twitter (X)** | Conducts sentiment analysis on gig economy discussions, worker rights, and regulatory policies. |
| ⭐ **App Reviews** | Scrapes app store reviews to evaluate service quality, worker pressure, and operational pace. |
| 🏠 **Airbnb** | Monitors real estate brokers and independent agents working in the flexible real estate sector (hosters). |

---

## ⚙️ Technical Requirements

| Requirement | Details |
|:---|:---|
| **Environment** | Node.js (v18 or newer) |
| **Package Manager** | npm |
| **Tech Stack** | `React`, `TypeScript`, `Vite`, `Recharts`, `Leaflet`, `TailwindCSS`, `Groq API (Llama 3)` |

---

## 🛠️ How to Run

### Option 1: Live Platform (No Installation)

> 🌐 **[https://smart-observatory-for-digital-platform.onrender.com/](https://smart-observatory-for-digital-platform.onrender.com/)**

### Option 2: Local Development

#### 1. Clone & Install
```bash
git clone https://github.com/Nada-MH/GASTAT-Data-Innovation-Hackathon-GigEconomy-Observatory.git
cd GASTAT-Data-Innovation-Hackathon-GigEconomy-Observatory
npm install
npx playwright install
```

#### 2. Environment Variables
Create a `.env.local` file in the root directory:
```env
APIFY_API_TOKEN="your_apify_token_here"
GOOGLE_MAPS_API_KEY="your_google_maps_key_here"
GROQ_API_KEY="your_groq_key_here"
TWITTER_API_IO_KEY="your_twitter_api_io_key_here"
MAROOF_API_KEY="your_maroof_api_key_here"
```

#### 3. Start the Server
```bash
npm run dev
```
Open your browser to `http://localhost:5173`.

---

<div align="center">


</div>
