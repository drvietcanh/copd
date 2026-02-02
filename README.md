<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# GOLD 2026 COPD Assistant

Ứng dụng hỗ trợ đánh giá bệnh nhân COPD theo hướng dẫn GOLD 2026, sử dụng Google Gemini API để phân tích lâm sàng thông minh.

## Tính năng

- ✅ Đánh giá COPD theo GOLD 2026 (ABE classification)
- ✅ Phân tích AI tự động với Gemini 2.0 Flash
- ✅ Phát hiện phenotype (Eosinophilic, Emphysema, ACO)
- ✅ Dual mode: GP (Đa khoa) và Specialist (Chuyên khoa)
- ✅ Lưu trữ lịch sử với IndexedDB (không mất khi refresh)
- ✅ Error handling và retry logic
- ✅ Secure API Key qua Vercel serverless functions

## Run Locally

**Prerequisites:** Node.js 18+

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set environment variable (optional - có thể dùng API Key cá nhân trong app):
   ```bash
   # Tạo file .env.local
   GEMINI_API_KEY=your_api_key_here
   ```
   Lấy API Key tại: https://aistudio.google.com/app/apikey

3. Run the app:
   ```bash
   npm run dev
   ```

4. Build for production:
   ```bash
   npm run build
   ```

## Deploy lên Vercel

### Cách 1: Deploy qua Vercel CLI

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Deploy:
   ```bash
   vercel
   ```

3. Set environment variable trên Vercel Dashboard:
   - Vào Project Settings → Environment Variables
   - Thêm `GEMINI_API_KEY` với giá trị API key của bạn

### Cách 2: Deploy qua GitHub

1. Push code lên GitHub repository

2. Import project vào Vercel:
   - Vào https://vercel.com
   - Click "Add New Project"
   - Import từ GitHub repository

3. Set environment variable:
   - Trong quá trình import, thêm `GEMINI_API_KEY`
   - Hoặc vào Project Settings sau khi deploy

### Lưu ý khi deploy

- ✅ API route `/api/assess` sẽ tự động được tạo từ file `api/assess.ts`
- ✅ Environment variable `GEMINI_API_KEY` phải được set trên Vercel
- ✅ Nếu không set env var, user có thể nhập API Key cá nhân trong app (lưu localStorage)

## Deploy lên Netlify

1. New site from Git (chọn repo này)
2. Build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
3. Environment variables (Site settings → Environment variables):
   - `GEMINI_API_KEY`: API key của bạn
4. Repo đã có sẵn:
   - `netlify.toml` (publish + redirects)
   - Netlify Function: `netlify/functions/assess.ts`

Ghi chú: frontend vẫn gọi `/api/assess`, Netlify sẽ redirect sang `/.netlify/functions/assess`.

## Cấu trúc dự án

```
├── api/
│   └── assess.ts          # Vercel serverless function (secure API Key)
├── components/
│   ├── ErrorBoundary.tsx  # Error boundary cho React
│   ├── InputForm.tsx      # Form nhập liệu
│   ├── AnalysisResult.tsx # Hiển thị kết quả
│   ├── PatientList.tsx    # Lịch sử đánh giá
│   └── ApiKeyModal.tsx    # Modal quản lý API Key
├── services/
│   ├── geminiService.ts   # Service gọi Gemini API
│   └── storageService.ts  # IndexedDB storage
├── types.ts               # TypeScript types
└── App.tsx                # Component chính
```

## Cải thiện đã thực hiện (P0)

- ✅ Update Gemini model: `gemini-3-flash-preview` → `gemini-2.0-flash`
- ✅ Persistent storage: IndexedDB thay vì memory state
- ✅ Error handling: Retry logic với exponential backoff
- ✅ Secure API Key: Vercel serverless function
- ✅ Error Boundary: Catch React errors

## License

MIT
