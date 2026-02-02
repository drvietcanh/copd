# 🚀 Deploy Ngay - Hướng dẫn từng bước

## Bước 1: Đăng nhập Vercel

Mở PowerShell/CMD và chạy:
```bash
vercel login
```

Sẽ hiện link như: `https://vercel.com/oauth/device?user_code=XXXX-XXXX`
1. Copy link này
2. Mở browser và paste vào
3. Đăng nhập Vercel (hoặc tạo account nếu chưa có)
4. Xác nhận trong browser
5. Quay lại terminal, nhấn ENTER

---

## Bước 2: Deploy

Sau khi login thành công, chạy:
```bash
vercel --prod
```

Lần đầu sẽ hỏi:
- **Set up and deploy?** → Nhấn `Y`
- **Which scope?** → Chọn account của bạn
- **Link to existing project?** → Nhấn `N` (tạo project mới)
- **Project name?** → Nhấn ENTER (dùng tên mặc định) hoặc đặt tên
- **Directory?** → Nhấn ENTER (dùng `./`)
- **Override settings?** → Nhấn `N`

Vercel sẽ tự động:
- Detect framework: Vite
- Build project
- Deploy

---

## Bước 3: Set Environment Variable

Sau khi deploy xong, Vercel sẽ cho URL như: `https://your-app.vercel.app`

**Quan trọng**: Cần set `GEMINI_API_KEY`:

1. Vào https://vercel.com/dashboard
2. Click vào project vừa deploy
3. Vào **Settings** → **Environment Variables**
4. Click **Add New**
5. Điền:
   - **Key**: `GEMINI_API_KEY`
   - **Value**: API key của bạn (lấy tại https://aistudio.google.com/app/apikey)
   - **Environments**: Chọn tất cả (Production, Preview, Development)
6. Click **Save**

---

## Bước 4: Redeploy

Sau khi set env var, cần redeploy:
```bash
vercel --prod
```

Hoặc vào Vercel Dashboard → Deployments → Click **Redeploy**

---

## ✅ Kiểm tra

1. Truy cập URL được cung cấp
2. Test app:
   - Nhập form
   - Submit và xem kết quả
   - Export PDF
   - Xem history
   - Filter và search
   - Statistics

---

## 🔧 Nếu gặp lỗi

**"GEMINI_API_KEY không được cấu hình"**
→ Đã set env var chưa? Đã redeploy chưa?

**"Build failed"**
→ Check logs trong Vercel Dashboard → Deployments → Click vào deployment → View Build Logs

**"Module not found"**
→ Chạy `npm install` trước khi deploy

---

## 📝 Quick Commands

```bash
# Login (chỉ cần làm 1 lần)
vercel login

# Deploy production
vercel --prod

# Xem deployments
vercel ls

# Xem logs
vercel logs
```

---

## 🎯 Alternative: Deploy qua GitHub

Nếu không muốn dùng CLI:

1. Push code lên GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <your-github-repo-url>
   git push -u origin main
   ```

2. Vào https://vercel.com
3. **Add New Project** → Import từ GitHub
4. Vercel tự động detect và deploy
5. Set `GEMINI_API_KEY` trong Settings

---

**Sẵn sàng deploy!** 🚀
