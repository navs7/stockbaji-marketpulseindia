// SAMPLE DATASET. Illustrative only: dates are generated relative to today so the app always has
// something to show. Nothing here is a real announcement. The UI labels it "Sample data".
// Production: replace with SourceAdapter ingestion (see functions/ and PRD section 6).
import { addDays, startOfDay, withTime, nextTradingDay, prevTradingDay, istParts, atIst, isTradingDay } from '../lib/dates.js';

const NOW = new Date();
const T0 = startOfDay(NOW);
const D = (n, h = 0, m = 0) => withTime(addDays(T0, n), h, m);

export const SEED_AS_OF = NOW;

// ---------- Taxonomy ----------
export const INDUSTRIES = [
  { slug: 'banks', name: 'Banks', macro: 'Financial Services', blurb: 'Public and private sector lenders. Sensitive to RBI policy, credit growth and liquidity.' },
  { slug: 'nbfc', name: 'NBFCs and Housing Finance', macro: 'Financial Services', blurb: 'Non-bank lenders. Funding cost and regulatory circulars matter most.' },
  { slug: 'it-services', name: 'IT Services', macro: 'Information Technology', blurb: 'Export-oriented software services. Revenue mostly in USD.' },
  { slug: 'pharma', name: 'Pharmaceuticals', macro: 'Healthcare', blurb: 'Formulations and APIs, with a large export share.' },
  { slug: 'fmcg', name: 'FMCG', macro: 'Fast Moving Consumer Goods', blurb: 'Packaged foods, personal care and tobacco. Rural demand and input costs matter.' },
  { slug: 'auto', name: 'Automobiles', macro: 'Automobile and Auto Components', blurb: 'Passenger, commercial and two-wheeler makers. Monthly sales data move sentiment.' },
  { slug: 'metals', name: 'Metals and Mining', macro: 'Metals and Mining', blurb: 'Steel, aluminium and other metals. Global prices and China demand matter.' },
  { slug: 'oil-gas', name: 'Oil, Gas and Energy', macro: 'Oil, Gas and Consumable Fuels', blurb: 'Refining, marketing and upstream. Crude prices and fuel pricing policy matter.' },
  { slug: 'paints', name: 'Paints and Chemicals', macro: 'Chemicals', blurb: 'Crude-linked raw materials make margins sensitive to oil.' },
  { slug: 'capital-goods', name: 'Capital Goods and Infra', macro: 'Capital Goods', blurb: 'Engineering and construction. Government capex and order books drive news.' },
  { slug: 'cement', name: 'Cement', macro: 'Construction Materials', blurb: 'Regional demand, fuel costs and construction activity.' },
  { slug: 'jewellery', name: 'Jewellery and Consumer Durables', macro: 'Consumer Durables', blurb: 'Gold prices and festive demand shape the news flow.' },
  { slug: 'aviation', name: 'Aviation', macro: 'Services', blurb: 'Fuel cost and currency exposure are central.' },
  { slug: 'power', name: 'Power', macro: 'Utilities', blurb: 'Generation and transmission. Tariff orders and regulation matter.' },
  { slug: 'telecom', name: 'Telecom', macro: 'Telecommunication', blurb: 'Spectrum, tariffs and regulator decisions.' },
  { slug: 'real-estate', name: 'Real Estate', macro: 'Realty', blurb: 'Rates, regulation and launches.' },
];

