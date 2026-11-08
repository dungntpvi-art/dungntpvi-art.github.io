# Sa Bàn Chiến Thuật

Bảng chiến thuật bóng đá cho sân 11, 7 và 5 người (futsal), có luật thi đấu, câu hỏi tình huống và bài học sân 5 cho học sinh tiểu học.

**Dùng ngay:** https://dungntpvi-art.github.io

Tiếng Việt, miễn phí, chạy trên trình duyệt (máy tính, điện thoại, iPad). Không cần tài khoản.

## Cài như app trên điện thoại

- **iPhone / iPad:** mở link bằng **Safari**, bấm nút **Chia sẻ** (hình vuông có mũi tên lên), chọn **Thêm vào MH chính**, rồi bấm **Thêm**.
- **Android:** mở bằng **Chrome**, bấm menu **⋮**, chọn **Cài đặt ứng dụng** (hoặc **Thêm vào màn hình chính**).

App có icon riêng, mở toàn màn hình không có thanh trình duyệt, và vẫn dùng được khi mất mạng (sau lần mở đầu tiên).

## Tính năng

### Bảng chiến thuật
- Sân 11, 7 và 5 người (sân 5 vẽ theo chuẩn futsal), vẽ đúng tỉ lệ.
- Sơ đồ có sẵn cho từng loại sân, hoặc tự nhập (ví dụ `4-1-4-1`). Đổi màu áo từng đội.
- Kéo thả cầu thủ và bóng.
- Công cụ vẽ: chạy chỗ, chuyền, dẫn bóng, sút, vẽ tay tự do, khoanh vùng, kẻ tuyến, xoá nét.
- Khung hình và hình động: xếp vị trí từng bước rồi bấm ▶ Phát, mỗi khung có ghi chú riêng.
- Danh sách đội: tên, số áo, người đá chính và dự bị, thay người, nhập nhanh cả đội.
- Toàn màn hình nằm ngang (điện thoại dọc tự xoay), phóng to và thu nhỏ (chụm 2 ngón, nút + / −, Ctrl + lăn chuột).
- Bút cảm ứng (Apple Pencil, S Pen): nét vẽ theo lực nhấn, chống chạm lòng bàn tay, Chế độ bút (bút để vẽ, ngón tay để kéo và phóng to).
- Thư viện bài: 6 bài mẫu, lưu bài của mình.

### Luật thi đấu
- Bảng so sánh sân 11 / 7 / 5.
- Tóm tắt 17 điều luật IFAB 2025/26 (sân 11), luật Futsal FIFA (sân 5), các điểm khác biệt thường gặp của sân 7 phong trào.
- Tìm kiếm trong luật.

### Tình huống
14 câu hỏi trắc nghiệm có giải thích.

### Cho bé (sân 5)
5 bài học có hình động, lời giải thích đơn giản ("xoè tay ra", "nắm tay lại", "sợi dây"…). Mỗi bài có một thử thách kéo thả, trò chơi để tập trên sân và câu hỏi gợi mở cho HLV.

## Phím tắt (bảng chiến thuật)

| Phím | Chức năng |
|---|---|
| V | Kéo thả |
| R / P / D / S | Chạy / Chuyền / Dẫn bóng / Sút |
| B | Vẽ tay |
| Z / L | Vùng / Tuyến |
| E | Xoá nét |
| Space | Phát / dừng |
| ← → | Khung trước / khung sau |
| + / − / 0 | Phóng to / thu nhỏ / xem cả sân |
| Esc | Thoát toàn màn hình |

## Cấu trúc mã nguồn

```
src/sa-ban-chien-thuat.html   Mã nguồn duy nhất: HTML + CSS + JavaScript, không dùng thư viện ngoài
build.sh                      Tạo index.html từ mã nguồn (thêm manifest, icon, service worker)
index.html                    Trang chạy trên GitHub Pages (do build.sh tạo, không sửa tay)
manifest.webmanifest          Thông tin để cài như app (tên, icon, màu)
sw.js                         Service worker: chạy offline
icons/                        Icon app (icon.svg là bản gốc, các PNG xuất từ đó)
```

Mã nguồn trong `src/` không có `<!doctype>` và `<head>` vì cùng file được dùng làm Artifact trên claude.ai. `build.sh` bọc thêm phần đầu trang chuẩn.

## Sửa và đưa lên mạng

```sh
# 1. Sửa src/sa-ban-chien-thuat.html
# 2. Tạo lại index.html
./build.sh
# 3. Mở index.html bằng trình duyệt để thử, rồi đẩy lên
git add -A && git commit -m "Mô tả thay đổi" && git push
```

GitHub Pages tự cập nhật sau khoảng 1 phút.

## Lưu dữ liệu

Bài đã lưu, danh sách đội và tiến độ bài học của bé nằm trong trình duyệt của từng người (`localStorage`). Không gửi lên máy chủ nào, và không tự đồng bộ giữa các máy.

## Lưu ý về luật

Phần luật chỉ là tóm tắt để tham khảo. Luật sân 7 và sân 5 phong trào khác nhau giữa các giải, nên luôn đối chiếu điều lệ giải bạn tham gia. Kích thước sân trên bảng chỉ để minh họa tỉ lệ.
