# Kiểm Tra Logic Tính Toán Theo GOLD 2026

## 📋 Các Tiêu Chuẩn GOLD 2026 Cần Kiểm Tra

### 1. **GOLD Severity Classification (GOLD 1-4)**
Dựa trên FEV1% predicted:
- **GOLD 1 (Mild)**: FEV1% ≥ 80%
- **GOLD 2 (Moderate)**: 50% ≤ FEV1% < 80%
- **GOLD 3 (Severe)**: 30% ≤ FEV1% < 50%
- **GOLD 4 (Very Severe)**: FEV1% < 30%

### 2. **GOLD Group Classification (A/B/E)**
Dựa trên:
- **Symptoms**: CAT score ≥ 10 HOẶC mMRC ≥ 2
- **Exacerbations**: Số đợt cấp trong 12 tháng qua
  - **Low risk**: 0-1 đợt cấp/năm, không nhập viện
  - **High risk**: ≥2 đợt cấp/năm HOẶC ≥1 nhập viện

**GOLD Groups:**
- **Group A**: Low symptoms, Low risk
  - CAT < 10 VÀ mMRC < 2
  - VÀ (0-1 đợt cấp/năm, không nhập viện)
  
- **Group B**: High symptoms, Low risk
  - (CAT ≥ 10 HOẶC mMRC ≥ 2)
  - VÀ (0-1 đợt cấp/năm, không nhập viện)
  
- **Group E**: High risk (bất kể symptoms)
  - ≥2 đợt cấp/năm HOẶC ≥1 nhập viện

### 3. **FEV1/FVC Ratio**
- **COPD diagnosis**: FEV1/FVC < 0.7 (post-bronchodilator)
- **Normal**: FEV1/FVC ≥ 0.7

### 4. **Eosinophil Thresholds**
- **Eosinophilic phenotype**: Blood eosinophils ≥ 300 cells/μL
- **Consider ICS**: Eosinophils ≥ 100-300 cells/μL (tùy context)

### 5. **ACO (Asthma-COPD Overlap) Criteria**
- Significant reversibility (post-BD FEV1 increase ≥ 12% và ≥ 200mL)
- HOẶC High eosinophils (≥ 300 cells/μL)
- HOẶC History of asthma

---

## 🔍 Kiểm Tra Logic Hiện Tại

### ✅ **Validation Logic** (`validationService.ts`)

1. **FEV1/FVC Ratio**:
   - ✅ Đúng: Kiểm tra < 0.7 cho COPD
   - ✅ Đúng: Cho phép sai số hợp lý (0.15) vì có thể đo trực tiếp
   - ✅ Đúng: Warning thay vì error

2. **FEV1% Range**:
   - ✅ Đúng: 0-150% (hợp lý cho COPD)

3. **CAT Score**:
   - ✅ Đúng: 0-40

4. **mMRC**:
   - ✅ Đúng: 0-4

### ⚠️ **Cần Kiểm Tra**

1. **GOLD Severity Classification**:
   - ❓ Logic này được AI xử lý, không có code tính toán cụ thể
   - Cần đảm bảo AI prompt có logic đúng

2. **GOLD Group Classification (A/B/E)**:
   - ❓ Logic này được AI xử lý
   - Cần kiểm tra AI prompt có đúng criteria không

3. **Exacerbation Risk Assessment**:
   - ❓ Cần đảm bảo logic: ≥2 đợt cấp HOẶC ≥1 nhập viện = High risk

4. **Symptoms Assessment**:
   - ❓ Cần đảm bảo: CAT ≥ 10 HOẶC mMRC ≥ 2 = High symptoms

---

## 📝 Đề Xuất Cải Thiện

### 1. **Tạo Service Tính Toán GOLD Classification**
Tạo `services/goldClassificationService.ts` để:
- Tính GOLD severity (1-4) từ FEV1%
- Tính GOLD group (A/B/E) từ symptoms + exacerbations
- Validate logic trước khi gửi cho AI

### 2. **Cập Nhật AI Prompt**
Đảm bảo AI prompt có logic chính xác:
- GOLD severity classification
- GOLD group classification
- Exacerbation risk assessment

### 3. **Thêm Validation Cho GOLD Criteria**
- Validate symptoms threshold (CAT ≥ 10 hoặc mMRC ≥ 2)
- Validate exacerbation risk (≥2 đợt cấp hoặc ≥1 nhập viện)

---

## 🎯 Kế Hoạch Kiểm Tra

1. ✅ Đã kiểm tra validation logic - Đúng
2. ⏳ Kiểm tra AI prompt logic - Cần review
3. ⏳ Tạo GOLD classification service - Đề xuất
4. ⏳ Test với các case scenarios - Cần làm