const I = (symbol, name, industry, cap, indexes = ['NIFTY 50'], extra = {}) => ({ symbol, name, industry, cap, indexes, ...extra });
export const INSTRUMENTS = [
  I('RELIANCE', 'Reliance Industries', 'oil-gas', 'Large', ['NIFTY 50', 'SENSEX'], { bse: '500325', isin: 'INE002A01018' }),
  I('TCS', 'Tata Consultancy Services', 'it-services', 'Large', ['NIFTY 50', 'SENSEX'], { bse: '532540', isin: 'INE467B01029' }),
  I('INFY', 'Infosys', 'it-services', 'Large', ['NIFTY 50', 'SENSEX'], { bse: '500209', isin: 'INE009A01021' }),
  I('WIPRO', 'Wipro', 'it-services', 'Large'),
  I('HCLTECH', 'HCL Technologies', 'it-services', 'Large'),
  I('TECHM', 'Tech Mahindra', 'it-services', 'Large'),
  I('HDFCBANK', 'HDFC Bank', 'banks', 'Large', ['NIFTY 50', 'SENSEX'], { bse: '500180', isin: 'INE040A01034' }),
  I('ICICIBANK', 'ICICI Bank', 'banks', 'Large', ['NIFTY 50', 'SENSEX'], { bse: '532174', isin: 'INE090A01021' }),
  I('SBIN', 'State Bank of India', 'banks', 'Large', ['NIFTY 50', 'SENSEX'], { bse: '500112', isin: 'INE062A01020' }),
  I('KOTAKBANK', 'Kotak Mahindra Bank', 'banks', 'Large'),
  I('AXISBANK', 'Axis Bank', 'banks', 'Large'),
  I('BAJFINANCE', 'Bajaj Finance', 'nbfc', 'Large'),
  I('HINDUNILVR', 'Hindustan Unilever', 'fmcg', 'Large'),
  I('ITC', 'ITC', 'fmcg', 'Large', ['NIFTY 50', 'SENSEX'], { bse: '500875', isin: 'INE154A01025' }),
  I('NESTLEIND', 'Nestle India', 'fmcg', 'Large'),
  I('MARUTI', 'Maruti Suzuki India', 'auto', 'Large'),
  I('M&M', 'Mahindra & Mahindra', 'auto', 'Large'),
  I('BAJAJ-AUTO', 'Bajaj Auto', 'auto', 'Large'),
  I('SUNPHARMA', 'Sun Pharmaceutical Industries', 'pharma', 'Large'),
  I('DRREDDY', "Dr. Reddy's Laboratories", 'pharma', 'Large'),
  I('CIPLA', 'Cipla', 'pharma', 'Large'),
  I('TATASTEEL', 'Tata Steel', 'metals', 'Large'),
  I('JSWSTEEL', 'JSW Steel', 'metals', 'Large'),
  I('HINDALCO', 'Hindalco Industries', 'metals', 'Large'),
  I('ONGC', 'Oil and Natural Gas Corporation', 'oil-gas', 'Large'),
  I('BPCL', 'Bharat Petroleum Corporation', 'oil-gas', 'Large'),
  I('ASIANPAINT', 'Asian Paints', 'paints', 'Large'),
  I('LT', 'Larsen & Toubro', 'capital-goods', 'Large'),
  I('ULTRACEMCO', 'UltraTech Cement', 'cement', 'Large'),
  I('TITAN', 'Titan Company', 'jewellery', 'Large'),
  I('INDIGO', 'InterGlobe Aviation', 'aviation', 'Large', ['NIFTY 50']),
  I('NTPC', 'NTPC', 'power', 'Large'),
  I('POWERGRID', 'Power Grid Corporation of India', 'power', 'Large'),
  I('BHARTIARTL', 'Bharti Airtel', 'telecom', 'Large'),
];
export const NIFTY_POPULAR = ['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK', 'ITC', 'SBIN', 'BHARTIARTL', 'LT', 'MARUTI', 'SUNPHARMA', 'TITAN'];

