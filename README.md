# 🧭 Mê Cung Tri Thức — Cuộc Đua Giải Mã

Game tương tác lớp học đa môn (Toán, KHTN, Ngữ văn, Lịch sử – Địa lí, Ngoại ngữ) dành cho giáo viên chiếu lên màn hình chung: các đội (hoặc cả lớp) vượt qua các phòng thử thách trong mê cung đối xứng, thu thập **Mảnh Mật Mã**, cân nhắc dùng **Gợi ý chiến thuật** và giải mã **Cổng Kho Báu** ở trung tâm!

Chạy hoàn toàn trên trình duyệt — không cần tài khoản, không cần máy chủ, không cần Internet khi mở trực tiếp từ file.

## Cách chơi

- **Chế độ chơi linh hoạt & 2D ↔ 3D trực tiếp:** **Cả lớp** (hợp tác giữ đuốc) hoặc **2 / 3 / 4 đội đối kháng** xuất phát ở các góc đối xứng công bằng. Có thể chuyển nóng giữa **🗺 2D** và **🏛️ 3D WebGL (Three.js offline)** bất cứ lúc nào (ngay trên màn hình mở đầu, nút `🏛️ 3D / 🗺 2D` trên thanh công cụ, hoặc phím `T`), kèm **3 góc nhìn camera 3D** (`V`), kéo chuột xoay 360° & cuộn zoom tự do!
- **Cài đặt Mật mã & Manh mối riêng:** Trong khung **✎ Câu hỏi & Mật mã**, giáo viên đặt **Mật mã kho báu** (có thể là **từ, cụm từ tiếng Việt hoặc dãy số**, VD: `PYTHAGORE`, `2025`, `QUANG HOP`, `H2O`…) cùng **danh sách Manh mối** xoay quanh mật mã đó (hỗ trợ công thức KaTeX `$...$`).
- **Mở phòng Chìa Khóa (🔑) tìm manh mối:** Khi trả lời đúng ở phòng **🔑**, đội nhận điểm thưởng và mở lộ **Manh mối tiếp theo** trong sổ manh mối (nếu đã mở hết manh mối cài sẵn sẽ tự hé lộ thêm ký tự của mật mã!). Ngoài ra còn có **💎 Rương Vàng (+50đ)** và **💡 Bùa Gợi Ý miễn phí**.
- **❓ Phòng Bí Ẩn — Ô Bẫy & Ô May Mắn rải rác khắp bản đồ** (tùy chỉnh bật/tắt & số lượng trong **✎ Câu hỏi & Mật mã**):
  - **⚠️ Ô Bẫy (trừ % điểm hiện có):** **🔥 Lửa Thần (−5%)**, **🕸️ Độc Khí (−8%)**, **🕳️ Vực Sâu (−10%)**, **🐺 Thú Dữ (−15%)** (có mô hình & hiệu ứng 3D riêng, không để điểm âm).
  - **🍀 Ô May Mắn:** **📜 Gợi Ý Mật Mã Miễn Phí** (mở ngay 1 manh mối), **🧲 Nam Châm Hút Điểm** (lấy **5% điểm** của đội bạn dẫn đầu, hoặc +1 đuốc & +60đ ở chế độ Cả lớp), **💰 Kho Báu +100 điểm**, **🍀 Bùa May Mắn** (+1 Bùa 50/50 & +50đ).
- **Đoán mật mã ở Cổng Kho Báu (👑) BẤT CỨ LÚC NÀO:** Ở mọi lượt đi, đội có quyền bấm thẳng ô **👑 Cổng Kho Báu** ở trung tâm bản đồ (cả 2D và 3D, hoặc nút `👑 Đoán mật mã` / phím `G`) để đoán mật mã ngay!
  - Đoán càng sớm (khi còn ít manh mối mở ra), điểm thưởng càng lớn (`250đ + 40đ × số manh mối chưa mở`).
  - Không phân biệt chữ hoa/thường hay dấu tiếng Việt; có tùy chọn yêu cầu giải thích lập luận trước khi mở tung Kho Báu.
  - Đoán sai chỉ mất lượt hiện tại (chế độ Cả lớp mất 1 đuốc), **không loại học sinh khỏi cuộc chơi**.
- **Gợi ý 50/50 (`H`) & Cướp lượt:** Khi gặp câu hỏi khó có thể dùng Gợi ý 50/50 (trừ 30đ thưởng hoặc miễn phí nếu có Bùa 💡); trả lời sai ở chế độ đội cho phép đội khác cướp lượt.

## Câu hỏi & Nhập đề Word (.docx)

