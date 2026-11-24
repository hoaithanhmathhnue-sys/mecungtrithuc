# 🧭 Mê Cung Tri Thức — Cuộc Đua Giải Mã

Game tương tác lớp học đa môn (Toán, KHTN, Ngữ văn, Lịch sử – Địa lí, Ngoại ngữ) dành cho giáo viên chiếu lên màn hình chung: các đội (hoặc cả lớp) vượt qua các phòng thử thách trong mê cung đối xứng, thu thập **Mảnh Mật Mã**, cân nhắc dùng **Gợi ý chiến thuật** và giải mã **Cổng Kho Báu** ở trung tâm!

Chạy hoàn toàn trên trình duyệt — không cần tài khoản, không cần máy chủ, không cần Internet khi mở trực tiếp từ file.

## Cách chơi

- **Chế độ chơi linh hoạt:** **Cả lớp** (hợp tác giữ đuốc mở kho báu) hoặc **2 / 3 / 4 đội đối kháng** xuất phát ở các góc đối xứng công bằng.
- **Chọn hướng đi chiến thuật:** Ở mỗi lượt, các phòng kề vùng đã mở sẽ phát sáng kèm tọa độ (`A1`, `B2`…). Học sinh đọc tọa độ phòng muốn tiến vào (đi thẳng ăn **🔑 Mảnh Mật Mã**, rẽ nhánh nhặt **💎 Rương Vàng +50đ** hay **💡 Bùa Gợi Ý**).
- **Quyền dùng Gợi Ý (50/50):** Khi gặp câu khó, đội có thể bấm **💡 Gợi ý (`H`)** để loại bỏ một nửa phương án sai (hoặc nhận gợi ý cho Đúng/Sai & Trả lời ngắn), đổi lại trừ 30 điểm thưởng — hoặc **miễn phí** nếu đã nhặt **Bùa Gợi Ý**.
- **Không loại học sinh sớm & Cướp lượt:** Trả lời sai chỉ tạm đóng cửa phòng (các đội khác có thể **cướp lượt** nếu bật). Đội sai vẫn giữ nguyên số mảnh mật mã đã thu thập.
- **Vòng Đỉnh Cao — Mở Cổng Kho Báu:** Khi gom đủ 3 / 4 / 5 mảnh mật mã (tùy cỡ mê cung Nhỏ / Vừa / Lớn) và mở đường tới tâm **👑 Cổng Kho Báu**, đội giải câu khóa cuối và **giải thích lập luận** để mở tung kho báu giành chiến thắng!

## Câu hỏi & Nhập đề Word (.docx)

- Hỗ trợ đủ **3 dạng câu hỏi chuẩn đề 2025**: Trắc nghiệm A–F, Đúng/Sai (tách từng ý `a, b, c, d` thành 1 lượt), Trả lời ngắn (ẩn đáp án → giáo viên xem rồi chấm).
- Hiển thị công thức Toán / KHTN sắc nét bằng **KaTeX offline** (`$...$`, `$$...$$`).
- **Nhập thẳng đề Word (`.docx`)**: tự động chuyển công thức **MathType / Equation 3.0 / Word Equation (OMML)** sang LaTeX ngay trên máy; nhận đáp án đúng từ chữ **gạch chân** hoặc **tô đỏ**; giữ nguyên hình ảnh và lời giải.

## Cách dùng nhanh

1. Mở `index.html` bằng Chrome hoặc Edge → bấm **🧭 VÀO GAME** (hoặc `Enter`).
2. Bấm **✎ Câu hỏi** → **📄 Nhập file Word (.docx)** (hoặc kéo-thả file Word vào khung) → bấm tab **👁 Xem trước** kiểm tra công thức → **Lưu**.
3. Chọn **Cả lớp / 2 / 3 / 4 đội** và kích cỡ mê cung (**Nhỏ / Vừa / Lớn**) → **🧭 Bắt đầu thám hiểm!** Nhấn `F` để chiếu toàn màn hình.

**Phím tắt giáo viên:**
- Chọn phòng: `← ↑ → ↓` di chuyển, `Enter`/`Space` vào phòng.
- Trả lời: `A`–`D` hoặc `1`–`4` · Đúng/Sai: `1`/`2` · Trả lời ngắn: `Enter` xem đáp án, `1` đúng, `2` sai · `H` dùng Gợi ý.
- Cướp lượt: `1`–`4` chọn đội, `0` không ai cướp · Cổng Kho Báu: `1`/`Enter` xác nhận giải thích thuyết phục, `2` chưa giải thích được.
- Chung: `Space` tiếp tục · `E` mở khung nhập đề · `F` toàn màn hình · `M` tắt tiếng.

> Dữ liệu câu hỏi, ảnh và cài đặt được lưu **riêng cho game này** trong trình duyệt (`localStorage` key `me-cung-tri-thuc.v1` + `IndexedDB` `me-cung-tri-thuc`), không xung đột với các game khác và không gửi lên máy chủ nào.

## Cấu trúc thư mục

```text
me-cung-tri-thuc/
├── index.html              # giao diện + luật chơi Mê Cung Tri Thức
├── favicon.svg
├── assets/gioi-thieu.jpg   # ảnh màn hình giới thiệu
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