export const FACTORS = [
  { slug: 'rbi-repo', name: 'RBI repo rate / MPC policy', industries: ['banks', 'nbfc', 'real-estate', 'auto'], note: 'Rate decisions change borrowing costs and credit demand. Lenders, housing and auto demand may be affected.' },
  { slug: 'inflation', name: 'Inflation (CPI, WPI)', industries: ['fmcg', 'banks', 'jewellery'], note: 'Inflation prints shape RBI policy and consumer spending. Input-cost-heavy sectors may be affected.' },
  { slug: 'usd-inr', name: 'USD/INR exchange rate', industries: ['it-services', 'pharma', 'oil-gas', 'aviation'], note: 'A move in the rupee may affect export earners and import-heavy businesses in opposite ways.' },
  { slug: 'brent', name: 'Brent crude oil', industries: ['oil-gas', 'paints', 'aviation'], note: 'Crude is a raw material or fuel cost for several sectors and an earnings driver for producers.' },
  { slug: 'fed-rate', name: 'US Fed funds rate', industries: ['it-services', 'banks'], note: 'US rate decisions may influence FPI flows, the dollar and IT demand outlook.' },
  { slug: 'fpi-dii', name: 'FPI / DII flows', industries: ['banks', 'it-services', 'capital-goods'], note: 'Institutional flows may move the broad market and large-cap financials in particular.' },
  { slug: 'monsoon', name: 'Monsoon and IMD forecasts', industries: ['fmcg', 'auto'], note: 'Monsoon quality may influence rural demand, agri inputs and two-wheelers.' },
  { slug: 'budget-gst', name: 'Union Budget and GST Council', industries: ['capital-goods', 'auto', 'fmcg', 'cement'], note: 'Tax and spending announcements can touch many sectors. Check the specific measures.' },
  { slug: 'gold', name: 'Gold price', industries: ['jewellery', 'nbfc'], note: 'Gold prices may affect jewellery demand and gold-loan lenders.' },
  { slug: 'metals-lme', name: 'Metal prices (LME)', industries: ['metals', 'capital-goods'], note: 'Global steel, aluminium and copper prices drive realisations for metal producers.' },
  { slug: 'china', name: 'China demand and policy', industries: ['metals', 'paints'], note: 'Chinese demand and stimulus can move global commodity prices.' },
  { slug: 'us-tariffs', name: 'US tariffs / trade policy', industries: ['it-services', 'pharma', 'auto'], note: 'Trade measures may affect exporters to the US. Impact depends on the product and the rate.' },
];

export const CATEGORIES = [
  { key: 'corporate', label: 'Corporate actions', color: '#0E5C4A', icon: 'building' },
  { key: 'ipo', label: 'IPO', color: '#B4540A', icon: 'rocket' },
  { key: 'results', label: 'Results', color: '#2F5DA8', icon: 'chart' },
  { key: 'stocknews', label: 'Stock news', color: '#7A4EA3', icon: 'newspaper' },
  { key: 'policy', label: 'Sector and policy', color: '#9A6B00', icon: 'scale' },
  { key: 'global', label: 'Global macro', color: '#B02A4B', icon: 'globe' },
  { key: 'indiamacro', label: 'India macro', color: '#1F7A8C', icon: 'landmark' },
  { key: 'learning', label: 'Learning', color: '#5A7D2B', icon: 'book' },
  { key: 'personal', label: 'Personal', color: '#5B6470', icon: 'user' },
];

// ---------- Corporate actions ----------
// kind: dividend | bonus | split | rights | buyback | agm | board
let caSeq = 0;
const CA = (symbol, kind, o) => ({ id: `ca${++caSeq}`, symbol, kind, status: 'announced', source: 'NSE', face: 1, ...o });
const exFrom = (n) => nextTradingDay(D(n - 1), 1); // first trading day on/after offset n

