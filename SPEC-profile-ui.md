---
name: SPEC-profile-ui
status: draft
owner: duoc
created: 2026-08-15
skill: write-spec (anthropics/knowledge-work-plugins)
---

# Spec: Cải thiện UI tính năng Hồ sơ (Profile)

> Tài liệu này được soạn bằng skill `write-spec` (cài từ kho `anthropics/knowledge-work-plugins`), viết cho người mới — ưu tiên giải thích rõ **hiện trạng** trước khi bàn chuyện sửa gì. Chưa có dòng code Angular nào bị đổi ở bước này.

## 1. Tóm tắt

Tính năng hồ sơ (profile) trong Nexus **đã hoạt động và khá hoàn chỉnh** — không phải xây từ đầu. Việc "cải thiện UI" ở đây là tinh chỉnh trên nền có sẵn, không phải làm lại. Tài liệu này giải thích từng mảnh ghép hiện có, sửa lại một hiểu lầm quan trọng (xem mục 3), liệt kê một số điểm có thể tinh chỉnh tìm thấy khi đọc code thật, và đặt câu hỏi mở để bạn chọn hướng cụ thể trước khi bắt tay code.

## 2. Hiện trạng — Hồ sơ hoạt động thế nào?

Có **3 nơi** hiển thị hồ sơ, cố tình dùng chung một "hình dạng" (banner + avatar đè góc dưới trái + 2 cột danh tính/nội dung) để người dùng thấy quen mắt dù đang ở đâu:

| Nơi | File chính | Route | Vai trò |
|---|---|---|---|
| Trang xem hồ sơ | `pages/profile/view/profile.page.ts` + `.html` | `/u/:username` | Trang riêng, đầy đủ nhất — bio, liên kết mạng xã hội, ngày tham gia |
| Trang sửa hồ sơ | `pages/profile/edit/profile-edit.page.ts` + `.html` | `/settings/profile` | Form 2 cột: bên trái là các ô nhập, bên phải là **xem trước trực tiếp** (không gọi API, chỉ ghép dữ liệu form đang gõ) |
| Cửa sổ hồ sơ nổi | `shared/ui/profile-card/profile-modal.component.ts` | mở từ bất kỳ avatar nào trong app | Bản rút gọn của trang xem, hiện giữa màn hình |

**Tầng dữ liệu** (`core/profile/`):
- `profile.models.ts` — định nghĩa hình dạng dữ liệu (`Profile`, `OwnProfile`) và các giới hạn ký tự: tên hiển thị ≤32, dòng trạng thái ≤120, giới thiệu ≤300, nơi ở ≤64, tối đa 5 liên kết. Các số này **phải khớp** với backend (`UpdateProfileDto` + ràng buộc CHECK trong migration Supabase) — sửa một bên mà quên bên kia là lỗi thường gặp nhất ở tính năng này.
- `profile-api.service.ts` — gọi REST API (`GET/PATCH /api/profiles/me`, upload/xoá ảnh).
- `profile-lookup.service.ts` — cache kết quả tra cứu để mở cửa sổ hồ sơ không phải gọi API lần hai cho cùng một người.
- Backend: `nexus-be/src/modules/profiles/` (`profiles.controller.ts`, `profiles.service.ts`) — đọc/ghi bảng `profiles` trên Supabase Postgres.

**Ảnh (avatar/banner):** tải lên **ngay khi chọn file**, tách riêng khỏi nút "Lưu thay đổi" của phần chữ — lý do: nếu gộp chung, mỗi lần sửa một ô chữ lại phải tải lại ảnh. Có giới hạn 5MB, chỉ nhận jpeg/png/webp/gif/avif.

**Màu accent:** người dùng chọn 1 trong 8 màu cố định (`BANNER_FALLBACKS`) làm nền banner khi chưa có ảnh bìa; để trống (`null`) thì màu được băm tự động từ username — đảm bảo một người luôn mang cùng một màu ở mọi nơi trong app.

## 3. Đính chính quan trọng: hệ thống theme **đã có sẵn**, không phải quyết định còn treo

Khi khảo sát ban đầu, có vẻ như 4 file `DESIGN-amethyst.md`, `DESIGN-apple.md`, `DESIGN-mongodb.md`, `DESIGN-voltagent.md` (chưa commit, nằm ở gốc `nexus-fe/`) là các phương án đang chờ chọn. **Đọc kỹ `src/styles.css` và `core/theme/theme.service.ts` thì không phải vậy** — cả 4 (cộng thêm một theme thứ 5, `cyberpunk`) đã được đưa vào `styles.css` dưới dạng **theme thật, chọn được ngay trong app**, tại trang **Cài đặt → Giao diện** (`pages/settings/user/appearance.page.ts`):

- Theme mặc định hiện tại: **Voltagent** (nền gần đen `#101010`, một điểm nhấn xanh lá điện `#00d992`).
- 4 theme còn lại (`amethyst`, `cyberpunk`, `mongodb`, `apple`) chọn được qua `ThemeService.set()`, lưu lựa chọn vào `localStorage`, áp dụng bằng cách đổi thuộc tính `data-theme` trên thẻ `<html>`.
- Mọi trang — kể cả 3 nơi hiển thị hồ sơ ở mục 2 — đều dùng **token ngữ nghĩa** (`bg-canvas`, `text-ink`, `bg-primary`, `shadow-glow`...) chứ không hardcode mã màu, nên tự động đổi màu đúng theo theme đang chọn, không cần sửa gì ở component.
- 4 file `DESIGN-*.md` chưa commit thực chất là **tài liệu nguồn** đã được người viết trước "dịch" thành các khối theme trong `styles.css` — an toàn để commit làm tài liệu tham khảo, không phải quyết định đang chờ bạn chốt.
- Điểm lưu ý nhỏ: theme `cyberpunk` trong `styles.css` ghi chú nguồn là `(getdesign.md)` — một file không có trong repo này, nên tài liệu nguồn của theme này đang thất lạc. Không chặn việc gì, chỉ là một khoảng trống tài liệu nên biết.