- Hỗ trợ đủ **3 dạng câu hỏi chuẩn đề 2025**: Trắc nghiệm A–F, Đúng/Sai (tách từng ý `a, b, c, d` thành 1 lượt), Trả lời ngắn (ẩn đáp án → giáo viên xem rồi chấm).
- Hiển thị công thức Toán / KHTN sắc nét bằng **KaTeX offline** (`$...$`, `$$...$$`).
- **Nhập thẳng đề Word (`.docx`)**: tự động chuyển công thức **MathType / Equation 3.0 / Word Equation (OMML)** sang LaTeX ngay trên máy; nhận đáp án đúng từ chữ **gạch chân** hoặc **tô đỏ**; giữ nguyên hình ảnh và lời giải.

## Cách dùng nhanh

1. Mở `index.html` bằng Chrome hoặc Edge → bấm **🧭 VÀO GAME** (hoặc `Enter`).
2. Bấm **✎ Câu hỏi & Mật mã** → nhập **Mật mã kho báu** & **Manh mối các phòng 🔑**, tùy chỉnh số lượng **Ô Bẫy / Ô May Mắn**, bấm **📄 Nhập file Word (.docx)** (hoặc kéo-thả file Word) → xem trước KaTeX → **Lưu**.
3. Chọn **Cả lớp / 2 / 3 / 4 đội**, kích cỡ mê cung (**Nhỏ / Vừa / Lớn**) và chế độ hiển thị (**🗺 2D** hoặc **🏛️ 3D**) → **🧭 Bắt đầu thám hiểm!** Nhấn `F` để chiếu toàn màn hình.

**Phím tắt giáo viên:**
- Chọn phòng & 3D: `← ↑ → ↓` di chuyển, `Enter`/`Space` vào phòng · `G` mở **👑 Cổng Kho Báu** đoán mật mã ngay · `T` chuyển nóng **2D ↔ 3D** · `V` đổi góc nhìn camera 3D.
- Trả lời: `A`–`D` hoặc `1`–`4` · Đúng/Sai: `1`/`2` · Trả lời ngắn: `Enter` xem đáp án, `1` đúng, `2` sai · `H` dùng Gợi ý 50/50.
- Cướp lượt: `1`–`4` chọn đội, `0` không ai cướp · Hộp Cổng Kho Báu: `Enter` xác nhận mật mã, `Esc` quay lại; khi đoán đúng: `1`/`Enter` mở kho báu, `2` chưa giải thích được.
- Chung: `Space` tiếp tục (hoặc đóng thẻ Sự kiện Bẫy/May Mắn) · `E` mở khung soạn đề & cài đặt mật mã · `F` toàn màn hình · `M` tắt tiếng.

> Dữ liệu câu hỏi, ảnh và cài đặt được lưu **riêng cho game này** trong trình duyệt (`localStorage` key `me-cung-tri-thuc.v1` + `IndexedDB` `me-cung-tri-thuc`), không xung đột với các game khác và không gửi lên máy chủ nào.

## Cấu trúc thư mục

```text
me-cung-tri-thuc/
├── index.html              # giao diện + luật chơi Mê Cung Tri Thức (2D & 3D, Bẫy & May Mắn)
├── favicon.svg
├── assets/
│   ├── gioi-thieu.jpg      # ảnh màn hình giới thiệu
│   └── logo-giaovienai.png # logo GIAOVIENAI
├── lib/three.min.js        # Three.js r147 (chạy 3D offline)
├── lib/maze3d.js           # engine Mê Cung 3D (tường đá, cổng kho báu, bẫy/may mắn 3D)
├── lib/qbank.js            # ngân hàng câu hỏi, modal soạn/xem trước, âm thanh, FX
├── lib/mtef2tex.js         # đọc công thức MathType / Equation 3.0 -> LaTeX
├── lib/docx-import.js      # đọc đề Word (.docx)
├── lib/jszip.min.js        # giải nén .docx
├── lib/cfb.min.js          # đọc đối tượng OLE (MathType)
├── katex/                  # KaTeX + phông chữ (chạy offline)
├── licenses/               # giấy phép thư viện bên thứ ba
├── THIRD_PARTY_NOTICES.md
├── vercel.json             # cấu hình deploy Vercel
└── .gitignore              # chặn *.docx, *.doc, *.pdf, *.xlsx
```

## Deploy nhanh lên Vercel / GitHub

Không cần bước build — đây là trang web tĩnh:
1. Tạo repo riêng `me-cung-tri-thuc` trên GitHub và push thư mục này lên (`.gitignore` đã tự chặn các file đề Word/PDF).
2. Trên [vercel.com](https://vercel.com) → **Add New… → Project** → chọn repo `me-cung-tri-thuc`, để **Framework Preset: `Other`**, để trống Build/Output Command → **Deploy**.