export const CORPORATE_ACTIONS = [
  CA('ITC', 'dividend', { sub: 'Interim', announced: D(-6, 17, 40), ex: exFrom(2), record: exFrom(3), pay: D(14), amount: 6.5, purpose: 'Interim dividend for the financial year', url: 'https://www.nseindia.com/companies-listing/corporate-filings-actions' }),
  CA('TCS', 'dividend', { sub: 'Interim', announced: D(-9, 18, 5), ex: exFrom(5), record: exFrom(6), pay: D(21), amount: 10, purpose: 'Interim dividend', url: 'https://www.bseindia.com/corporates/corporate_act.aspx' }),
  CA('HDFCBANK', 'dividend', { sub: 'Final', announced: D(-20, 17, 0), ex: exFrom(9), record: exFrom(10), pay: D(30), amount: 19.5, purpose: 'Final dividend, subject to shareholder approval', source: 'BSE', url: 'https://www.bseindia.com/corporates/corporate_act.aspx' }),
  CA('INFY', 'dividend', { sub: 'Interim', announced: D(-1, 16, 45), ex: exFrom(16), record: exFrom(17), pay: D(32), amount: 21, purpose: 'Interim dividend', url: 'https://www.nseindia.com/companies-listing/corporate-filings-actions' }),
  CA('SBIN', 'dividend', { sub: 'Interim', announced: D(-3, 18, 20), ex: exFrom(12), record: exFrom(13), pay: D(25), amount: 15.9, purpose: 'Interim dividend', url: 'https://www.nseindia.com/companies-listing/corporate-filings-actions' }),
  CA('NESTLEIND', 'dividend', { sub: 'Interim', announced: D(-11, 15, 30), ex: exFrom(20), record: exFrom(21), pay: D(35), amount: 10, purpose: 'Interim dividend', url: '#' }),
  CA('HINDUNILVR', 'dividend', { sub: 'Special', announced: D(0, 9, 10), ex: exFrom(24), record: exFrom(25), pay: D(40), amount: 18, purpose: 'Special dividend', url: '#' }),
  CA('WIPRO', 'bonus', { announced: D(-12, 17, 15), ex: exFrom(7), record: exFrom(8), ratio: '1:1', purpose: 'Bonus issue of equity shares', url: '#' }),
  CA('TITAN', 'split', { announced: D(-8, 16, 0), ex: exFrom(11), record: exFrom(12), ratio: '1 into 2', face: 'Rs 1 to Rs 0.50', purpose: 'Sub-division of equity shares', url: '#' }),
  CA('M&M', 'rights', { announced: D(-4, 17, 0), record: exFrom(6), open: D(10, 10), close: D(24, 17), ratio: '1 for 8', price: 780, purpose: 'Rights issue to raise capital', url: '#' }),
  CA('BPCL', 'buyback', { sub: 'Tender', announced: D(-2, 14, 0), record: exFrom(8), open: D(14, 10), close: D(21, 17), price: 760, purpose: 'Buyback of equity shares through tender offer', url: '#' }),
  CA('LT', 'agm', { announced: D(-18, 12), meeting: D(15, 15), evoteOpen: D(11, 9), purpose: 'Annual General Meeting through video conference', url: '#' }),
  CA('RELIANCE', 'agm', { announced: D(-25, 12), meeting: D(34, 14), evoteOpen: D(30, 9), purpose: 'Annual General Meeting', url: '#' }),
  CA('ICICIBANK', 'board', { announced: D(-5, 17), meeting: D(4, 14, 30), purpose: 'Board meeting to consider quarterly financial results', url: '#' }),
  CA('MARUTI', 'board', { announced: D(-7, 17), meeting: D(1, 12), purpose: 'Board meeting to consider quarterly financial results', url: '#' }),
  CA('SUNPHARMA', 'board', { announced: D(-3, 16), meeting: D(8, 15), purpose: 'Board meeting: financial results and interim dividend', url: '#' }),
  CA('BHARTIARTL', 'board', { announced: D(-2, 17), meeting: D(6, 13), purpose: 'Board meeting to consider fund raising', url: '#' }),
  CA('ONGC', 'dividend', { sub: 'Interim', announced: D(-14, 18), ex: exFrom(-3), record: exFrom(-2), pay: D(7), amount: 6, purpose: 'Interim dividend', url: '#', status: 'revised', revisedNote: 'Payment date revised from earlier filing' }),
  CA('AXISBANK', 'dividend', { sub: 'Final', announced: D(-30, 18), ex: exFrom(28), record: exFrom(29), pay: D(45), amount: 1, purpose: 'Final dividend', url: '#' }),
];