**Kết luận:** bạn *không* cần chọn 1 trong 4 hướng thiết kế — việc đó đã xong dưới dạng bộ chọn theme sống. Việc cần làm là tinh chỉnh bố cục/UX của 3 nơi hiển thị hồ sơ, để chúng đẹp và dùng tốt ở **mọi** theme (vì đổi 1 dòng CSS token là tự động áp dụng cho cả 5 theme).

## 4. Vài điểm có thể tinh chỉnh (tìm thấy khi đọc code, chưa phải danh sách cuối)

| # | Vị trí | Hiện tại | Đề xuất |
|---|---|---|---|
| P1 | `profile-edit.page.html`, ô "Nơi ở" | 3 ô khác (tên hiển thị, trạng thái, giới thiệu) đều có bộ đếm ký tự còn lại; riêng ô "Nơi ở" không có | Thêm dòng đếm ký tự giống 3 ô kia, cho nhất quán |
| P1 | `profile.page.ts`, nút "Sao chép liên kết" | Đổi icon + `title` khi copy xong, nhưng không có vùng `aria-live` báo trạng thái cho người dùng trình đọc màn hình | Thêm `aria-live="polite"` báo "Đã chép liên kết" khi `copied()` bật |
| P2 | `profile-edit.page.html`, khu tải ảnh bìa | Không có gợi ý tỉ lệ khung hình khuyến nghị (banner hiển thị tỉ lệ 3:1, `object-cover` sẽ cắt ảnh không đúng tỉ lệ) | Thêm dòng chú thích nhỏ "Khuyến nghị ảnh tỉ lệ 3:1" cạnh nút tải |
| P2 | Toàn bộ 3 nơi hiển thị hồ sơ | Đã dùng đúng token, nhưng chưa được xem thử trên cả 5 theme cùng lúc | Trước khi tinh chỉnh, mở `/settings/appearance`, thử lần lượt cả 5 theme trên trang `/u/:username` để phát hiện chỗ tương phản/khoảng cách bị lệch ở theme sáng (mongodb, apple) — 2 theme này đảo ngược nền tối/sáng so với 3 theme còn lại, dễ lộ lỗi nhất |

Đây là các điểm **nhỏ, an toàn, không đổi hành vi** — phù hợp làm việc đầu tiên khi bạn còn mới. Danh sách này không thay cho việc bạn tự nói cụ thể chỗ nào bạn thấy "chưa ổn" — xem mục 6.

## 5. Goals / Non-goals

**Mục tiêu (Goals):**
- Hồ sơ (3 nơi hiển thị) nhất quán, đọc tốt trên cả 5 theme đang có.
- Vá các điểm nhỏ ở mục 4 (hoặc danh sách bạn tự bổ sung ở mục 6) mà không phá vỡ hành vi hiện tại.
- Bạn hiểu rõ luồng code trước khi có thay đổi nào — mục tiêu của riêng lượt làm việc này.

**Không thuộc phạm vi (Non-goals):**
- Đổi API/backend hoặc schema `profiles` — không cần cho các tinh chỉnh UI.
- Thêm trường dữ liệu mới (vd. sửa ngày sinh, thêm loại liên kết) — để riêng, cần bàn với backend trước.
- Chọn lại hay bỏ theme nào — hệ theme đã hoạt động tốt, không đụng tới.
- Sửa các trang khác ngoài 3 nơi hiển thị hồ sơ ở mục 2.

## 6. Câu hỏi mở — cần bạn trả lời trước khi triển khai code

1. Trong 4 điểm ở mục 4, bạn muốn làm hết hay chỉ vài điểm? Điểm nào trước?
2. Ngoài các điểm đó, có chỗ cụ thể nào trong 3 trang hồ sơ mà bạn tự thấy khó chịu/xấu khi dùng thử không? (Cứ mô tả bằng lời, không cần biết tên kỹ thuật — ví dụ "avatar nhỏ quá" hay "form sửa hồ sơ trên điện thoại bị chật")
3. Bạn có muốn thử cả 5 theme trước (mục 4, dòng cuối) rồi mới quyết định, hay cứ theme mặc định (Voltagent) là đủ để bắt đầu?

## 7. Tiêu chí chấp nhận khi triển khai (áp dụng khi có bản sửa code thật)

Theo đúng `nexus-fe/.claude/CLAUDE.md` — mọi thay đổi UI sau này phải:
- [ ] Chỉ dùng token ngữ nghĩa có sẵn trong `styles.css` (không hardcode mã màu/px)
- [ ] Giữ `changeDetection: OnPush`, dùng `signal`/`computed`, không dùng `ngClass`/`ngStyle`
- [ ] Dùng `@if`/`@for` (native control flow), không dùng `*ngIf`/`*ngFor`
- [ ] Đạt AXE và WCAG AA (tương phản, focus, ARIA) — kiểm bằng mắt trên ít nhất theme tối (Voltagent) và theme sáng (Apple hoặc MongoDB)
- [ ] Không đổi hành vi giới hạn ký tự/định dạng đã đồng bộ với backend

## 8. Bước tiếp theo

Đây là bước **lên kế hoạch và giải thích** — chưa có dòng code Angular nào bị sửa. Khi bạn đã đọc xong, trả lời mục 6, quay lại nhờ Claude triển khai đúng theo phần đã chọn trong mục 4 (hoặc điểm bạn tự nêu ở câu 2).
