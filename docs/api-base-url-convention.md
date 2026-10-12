# Convention: URL ของ API

API ของแอปทุก service ใช้ `apiUrl()` จาก `src/services/api-base-url.ts` เป็นจุดเดียวในการประกอบ URL และ `GlobalApi` ก็ใช้ค่าเดียวกัน (พร้อม re-export helper นี้) ห้ามกำหนด `localhost`, `/api` หรืออ่าน `VITE_API_BASE_URL` ซ้ำในแต่ละ service

| สภาพแวดล้อม | ค่าเริ่มต้นของ `API_BASE_URL` | ตัวอย่าง `apiUrl("quant/runs")` |
| --- | --- | --- |
| `npm run dev` | `http://localhost:3000` | `http://localhost:3000/quant/runs` |
| `npm run build` / deploy | `/api` | `/api/quant/runs` |

หาก backend อยู่ที่อื่น ให้ตั้ง `VITE_API_BASE_URL` ก่อนเริ่ม dev server หรือก่อน build เช่น `VITE_API_BASE_URL=https://example.com/api` ค่านี้มีลำดับเหนือค่าเริ่มต้นทั้งสองโหมด และ Vite ฝังค่าลงใน bundle ตอน build; เปลี่ยน environment ของ server หลัง build แล้วไม่เปลี่ยน URL ใน frontend ที่ deploy ไปแล้ว

ตัวอย่าง service ที่ต้องควบคุม request เอง:

```ts
import { apiUrl } from "./api-base-url";

const response = await fetch(apiUrl("investments/list"), {
  headers: { Authorization: `Bearer ${token}` },
});
```

หากใช้ HTTP method ที่ `GlobalApi` มีอยู่แล้ว ให้เรียก `new GlobalApi().authGet(...)`, `authPostJson(...)` หรือ `authDelete(...)` โดยส่ง endpoint แบบไม่มี base path เช่น `"crypto-news/123"` ทั้ง `GlobalApi` และ `apiUrl()` ใช้ค่า `API_BASE_URL` เดียวกัน

เส้นทาง `/api` ใน production ต้องถูก reverse proxy ส่งต่อไป backend โดยตัด prefix `/api` ออกเหมือน proxy ใน `vite.config.ts` ส่วนการเรียก URL ที่ backend ออกให้โดยตรง เช่น presigned upload URL และการเรียกผู้ให้บริการภายนอก เช่น Twelve Data ไม่ใช้ base URL ของ API แอป

`src/services/quant-analysis.ts` มีเฉพาะสูตรคำนวณและไม่เรียก HTTP; request ของ Quant Lab อยู่ใน `src/services/market-data.service.ts`