// ---------- IPOs (fictional companies, sample only) ----------
const IP = (slug, name, type, o) => ({ slug, name, type, ...o });
export const IPOS = [
  IP('nilgiri-fintech', 'Nilgiri Fintech Ltd', 'Mainboard', { sector: 'Financial Services', open: D(-1, 10), close: D(1, 17), upi: '5:00 PM', anchor: D(-2), allot: D(2), refund: D(3), credit: D(3), listing: D(4), exchange: 'NSE, BSE', band: [288, 304], lot: 49, size: 1840, fresh: 1200, ofs: 640, registrar: 'Sample Registrar Pvt Ltd', leads: 'Sample Capital, Demo Securities', gmp: [42, 40, 38, 41], gmpDays: -3, status: 'open',
    subs: { qib: 3.2, bnii: 6.9, snii: 9.4, retail: 2.1, emp: 1.4, total: 4.2 }, subHist: [0.4, 1.9, 4.2],
    objects: 'Capital for lending book expansion and technology upgrade. General corporate purposes.',
    fin: [['FY24', 812, 94, 610, 1420], ['FY25', 1046, 131, 742, 1780], ['FY26', 1390, 188, 930, 2210]] }),
  IP('kaveri-foods', 'Kaveri Foods and Beverages Ltd', 'Mainboard', { sector: 'FMCG', open: D(0, 10), close: D(2, 17), upi: '5:00 PM', anchor: D(-1), allot: D(3), refund: D(6), credit: D(6), listing: D(7), exchange: 'NSE, BSE', band: [140, 148], lot: 101, size: 920, fresh: 920, ofs: 0, registrar: 'Sample Registrar Pvt Ltd', leads: 'Demo Securities', gmp: [8, 9, 11], gmpDays: -2, status: 'open',
    subs: { qib: 0.6, bnii: 0.9, snii: 1.2, retail: 1.1, emp: 0.8, total: 0.9 }, subHist: [0.3, 0.9],
    objects: 'Debt repayment, new bottling line and working capital.',
    fin: [['FY24', 540, 31, 280, 410], ['FY25', 622, 39, 310, 460], ['FY26', 701, 52, 365, 470]] }),
  IP('orbit-logistics', 'Orbit Logistics Ltd', 'Mainboard', { sector: 'Services', open: D(5, 10), close: D(7, 17), upi: '5:00 PM', anchor: D(4), allot: D(8), refund: D(9), credit: D(9), listing: D(10), exchange: 'NSE, BSE', band: [455, 478], lot: 31, size: 2300, fresh: 1500, ofs: 800, registrar: 'Demo Registrar Ltd', leads: 'Sample Capital', gmp: [60, 55], gmpDays: -1, status: 'upcoming',
    subs: null, subHist: [], objects: 'Warehouse capex, fleet expansion and general corporate purposes.',
    fin: [['FY24', 1620, 120, 880, 960], ['FY25', 1980, 176, 1010, 1100], ['FY26', 2410, 244, 1240, 1180]] }),
  IP('sahyadri-power', 'Sahyadri Renewable Power Ltd', 'Mainboard', { sector: 'Power', open: D(9, 10), close: D(11, 17), upi: '5:00 PM', anchor: D(8), allot: D(14), refund: D(15), credit: D(15), listing: D(16), exchange: 'NSE, BSE', band: [95, 100], lot: 150, size: 3100, fresh: 3100, ofs: 0, registrar: 'Demo Registrar Ltd', leads: 'Demo Securities, Sample Capital', gmp: [], status: 'upcoming',
    subs: null, subHist: [], objects: 'Funding solar and wind project development; repayment of borrowings.',
    fin: [['FY24', 740, 18, 1960, 4120], ['FY25', 905, 41, 2210, 4560], ['FY26', 1180, 77, 2540, 5100]] }),
  IP('tarang-sme-tech', 'Tarang Software Solutions Ltd', 'SME', { sector: 'IT Services', open: D(1, 10), close: D(3, 17), upi: '5:00 PM', anchor: null, allot: D(4), refund: D(7), credit: D(7), listing: D(8), exchange: 'NSE Emerge', band: [66, 70], lot: 2000, size: 48, fresh: 48, ofs: 0, registrar: 'Sample Registrar Pvt Ltd', leads: 'Sample Capital', gmp: [10], gmpDays: -1, status: 'upcoming',
    subs: null, subHist: [], objects: 'Product development, sales expansion and working capital.',
    fin: [['FY24', 21, 2.1, 9, 6], ['FY25', 29, 3.4, 12, 5], ['FY26', 37, 4.8, 17, 4]] }),
  IP('indus-agro-sme', 'Indus Agro Exports Ltd', 'SME', { sector: 'Agri', open: D(-5, 10), close: D(-3, 17), upi: '5:00 PM', anchor: null, allot: D(-2), refund: D(0), credit: D(0), listing: D(1), exchange: 'BSE SME', band: [101, 107], lot: 1200, size: 62, fresh: 62, ofs: 0, registrar: 'Demo Registrar Ltd', leads: 'Demo Securities', gmp: [14, 15, 12], gmpDays: -1, status: 'closed',
    subs: { qib: 11.2, bnii: 48.1, snii: 52.0, retail: 29.4, emp: 0, total: 31.7 }, subHist: [1.2, 9.8, 31.7],
    objects: 'Cold-chain capacity and working capital.', fin: [['FY24', 88, 5.1, 21, 18], ['FY25', 112, 7.0, 28, 16], ['FY26', 140, 9.6, 38, 15]] }),
  IP('greenfield-reit', 'Greenfield Office REIT', 'Mainboard', { sector: 'REIT', open: D(-12, 10), close: D(-10, 17), upi: '5:00 PM', anchor: D(-13), allot: D(-9), refund: D(-8), credit: D(-8), listing: D(-7), exchange: 'NSE, BSE', band: [98, 100], lot: 150, size: 2500, fresh: 2500, ofs: 0, registrar: 'Sample Registrar Pvt Ltd', leads: 'Sample Capital', gmp: [], status: 'listed',
    subs: { qib: 2.4, bnii: 1.8, snii: 1.6, retail: 1.2, emp: 0, total: 1.9 }, subHist: [0.3, 1.1, 1.9], objects: 'Acquisition of commercial properties.', fin: [['FY24', 420, 140, 1900, 900], ['FY25', 465, 158, 2050, 880], ['FY26', 512, 171, 2200, 850]] }),
];

