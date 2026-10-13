# Quant Lab — หุ้น / ETF สหรัฐฯ

เข้าเมนู **Quant Lab** บนหน้า Home หรือ `/quant-analysis` หลังเข้าสู่ระบบ

## เริ่มใช้งาน

1. รัน backend `bun-sso` ที่มี Quant API และ migration ด้านล่าง; frontend ใช้ URL ตาม [API base URL convention](api-base-url-convention.md) (dev: `http://localhost:3000`, build/deploy: `/api`)
2. กรอกหุ้น/ETF สหรัฐฯ ทีละตัว เช่น CWEN, PFE, VOO, VTI, QQQM เลือกประวัติ 252, 504 หรือ 1,000 วัน แล้วกด **เก็บราคาตัวนี้** หากต้องดึงข้อมูลใหม่ ใช้ [Twelve Data API key](https://twelvedata.com/account/api-keys) ในหน้า Quant Lab หรือตั้ง `TWELVEDATA_API_KEY` ใน environment ของ backend
3. เลือก A และ B จาก **คลังราคาของฉัน** แล้วกด **วิเคราะห์คู่จาก DB** ขั้นนี้อ่านราคาใน PostgreSQL เท่านั้น ไม่เรียก Twelve Data และเลือกจับคู่ใหม่จากหุ้นเดิมได้เรื่อย ๆ
4. ผลวิเคราะห์เริ่มต้นจะบันทึกใน PostgreSQL อัตโนมัติ; ดู Pair trading, SD & Mean reversion หรือ Backtest ได้
5. เมื่อต้องการราคาใหม่ให้เลือกหุ้นตัวนั้นและติ๊ก **อัปเดตราคา** ก่อนกดเก็บราคา; การอัปเดตนี้ใช้โควตา API ส่วนการจับคู่ไม่ใช้
6. เมื่อปรับพารามิเตอร์ กด **บันทึกผลวิเคราะห์** เพื่อเก็บเป็นรอบใหม่ และใช้ **ประวัติผลวิเคราะห์ของฉัน** เปิดผลเดิมหลังรีเฟรชหรือกลับมาใช้งานครั้งถัดไป

Frontend → `/quant/market-data` ของ backend → PostgreSQL → Twelve Data เฉพาะเมื่อยังไม่มีข้อมูลเพียงพอหรือสั่งอัปเดต
Backend เรียก `https://api.twelvedata.com/time_series` ด้วย `interval=1day`, `country=United States`, `adjust=all` และ `end_date` ไม่เกินวันก่อนหน้าตามเวลา New York
เก็บ key ที่กรอกจากหน้าเว็บใน React state และส่งผ่าน request body ไป backend เท่านั้น ไม่เก็บ key ใน DB, localStorage, sessionStorage หรือ bundle
ไม่ส่ง token ของแอปไป Twelve Data; production ต้องให้ frontend/backend ใช้ HTTPS
เปิดผลวิเคราะห์ที่บันทึกแล้วได้โดยไม่ใช้ provider key และไม่เรียก Twelve Data อีก

หน้า **พอร์ตการลงทุน** ใช้ราคาปิดวันล่าสุดจาก snapshot ในคลัง Quant Lab เมื่อ ticker ตรงกันและรายการเป็นหุ้นต่างประเทศหรือกองทุนสกุล USD โดยแสดงวันที่ของราคากำกับไว้ มูลค่าพอร์ต กำไร/ขาดทุน และ CSV ใช้ราคาเดียวกัน หากไม่พบ snapshot หรือโหลดไม่ได้ จะใช้ราคาที่กรอกเองในรายการนั้นแทน การกด **โหลดราคา Quant Lab** ในหน้าพอร์ตอ่านคลังข้อมูลอีกครั้งโดยไม่เรียก Twelve Data; หากต้องการราคาวันใหม่ ให้สั่ง **อัปเดตราคา** ของ ticker ใน Quant Lab ก่อน

## ฐานข้อมูลและ API

เพิ่มใน repository `bun-sso`:

| ตาราง | ข้อมูลที่เก็บ |
| --- | --- |
| `quant_market_snapshots` | ผู้ใช้, ticker, provider, ช่วงเวลา, วิธีปรับราคา, จำนวนวันที่ร้องขอ, วันที่ cutoff, fingerprint และเวลาที่ดึง/ตรวจข้อมูล |
| `quant_daily_prices` | ราคาเปิด/ปิดรายวัน อ้างอิง snapshot; primary key `(snapshot_id, date)` ป้องกันวันซ้ำ |
| `quant_backtest_runs` | ชื่อผลวิเคราะห์, ผู้ใช้, snapshot สองขา, พารามิเตอร์, รุ่นสูตร, ผลสถิติ/รายการเทรด/เส้นทุน และเวลาบันทึก |

ราคาเป็น immutable snapshot: refresh แล้วข้อมูลเปลี่ยนจะสร้างชุดใหม่ ไม่แก้ราคาที่อ้างอิงโดยผลเดิม
ข้อมูลเดิมที่ fingerprint ตรงกันจะใช้ snapshot เดิมและอัปเดตเวลาตรวจเท่านั้น
ข้อมูลราคาแยกตามผู้ใช้และ ticker; ถ้ามี snapshot ที่ร้องขอจำนวนวันไว้เท่ากันหรือมากกว่า จะใช้ซ้ำได้ข้ามวันโดยไม่เรียก provider และแสดงวันที่เก็บข้อมูลไว้ให้เห็น
checkbox **อัปเดตราคา** บังคับดึงใหม่; ถ้าต้องการช่วงย้อนหลังที่ยาวกว่าที่เก็บไว้ ระบบต้องดึงใหม่และใช้ key
ราคาเก่าที่เก็บไว้ยังเปิดใช้ได้แม้ไม่มี provider key; ผลเดิมพร้อมชุดราคาเดิมเปิดได้จากประวัติ

- `POST /quant/market-data`: โหลดจาก DB หรือ fetch แล้วเก็บ snapshot/ราคาใน transaction
- `GET /quant/market-data`: รายชื่อ ticker และ snapshot ล่าสุดในคลังของผู้ใช้
- `GET /quant/market-data/:id`: อ่านชุดราคาเดิมจาก DB ตาม ID โดยไม่เรียก provider
- `POST /quant/runs`: รับเฉพาะ snapshot IDs และพารามิเตอร์; backend คำนวณผลเองและบันทึก
- `GET /quant/runs`: ประวัติ 50 รายการล่าสุดของผู้ใช้
- `GET /quant/runs/:id`: เปิดผลและชุดราคาเดิมของผู้ใช้

ทุก route อยู่ใต้ `tokenChecker` guard เดิม และทุก query กรองเจ้าของข้อมูล
Composite foreign keys ป้องกัน backtest ของผู้ใช้หนึ่งอ้างอิง snapshot ของอีกคนในระดับฐานข้อมูลด้วย

รันเฉพาะ migration ของโมดูล (เพิ่ม 3 ตาราง ไม่เรียก legacy migration queue):

```sh
# ใน bun-sso
bun scripts/verify-quant-db.ts  # ทดสอบใน transaction แล้ว rollback ข้อมูลทดสอบ
bun run migrate:quant          # สร้างตารางแบบ additive; เรียกซ้ำได้
bun run dev
```

Schema: `db/quant-analysis.schema.ts`; SQL: `migrations/quant/001_quant_persistence.sql`
อย่าใช้ legacy migration ทั้งชุดแทนคำสั่งเฉพาะนี้โดยไม่ตรวจ pending migrations เดิม

Calculation engine และ provider ใน `bun-sso/services/quant/core/` เป็น deployment artifacts ที่สร้างจาก TypeScript ของ frontend
หากแก้สูตร/provider ให้เพิ่มรุ่น `QUANT_ENGINE_VERSION` และรัน `npm run sync:quant-backend` จาก `x-webapp` แล้ว deploy ทั้งสอง repository
Backend จึงใช้สูตรต้นฉบับเดียวกันและ deploy ได้โดยไม่ต้องอ้างอิงไฟล์นอก repository
เมื่อเปิดผลเก่า UI แสดงผลที่บันทึกจริง; หากเปลี่ยนพารามิเตอร์ จะคำนวณใหม่และบันทึกเป็นรายการใหม่

ผลลัพธ์ใช้ข้อมูลจาก API จริง ไม่มีการเติมข้อมูลสังเคราะห์เมื่อ API ล้มเหลว
ระบบแสดงข้อผิดพลาดสำหรับ key/สิทธิ์ข้อมูล, โควตา, timeout, ticker ไม่ตรง, ราคาไม่ถูกต้อง และข้อมูลไม่เพียงพอ
รองรับ USD และเขตเวลา America/New_York; จับคู่ตามวันที่ตรงกัน และแจ้งจำนวนวันที่ถูกตัดออก
เป็นข้อมูลย้อนหลังรายวัน ไม่ใช่หน้าราคา streaming

## สิ่งที่คำนวณ

| ส่วน | วิธี |
| --- | --- |
| Mean / SD | Rolling mean และ sample SD (n − 1) จาก W วันก่อนหน้า ไม่รวมวันปัจจุบัน |
| Z-score | (ค่าปัจจุบัน − rolling mean) / rolling SD; SD ใกล้ศูนย์ให้ผลว่าง |
| Volatility | Sample SD ของ log returns ล่าสุด W ช่วง × √252 |
| Hedge ratio | OLS: A = α + βB จากช่วงข้อมูลแรกที่ระบุ; β เป็นจำนวนหุ้น B ต่อ A |
| Spread | A − α − βB โดยตรึง α และ β ตลอดช่วงทดสอบ |
| Correlation | Pearson ของ log returns ในช่วงสร้างโมเดล |
| Cointegration | Engle–Granger แบบ constant; residual ADF ไม่ใส่ constant, lag=1 คงที่; เทียบ MacKinnon 2010 critical value 5% สำหรับ N=2 |
| I(1) screening | ADF แบบ constant, lag=1: ไม่ reject unit root ในระดับราคา และ reject ในผลต่างครั้งแรก; เป็นเพียงการตรวจความสอดคล้องกับสมมติฐาน |
| Half-life | OLS AR(1) ของ spread ช่วงสร้างโมเดล; ln(0.5)/ln(φ) เมื่อ 0 < φ < 1 |

ตัวกรองตั้งต้นให้จำลองซื้อขายเมื่อ cointegration ผ่าน, I(1) screening ของทั้งสองสินทรัพย์สอดคล้อง และ β > 0
สามารถปิดตัวกรองสถิติเพื่อศึกษาเปรียบเทียบ แต่ β ที่ไม่เป็นบวกยังไม่รองรับในโมเดล long/short นี้
ไม่มีการใช้ correlation แทน cointegration และไม่มีการแสดง p-value ที่ไม่ได้คำนวณ

## Backtest

- แบ่งข้อมูลตามลำดับเวลา: ช่วงสร้างโมเดลเริ่มต้น 60% และช่วงทดสอบ 40%; ต้องมีอย่างน้อย 60 / 30 วันตามลำดับ
- สัญญาณจากราคาปิดในช่วงทดสอบ ใช้เปิด/ปิดสถานะที่ราคาเปิดของวันถัดไป
- Z ≥ entry: short A / long βB; Z ≤ −entry: long A / short βB; ไม่เปิดเมื่อ |Z| ≥ stop
- ออกจากสถานะเมื่อกลับถึงเกณฑ์ exit ตามทิศทางของรอบนั้น, หลุด stop, ครบวันถือ, SD ใช้ไม่ได้ หรือทุนหมด
- ณ เวลาเข้า มูลค่า absolute ของสองขารวมกันเท่ากับทุนปัจจุบัน รองรับหุ้นเศษส่วนและถือจำนวนหุ้นคงที่จนปิดรอบ
- หัก fee และ slippage ตามมูลค่าของทั้งสองขา ทั้งตอนเข้าและออก; ค่ายืมหุ้นใช้มูลค่าฝั่ง short ณ ราคาปิดก่อนหน้าและจำนวนวันปฏิทิน/365
- Mark-to-market ทุกวัน, ปิดสถานะค้างที่ราคาปิดวันสุดท้าย และคิดต้นทุนออกด้วย
- รายงาน net return, maximum drawdown จาก daily equity, Sharpe (risk-free=0), win rate, ต้นทุนรวม และรายการซื้อขาย
- ข้อมูลที่ไม่ตรงวันถูกตัดออก จึงนับ lookback/holding period ตามวันข้อมูลที่ตรงกัน; annualization ใช้สมมติฐาน 252 ช่วงต่อปี

ราคาที่ปรับ corporate actions เป็น proxy สำหรับการวิจัย ไม่ใช่ราคาที่ซื้อขายได้ในอดีต
ยังไม่จำลอง dividend cash flow แยก, margin call, ดอกเบี้ยเงินสด, ภาษี, สภาพคล่อง หรือข้อจำกัดการยืมหุ้น
Stop ตรวจรายวันและออกวันถัดไป จึงอาจขาดทุนเกินระดับที่คาด และการขาดทุนฝั่ง short อาจเกินเงินเริ่มต้นได้
การเลือกคู่/เปลี่ยนพารามิเตอร์จากผล test ซ้ำ ๆ ทำให้ overfit ได้ แม้โค้ดจะไม่อ่านราคาอนาคตสำหรับสัญญาณก็ตาม

## ส่วนที่แนะนำให้เพิ่มต่อ

1. **Walk-forward validation**: เลื่อนช่วงสร้างโมเดลและทดสอบตามเวลา พร้อมชุดข้อมูลสุดท้ายที่ไม่ใช้เลือกพารามิเตอร์
2. **Pair screener + multiple-testing correction**: คัดคู่หลายตัวพร้อมปรับเกณฑ์ทดสอบ และติดตามความเสถียรของ β/cointegration
3. **Position sizing / portfolio risk**: จำกัด exposure รายสินทรัพย์, ความเสี่ยงรวมจากคู่ที่ซ้ำกัน และขาดทุนต่อพอร์ต
4. **Paper trading / alerts**: บันทึกสัญญาณตามเวลาจริงและเปรียบเทียบ fill จริงกับ backtest
5. **งานข้อมูลเพิ่มเติม**: การอัปเดตราคาตามเวลาที่ผู้ใช้กำหนด, corporate-action events แยก, retention policy และ pagination ของประวัติ

## ตรวจสอบ

```sh
npm run build
npm run test:quant
npx eslint src/components/quant-analysis/QuantAnalysis.tsx src/services/market-data.service.ts src/services/twelve-data.ts src/services/quant-analysis.ts
# ใน bun-sso
bun run test:quant
```

ชุดทดสอบใช้ Node.js ที่รองรับ TypeScript type stripping (Node 22.18+ / 24+) ไม่ต้องติดตั้ง test framework เพิ่ม
มี golden fixture เทียบกับ statsmodels สำหรับ OLS, ADF, cointegration critical value และ half-life
ใช้ `tests/fixtures/generate-quant-reference.py` สร้าง reference ใหม่ใน Python environment ที่มี numpy / statsmodels
ทดสอบ execution ของสองขา, ต้นทุนไปกลับ, ค่ายืมข้ามวันหยุด, ไม่มี look-ahead, วันที่ไม่ตรงกัน, zero SD และ API error cases ด้วย

อ้างอิง: [Twelve Data historical data](https://support.twelvedata.com/en/articles/5214728-getting-historical-data), [API](https://twelvedata.com/docs#time-series), [statsmodels coint](https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.coint.html), [ADF](https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.adfuller.html), [MacKinnon critical values](https://www.statsmodels.org/stable/generated/statsmodels.tsa.adfvalues.mackinnoncrit.html)
