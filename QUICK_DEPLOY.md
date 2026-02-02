# 🚀 Quick Deploy Guide

## Option 1: Deploy ngay (Khuyến nghị)

### Windows:
```bash
# Chạy script tự động
deploy.bat
```

### Mac/Linux:
```bash
# Cài Vercel CLI (nếu chưa có)
npm install -g vercel

# Deploy
vercel --prod
```

---

## Option 2: Deploy từng bước

### Bước 1: Cài đặt Vercel CLI
```bash
npm install -g vercel
```

### Bước 2: Đăng nhập
```bash
vercel login
```

### Bước 3: Deploy
```bash
# Lần đầu (sẽ hỏi cấu hình)
vercel

# Production
vercel --prod
```

### Bước 4: Set Environment Variable
1. Vào https://vercel.com/dashboard
2. Chọn project vừa deploy
3. Settings → Environment Variables
4. Thêm:
   - **Key**: `GEMINI_API_KEY`
   - **Value**: API key của bạn
   - **Environments**: Chọn tất cả (Production, Preview, Development)

### Bước 5: Redeploy
```bash
vercel --prod
```

---

## Option 3: Deploy qua GitHub

1. Push code lên GitHub
2. Vào https://vercel.com
3. Add New Project → Import từ GitHub
4. Vercel tự động detect và deploy
5. Set `GEMINI_API_KEY` trong Settings

---

## ✅ Kiểm tra sau deploy

1. Truy cập URL được cung cấp
2. Test các chức năng:
   - ✅ Nhập form
   - ✅ Submit và xem kết quả
   - ✅ Export PDF
   - ✅ Xem history
   - ✅ Filter và search
   - ✅ Statistics

---

## 🔧 Troubleshooting

**Lỗi: "GEMINI_API_KEY không được cấu hình"**
→ Set environment variable trong Vercel Dashboard và redeploy

**Lỗi: "Module not found"**
→ Chạy `npm install` trước khi deploy

**Lỗi: Build failed**
→ Check console logs trong Vercel Dashboard

---

## 📝 Notes

- Nếu không set `GEMINI_API_KEY`, user vẫn có thể dùng app bằng cách nhập API key cá nhân trong Settings
- API route `/api/assess` sẽ tự động được tạo
- History được lưu trong IndexedDB (client-side)