// ---------- Global / macro events ----------
// scheduled: has `at`; unscheduled: `created`.
const lastTuesday = (() => {
  const p = istParts(NOW);
  for (let m = p.m; m < p.m + 3; m++) {
    const last = new Date(Date.UTC(p.y, m + 1, 0)).getUTCDate();
    for (let d = last; d > 0; d--) {
      const dt = atIst(p.y, m, d, 15, 30);
      if (istParts(dt).dow === 2 && dt > NOW) return dt;
    }
  }
  return D(20, 15, 30);
})();
let geSeq = 0;
const GE = (o) => ({ id: `ge${++geSeq}`, scheduled: true, importance: 2, country: 'US', ...o });
export const GLOBAL_EVENTS = [
  GE({ name: 'US CPI (YoY)', country: 'US', importance: 3, at: D(1, 19), prev: '3.0%', cons: '2.9%', factors: ['inflation', 'fed-rate', 'usd-inr'], industries: ['it-services', 'banks'], why: 'US inflation shapes expectations for Fed rate decisions. That can move the dollar and foreign portfolio flows into Indian equities.' }),
  GE({ name: 'US FOMC rate decision', country: 'US', importance: 3, at: D(6, 23, 30), prev: '4.25%', cons: '4.25%', factors: ['fed-rate', 'usd-inr', 'fpi-dii'], industries: ['it-services', 'banks'], why: 'The Fed decision may influence global liquidity and the rupee. IT services and banks with foreign investor holdings are often discussed in this context.' }),
  GE({ name: 'RBI MPC policy decision', country: 'India', importance: 3, at: D(9, 10), prev: '5.50%', cons: '5.50%', factors: ['rbi-repo', 'inflation'], industries: ['banks', 'nbfc', 'real-estate', 'auto'], why: 'The repo rate sets the base cost of funds in the banking system. Lenders, housing and auto demand may be affected.' }),
  GE({ name: 'India CPI inflation (YoY)', country: 'India', importance: 3, at: D(8, 16), prev: '2.6%', cons: '2.8%', factors: ['inflation', 'rbi-repo'], industries: ['fmcg', 'banks'], why: 'Retail inflation is a key input to RBI policy. Consumer staples and lenders may be affected.' }),
  GE({ name: 'OPEC+ ministerial meeting', country: 'Global', importance: 3, at: D(3, 17, 30), prev: 'n/a', cons: 'n/a', factors: ['brent'], industries: ['oil-gas', 'paints', 'aviation'], why: 'Output decisions can move Brent crude. Oil marketing companies, paint makers and airlines may be affected differently.' }),
  GE({ name: 'China Caixin manufacturing PMI', country: 'China', importance: 2, at: D(2, 7), prev: '50.6', cons: '50.4', factors: ['china', 'metals-lme'], industries: ['metals', 'paints'], why: 'Chinese factory activity is a gauge of commodity demand and may influence metal prices.' }),
  GE({ name: 'US non-farm payrolls', country: 'US', importance: 3, at: D(4, 18, 30), prev: '151K', cons: '140K', factors: ['fed-rate', 'usd-inr'], industries: ['it-services'], why: 'Labour data feeds into Fed expectations, which can move the dollar and global risk appetite.' }),
  GE({ name: 'India GST collections (monthly)', country: 'India', importance: 2, at: D(5, 17), prev: '₹1.85 lakh cr', cons: 'n/a', factors: ['budget-gst'], industries: ['capital-goods', 'auto', 'fmcg'], why: 'GST collections are a read on consumption and formal-economy activity.' }),
  GE({ name: 'Monthly auto sales (SIAM / company releases)', country: 'India', importance: 2, at: D(7, 11), prev: 'n/a', cons: 'n/a', factors: ['monsoon'], industries: ['auto'], why: 'Dispatch numbers are an early read on demand for passenger vehicles, commercial vehicles and two-wheelers.' }),
  GE({ name: 'F&O monthly expiry', country: 'India', importance: 1, at: lastTuesday, prev: 'n/a', cons: 'n/a', factors: ['fpi-dii'], industries: [], why: 'Derivative expiry days can bring higher volatility in index and stock prices.' }),
  GE({ name: 'ECB rate decision', country: 'Euro area', importance: 2, at: D(12, 18), prev: '2.00%', cons: '2.00%', factors: ['usd-inr'], industries: ['it-services', 'pharma'], why: 'European rates affect the euro and demand outlook in a large export market for Indian IT and pharma.' }),
  GE({ name: 'MSCI index review effective', country: 'Global', importance: 2, at: D(17, 15, 30), prev: 'n/a', cons: 'n/a', factors: ['fpi-dii'], industries: [], why: 'Index changes can cause passive fund flows into or out of the affected stocks.' }),
  // Unscheduled
  { id: `ge${++geSeq}`, scheduled: false, importance: 3, country: 'Global', name: 'Brent crude jumps over 5% in a day', created: D(0, 7, 40), factors: ['brent', 'usd-inr'], industries: ['oil-gas', 'paints', 'aviation'], why: 'A sharp one-day rise in crude raises fuel and raw-material costs for several sectors, while upstream producers see the opposite. Check company filings for specifics.', source: 'Market data (sample)' },
  { id: `ge${++geSeq}`, scheduled: false, importance: 2, country: 'US', name: 'US announces revised tariff schedule for selected imports', created: D(-1, 22, 10), factors: ['us-tariffs', 'usd-inr'], industries: ['it-services', 'pharma', 'auto'], why: 'Trade measures may affect exporters to the US. The impact depends on the product, the rate and the effective date.', source: 'Official statement (sample)' },
  { id: `ge${++geSeq}`, scheduled: false, importance: 2, country: 'Global', name: 'Gold rallies to a fresh record in global trade', created: D(-2, 20), factors: ['gold'], industries: ['jewellery', 'nbfc'], why: 'Higher gold prices may affect jewellery demand and the loan-to-value position of gold-loan lenders.', source: 'Market data (sample)' },
];

