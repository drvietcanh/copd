# Hướng dẫn Deploy lên Vercel

## Cách 1: Deploy qua Vercel CLI (Khuyến nghị)

### Bước 1: Cài đặt Vercel CLI
```bash
npm install -g vercel
```

### Bước 2: Đăng nhập Vercel
```bash
vercel login
```

### Bước 3: Deploy
```bash
# Deploy lần đầu (sẽ hỏi các câu hỏi)
vercel

# Deploy production
vercel --prod
```

### Bước 4: Set Environment Variable
Sau khi deploy, vào Vercel Dashboard:
1. Vào Project Settings → Environment Variables
2. Thêm biến:
   - **Key**: `GEMINI_API_KEY`
   - **Value**: API key của bạn (lấy tại https://aistudio.google.com/app/apikey)
   - **Environment**: Production, Preview, Development (chọn tất cả)

### Bước 5: Redeploy
Sau khi set env var, cần redeploy:
```bash
vercel --prod
```

Hoặc vào Vercel Dashboard → Deployments → Click "Redeploy"

---

## Cách 2: Deploy qua GitHub (Tự động)

### Bước 1: Push code lên GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-github-repo-url>
git push -u origin main
```

### Bước 2: Import vào Vercel
1. Vào https://vercel.com
2. Click "Add New Project"
3. Import từ GitHub repository
4. Vercel sẽ tự động detect:
   - Framework: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`

### Bước 3: Set Environment Variable
Trong quá trình import hoặc sau khi import:
1. Vào Project Settings → Environment Variables
2. Thêm `GEMINI_API_KEY`
3. Redeploy

---

## Cách 3: Deploy qua Vercel Dashboard

1. Vào https://vercel.com
2. Click "Add New Project"
3. Upload folder hoặc drag & drop
4. Vercel sẽ tự động build và deploy

---

## Kiểm tra sau khi deploy

### 1. Kiểm tra API Route
Truy cập: `https://your-app.vercel.app/api/assess`
- Nếu thấy lỗi về API Key → Đã set env var chưa?
- Nếu thấy CORS error → Check headers trong vercel.json

### 2. Kiểm tra Frontend
Truy cập: `https://your-app.vercel.app`
- App có load không?
- Có thể nhập form không?
- Có thể gọi API không?

### 3. Test chức năng
- ✅ Nhập form và submit
- ✅ Xem kết quả phân tích
- ✅ Export PDF
- ✅ Xem history
- ✅ Filter và search
- ✅ Xem statistics

---

## Troubleshooting

### Lỗi: "GEMINI_API_KEY không được cấu hình"
**Giải pháp**: 
- Kiểm tra Environment Variable đã set chưa
- Redeploy sau khi set env var
- Check env var có đúng tên `GEMINI_API_KEY` không

### Lỗi: "Module not found" khi build
**Giải pháp**:
```bash
npm install
npm run build
```

### Lỗi: API route không hoạt động
**Giải pháp**:
- Kiểm tra file `api/assess.ts` có đúng format không
- Check Vercel Functions logs trong Dashboard
- Đảm bảo `@vercel/node` đã install

### Lỗi: CORS
**Giải pháp**:
- Check `vercel.json` có headers CORS
- Đảm bảo API route trả về đúng headers

---

## Environment Variables cần thiết

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | Optional* | Gemini API key. Nếu không set, user có thể nhập trong app |

*Nếu không set, user vẫn có thể dùng app bằng cách nhập API key cá nhân trong Settings.

---

## Build Configuration

Vercel sẽ tự động detect:
- **Framework**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

---

## Custom Domain (Optional)

Sau khi deploy, có thể thêm custom domain:
1. Vào Project Settings → Domains
2. Add domain
3. Follow DNS instructions

---

## Monitoring

Vercel Dashboard cung cấp:
- Deployment logs
- Function logs (API routes)
- Analytics
- Error tracking

---

## Quick Deploy Script

Tạo file `deploy.sh`:
```bash
#!/bin/bash
echo "🚀 Deploying to Vercel..."
vercel --prod
echo "✅ Deploy complete!"
```

Chạy:
```bash
chmod +x deploy.sh
./deploy.sh
```