// ---------- Articles ----------
let arSeq = 0;
const AR = (o) => ({ id: `ar${++arSeq}`, url: '#', ...o });
export const ARTICLES = [
  AR({ title: 'Monetary policy transmission in India: bank lending rates after repo changes', source: 'RBI Bulletin', tier: 'T1', topic: 'Banking', published: D(-4), mins: 18, tags: ['banks', 'rbi-repo'], summary: 'A central-bank study of how quickly policy rate changes reach loan and deposit rates, and how this differs between rate-linked and older loan books.' }),
  AR({ title: 'Retail participation in IPOs: allotment patterns across categories', source: 'SEBI working paper', tier: 'T1', topic: 'IPO', published: D(-9), mins: 22, tags: ['ipo'], summary: 'Examines how application and allotment outcomes differ between retail and institutional categories, with notes on oversubscription effects.' }),
  AR({ title: 'Understanding record date, ex-date and T+1 settlement', source: 'NSE Investor Education', tier: 'T1', topic: 'Basics', published: D(-30), mins: 6, tags: ['dividend'], summary: 'A plain-language walk-through of which trading day decides dividend eligibility and why the last day to buy comes before the ex-date.' }),
  AR({ title: 'Sector outlook: IT services demand under changing US policy', source: 'CRISIL Research', tier: 'T2', topic: 'IT Services', published: D(-3), mins: 12, tags: ['it-services', 'us-tariffs', 'fed-rate'], summary: 'Rating-agency view on deal pipelines, pricing and currency effects for large Indian IT exporters over the next two years.' }),
  AR({ title: 'Auto retail trends: festive season and rural demand', source: 'SIAM / industry data', tier: 'T2', topic: 'Autos', published: D(-6), mins: 9, tags: ['auto', 'monsoon'], summary: 'Industry-body data on registrations and inventory, with a note on how monsoon outcomes feed two-wheeler demand.' }),
  AR({ title: 'Crude oil and the Indian paint industry: how raw-material cost cycles work', source: 'ICRA', tier: 'T2', topic: 'Commodities', published: D(-12), mins: 8, tags: ['paints', 'brent'], summary: 'Explains the lag between crude price moves and input costs for decorative paint makers, and how pricing actions follow.' }),
  AR({ title: 'Rupee volatility: what it means for importers and exporters', source: 'Financial daily (sample)', tier: 'T3', topic: 'Currency', published: D(-1), mins: 5, tags: ['usd-inr'], summary: 'A news explainer on recent rupee moves and which sectors typically benefit or lose from them.' }),
  AR({ title: 'How to read a red herring prospectus in 10 minutes', source: 'Investor education desk (sample)', tier: 'T3', topic: 'Learning', published: D(-15), mins: 10, tags: ['ipo'], summary: 'Where to find objects of the issue, risk factors, promoter holding and financial tables in an RHP, and what to check first.' }),
  AR({ title: 'Global central banks: who is cutting and who is waiting', source: 'BIS Quarterly Review', tier: 'T1', topic: 'Global macro', published: D(-20), mins: 25, tags: ['fed-rate', 'usd-inr'], summary: 'Cross-country comparison of policy paths and spillovers to emerging-market currencies and capital flows.' }),
  AR({ title: 'Gold loans and household balance sheets', source: 'Rating agency note (sample)', tier: 'T2', topic: 'NBFC', published: D(-8), mins: 11, tags: ['nbfc', 'gold'], summary: 'Looks at growth in gold-backed lending, loan-to-value norms and sensitivity to price corrections.' }),
];

export const SOURCES = [
  { name: 'NSE corporate announcements', status: 'ok', lastOk: D(0, 1, 2), lagMin: 2, errPct: 0.2 },
  { name: 'BSE corporate announcements', status: 'ok', lastOk: D(0, 1, 1), lagMin: 3, errPct: 0.4 },
  { name: 'IPO subscription status', status: 'ok', lastOk: D(0, 0, 40), lagMin: 22, errPct: 1.1 },
  { name: 'Economic calendar API', status: 'warn', lastOk: D(-1, 22), lagMin: 640, errPct: 6.3 },
  { name: 'News RSS (whitelisted publishers)', status: 'ok', lastOk: D(0, 0, 55), lagMin: 8, errPct: 0.9 },
  { name: 'GMP aggregator', status: 'ok', lastOk: D(0, 0, 10), lagMin: 130, errPct: 0 },
];

export const REVIEW_QUEUE = [
  { id: 'rq1', what: 'WIPRO bonus 1:1', detail: 'NSE record date 8 days out; BSE filing shows a different date', conf: 0.72, reason: 'Parser disagreement NSE vs BSE' },
  { id: 'rq2', what: 'LT AGM', detail: 'E-voting start date missing in extracted PDF', conf: 0.81, reason: 'Missing date' },
  { id: 'rq3', what: 'BPCL buyback tender', detail: 'Buyback price extracted by LLM pass only', conf: 0.86, reason: 'LLM-only extraction below 0.9' },
];

export const SAMPLE_NOTICE = 'Sample data. Illustrative dates and figures, not real announcements.';

// Exchange-calendar milestones fall on trading days: snap sample offsets that landed on a weekend or holiday.
const snap = (d) => (d && !isTradingDay(d) ? withTime(nextTradingDay(d, 1), istParts(d).h, istParts(d).min) : d);
IPOS.forEach((p) => ['open', 'close', 'anchor', 'allot', 'refund', 'credit', 'listing'].forEach((k) => { p[k] = snap(p[k]); }));
CORPORATE_ACTIONS.forEach((a) => ['pay', 'meeting', 'open', 'close', 'evoteOpen'].forEach((k) => { if (a[k]) a[k] = snap(a[k]); }));
