# NexusCord — Lưu ý ownership và merge cho Dashboard

> Audit lần cuối: 09/08/2026, múi giờ Asia/Saigon.
>
> Đọc file này cùng `NEXUSCORD_HANDOFF.md` trước khi pull, rebase, merge, sửa conflict hoặc nối API thật cho Dashboard.

## 1. Kết luận nhanh

- Minh Tài sở hữu Dashboard và hiện chỉ mô phỏng UI/UX frontend.
- Không có file nào trong `features/auth/**`, `features/profile/**`, `features/settings/**` hoặc `features/ai-agent/**` bị thay đổi.
- Không sửa backend `nexus-be`, database, migration SQL, Supabase schema, DTO server, API thật, socket hoặc realtime.
- Phần lớn thay đổi đúng trong `features/dashboard/**`, nhưng có 35 đường dẫn shared/cross-cutting cần nhóm biết trước khi merge.
- Tại thời điểm audit, chưa có conflict với `origin/release/staging`: remote đang ở `63435d3`, chính là ancestor/merge-base của `page/tai`; nhánh Tài đi trước 6 commit.
- Kết luận “chưa conflict” chỉ đúng với remote hiện tại. Khi nhánh Auth/Profile/Settings của thành viên khác được push hoặc merge vào staging, phải audit lại.

## 2. Baseline Git dùng cho audit

- Frontend repo: `D:\minhtai_22401270\y2\TTNN\nexuscord\nexus-fe`
- Branch của Tài: `page/tai`
- HEAD tại lúc cập nhật: `ed0975f` — `commit ui19-22`
- Remote `origin/release/staging`: `63435d3`
- Merge-base: `63435d3`
- Quan hệ: `release/staging` là ancestor của `page/tai`.
- Chênh lệch commit: staging `0`, Dashboard `6`.
- Tracked diff so với staging: 111 file, khoảng 10.147 dòng thêm và 611 dòng xoá.
- Working tree `nexus-fe`: sạch tại thời điểm cập nhật.
- Theme Studio/Dashboard Appearance cùng UI-19 đến UI-22 đã nằm trong commit local `ed0975f`.
- Branch `page/tai` chưa tồn tại trên remote tại lần kiểm tra cuối; snapshot hiện mới an toàn trên máy local cho tới khi Tài chủ động push.
- `git diff --check origin/release/staging`: pass tại thời điểm audit.
- Test gần nhất sau UI-22: 40/40 test files, 203/203 unit/component tests pass.
- Build gần nhất: browser/SSR/prerender pass; initial bundle 627,08 kB, dưới warning budget 700 kB.

## 3. Phân loại toàn bộ phạm vi thay đổi

| Nhóm                                 | Số đường dẫn | Ownership/rủi ro                        |
| ------------------------------------ | -----------: | --------------------------------------- |
| `features/dashboard/**`              |           73 | Đúng ownership của Tài                  |
| `plans/dashboard.PLAN.md`            |            1 | Plan của Dashboard                      |
| `public/assets/**`                   |            2 | Logo và doodle cho Dashboard            |
| Shared/cross-cutting                 |           35 | Phải kiểm tra conflict và tác động chéo |
| Feature của Auth/Profile/Settings/AI |            0 | Không đụng                              |
| Backend/database                     |            0 | Không đụng                              |

### Vùng Dashboard đúng ownership

- `src/app/features/dashboard/channel/**`
- `src/app/features/dashboard/conversation/**`
- `src/app/features/dashboard/friends/**`
- `src/app/features/dashboard/server-home/**`
- `src/app/features/dashboard/components/**`
- `src/app/features/dashboard/services/**`
- `plans/dashboard.PLAN.md`
- `public/assets/doodle.svg`
- `public/assets/ChatGPT Image Aug 9, 2026, 12_37_49 AM.png`

Các thay đổi tiêu biểu trong vùng này gồm Friends Dashboard, chat preview, context panel, product state, Nexus Orbit Boot, message actions, Nexus Atmospheres và hai phạm vi tìm kiếm.

### Sáu file UI-19 trước đây untracked, hiện đã commit

- `src/app/features/dashboard/components/theme-studio/theme-studio.css`
- `src/app/features/dashboard/components/theme-studio/theme-studio.html`
- `src/app/features/dashboard/components/theme-studio/theme-studio.spec.ts`
- `src/app/features/dashboard/components/theme-studio/theme-studio.ts`
- `src/app/features/dashboard/services/dashboard-appearance.spec.ts`
- `src/app/features/dashboard/services/dashboard-appearance.ts`

Đây là code đã được duyệt trong UI-19 và hiện nằm trong commit `ed0975f`. Không xoá khi resolve chỉ vì chúng từng là file mới.

## 4. Toàn bộ vùng shared/cross-cutting đã chạm

### Instruction

- `.claude/CLAUDE.md`

Diff hiện tại chỉ bỏ một dòng trắng đầu file, không thay đổi nội dung instruction. Có thể bỏ diff này trước merge nếu Tài yêu cầu cleanup, nhưng không tự ý revert khi chưa hỏi.

### App root và boot toàn ứng dụng

- `src/app/app.ts`
- `src/app/app.html`
- `src/app/app.spec.ts`
- `src/index.html`

Mục đích: Nexus Orbit Boot, fallback trước bootstrap và khởi tạo theme sớm để không lóe sai màu.

Rủi ro:

- `app-root` import component/service từ `features/dashboard`, tạo coupling từ root vào Dashboard.
- Có thể conflict nếu team Auth thêm loader, callback transition hoặc chỉnh root app/index.
- Static fallback trong `index.html` xuất hiện trước khi Angular bootstrap nên có ảnh hưởng first paint toàn app, kể cả Auth.
- Không thay logic Auth, guard, session hoặc OAuth; ảnh hưởng ở đây là UI/bootstrap và merge surface.

### Core frontend

- `src/app/core/api/shell-data.ts`
- `src/app/core/api/shell-data.spec.ts`
- `src/app/core/theme/theme.service.ts`
- `src/app/core/theme/theme.service.spec.ts`

`ShellData`:

- Chỉ là frontend data source cho shell và demo mode.
- Live state mặc định rỗng để đúng tài khoản mới.
- Demo state bật/tắt runtime; có server grouping/reorder/ungroup contract.
- Không gọi HTTP, socket, database hoặc Supabase.
- Có thể conflict khi Dashboard bắt đầu nối API thật hoặc team thay contract server/channel/conversation.

`ThemeService`:

- Ghi `data-theme` lên `<html>` và lưu `nexuscord-theme` trong localStorage.
- Là service toàn ứng dụng, dù nút điều khiển hiện nằm trong Dashboard.
- Có thể làm Auth/Profile/Settings đổi theme gián tiếp hoặc conflict nếu team khác tự tạo theme service.

### App layout dùng chung

- `src/app/layouts/app-layout/app-layout.css`
- `src/app/layouts/app-layout/app-layout.html`
- `src/app/layouts/app-layout/app-layout.spec.ts`
- `src/app/layouts/app-layout/app-layout.ts`
- `src/app/layouts/app-layout/components/server-rail/server-rail.css`
- `src/app/layouts/app-layout/components/server-rail/server-rail.html`
- `src/app/layouts/app-layout/components/server-rail/server-rail.spec.ts`
- `src/app/layouts/app-layout/components/server-rail/server-rail.ts`
- `src/app/layouts/app-layout/components/channel-sidebar/channel-sidebar.css`
- `src/app/layouts/app-layout/components/channel-sidebar/channel-sidebar.html`
- `src/app/layouts/app-layout/components/channel-sidebar/channel-sidebar.spec.ts`
- `src/app/layouts/app-layout/components/channel-sidebar/channel-sidebar.ts`
- `src/app/layouts/app-layout/components/channel-sidebar/components/channel-list.html`
- `src/app/layouts/app-layout/components/channel-sidebar/components/channel-list.spec.ts`
- `src/app/layouts/app-layout/components/channel-sidebar/components/conversation-list.css`
- `src/app/layouts/app-layout/components/channel-sidebar/components/conversation-list.html`
- `src/app/layouts/app-layout/components/channel-sidebar/components/conversation-list.spec.ts`
- `src/app/layouts/app-layout/components/channel-sidebar/components/conversation-list.ts`
- `src/app/layouts/app-layout/components/user-panel/user-panel.css`
- `src/app/layouts/app-layout/components/user-panel/user-panel.html`
- `src/app/layouts/app-layout/components/user-panel/user-panel.spec.ts`
- `src/app/layouts/app-layout/components/user-panel/user-panel.ts`

Mục đích: shell Dashboard, rail server, grouping DnD, search, conversation list, user/audio controls và responsive layout.

Rủi ro:

- Theo ownership trong `.claude`, `layouts/**` là hạ tầng dùng chung, không thuộc riêng thành viên nào.
- Có thể conflict nếu Profile/Settings render trong cùng AppLayout hoặc team khác sửa sidebar/user panel.
- `UserPanel` vẫn dùng `AuthService` và `ProfileService` có sẵn để hiển thị user/đăng xuất, nhưng các service đó không bị sửa.
- Nút Settings chỉ là integration seam disabled; không dựng UI Settings.

### Shared UI

- `src/app/shared/ui/empty-state/empty-state.ts`
- `src/app/shared/ui/empty-state/empty-state.html`
- `src/app/shared/ui/empty-state/empty-state.spec.ts`

Mục đích: chỉnh geometry/visual empty state và bỏ ép `h-full` để tránh scroll sai.

Tại thời điểm audit, tìm kiếm usage cho thấy `app-empty-state` chỉ được các trang Dashboard sử dụng. Rủi ro tác động hiện tại thấp, nhưng đây vẫn là shared primitive và có thể conflict nếu team khác bắt đầu dùng/sửa nó.

### Global style

- `src/styles.css`

Đây là điểm rủi ro cao nhất vì file chứa:

- Hybrid dark/light tokens.
- Material system variable overrides.
- Global light theme trên `html[data-theme='light']`.
- Motion/elevation/focus tokens.
- Nexus Atmospheres được scope dưới Dashboard.
- Scrollbar, Material overlay/menu/dialog và nhiều interaction state.
- Các style lớn được đặt global nhưng scope theo `app-server-rail`, `.dashboard-shell`, `.nexus-*` để tránh Angular component CSS budget.

Tác động cần hiểu đúng:

- Các selector được scope dưới Dashboard không ảnh hưởng trang khác.
- Token trên `<html>` và Material system variables có thể đổi màu Material control của Auth/Profile/Settings dù không sửa file feature của họ.
- Git có thể merge sạch nhưng UI vẫn có thể hồi quy nếu hai bên định nghĩa theme/token khác nhau.

## 5. Phần của thành viên khác không bị sửa

- Không có diff trong `src/app/features/auth/**`.
- Không có diff trong `src/app/features/profile/**`.
- Không có diff trong `src/app/features/settings/**`.
- Không có diff trong `src/app/features/ai-agent/**`.
- Không sửa `AuthService`, `ProfileService`, auth guard hoặc route của các feature trên.
- Không sửa dependency/package files.

Lưu ý: “không sửa file” không đồng nghĩa “không thể ảnh hưởng hình ảnh”. Global theme, Material variables, AppLayout và root loader vẫn có thể tác động gián tiếp, vì vậy phải regression-test các trang của team sau merge.

## 6. Backend và database không bị đụng

Audit repo `nexus-be`:

- Branch: `main`.
- Working tree sạch.
- Không có commit Dashboard nào.
- Không có migration/schema thay đổi.
- Không có code kết nối Supabase/database mới từ phần Dashboard.

Audit frontend diff cũng không thấy phần thêm mới dùng các pattern tích hợp thật như `HttpClient`, `fetch`, socket, WebSocket, SQL migration, Prisma hoặc TypeORM.

## 7. Đánh giá nguy cơ conflict

| Mức             | Vùng                              | Lý do                                                                    |
| --------------- | --------------------------------- | ------------------------------------------------------------------------ |
| Cao             | `src/styles.css`                  | File lớn, global token/Material theme, dễ conflict cả text lẫn giao diện |
| Cao             | `src/app/app.*`, `src/index.html` | App root/boot có thể cùng vùng Auth hoặc cấu hình toàn app               |
| Trung bình–cao  | `layouts/app-layout/**`           | Shared shell, nhiều component và logic DnD/search                        |
| Trung bình      | `core/api/shell-data.*`           | Sẽ là điểm thay khi nối API thật                                         |
| Trung bình      | `core/theme/theme.service.*`      | Theme toàn ứng dụng, dễ trùng giải pháp với team khác                    |
| Thấp–trung bình | `shared/ui/empty-state/**`        | Hiện chỉ Dashboard dùng nhưng ownership là shared                        |
| Thấp            | `features/dashboard/**`           | Đúng ownership của Tài; chỉ conflict nếu người khác làm sai phạm vi      |
| Rất thấp        | Plan/assets                       | Ít khả năng thành viên khác sửa cùng dòng/file                           |

### Trạng thái hiện tại

Remote GitHub frontend tại lúc audit chỉ có `main` và `release/staging`; chưa thấy nhánh frontend của các thành viên khác được push. Vì vậy chưa thể chứng minh chính xác file nào sẽ conflict với code chưa xuất hiện trên remote.

Nếu merge `page/tai` vào staging ngay tại baseline hiện tại, Git có thể fast-forward và không cần resolve content conflict. UI-19 đến UI-22 đã được commit local trong `ed0975f`, nhưng chưa có trên remote cho tới khi Tài chủ động push.

## 8. Điều gì xảy ra nếu đưa file shared về bản staging

Không được hiểu “file shared dễ conflict” thành “cứ trả nó về bản đầu rồi Dashboard vẫn giữ nguyên”. Có hai loại hậu quả:

### Critical — build hỏng

- Trả riêng `core/api/shell-data.ts` về staging làm mất `demoEnabled`, `serverGroups` và toàn bộ method group/reorder/ungroup mà Friends, Channel, Conversation và ServerRail đang gọi. Angular sẽ compile fail.
- Trả `core/theme/theme.service.*` về staging đồng nghĩa xoá service mới. Friends và AppLayout vẫn import nó nên compile fail.
- Trả riêng TS nhưng giữ HTML hiện tại của AppLayout, ServerRail, ChannelSidebar hoặc ConversationList sẽ làm template gọi signal/method/input không còn tồn tại.
- Trả toàn bộ nhóm shared về staging nhưng giữ `features/dashboard/**` hiện tại cũng fail vì public contract giữa Dashboard và shell không còn khớp.

### Build có thể qua nhưng UI hồi quy nặng

- Trả `src/styles.css` về staging: mất light palette, Atmospheres, interaction states, Nexus scrollbar, chat action/menu style, server-group/drop feedback, Command Center layout và Nexus Orbit CSS. Loader có thể còn markup nhưng thành HTML thô.
- Trả đồng bộ `app.ts|html|spec.ts`: mất loader Angular khi initial navigation hoặc đi từ Auth vào Dashboard.
- Trả `src/index.html`: mất loader trước bootstrap, title NexusCord, `lang=vi` và chống flash dark khi F5 light mode.
- Trả toàn bộ `layouts/app-layout/**`: Dashboard quay về shell ban đầu; mất group server, search, Add Server UI, Command Center, layout/overflow fixes, user-panel polish và Atmosphere binding.
- Trả `shared/ui/empty-state/**`: empty state lại ép `h-full`, có thể làm scrollbar xuất hiện dù nội dung chưa overflow; card mất border/radius/elevation mới.
- Trả `.claude/CLAUDE.md` về staging không ảnh hưởng runtime; diff chỉ là một dòng trắng.

Nếu tiếp tục trả luôn các Dashboard consumer về staging để build lại, sản phẩm gần như quay từ UI-22 về prototype trước UI-3: dark-only, mock tự hiện cho tài khoản mới, không demo toggle, không group/search/Atmospheres/loader và nhiều lỗi scroll/spacing cũ quay lại.

## 9. Giải pháp tích hợp code team tối ưu

Mục tiêu là giữ nguyên một bản Dashboard có thể quay lại, thử tích hợp trên nhánh riêng và chỉ đưa kết quả đã kiểm chứng về `page/tai`.

### Lớp 1 — đóng băng Dashboard hiện tại

Trước khi lấy code team:

1. Xác nhận working tree sạch và snapshot local `ed0975f — commit ui19-22` vẫn là HEAD mong muốn.
2. Review commit và push `page/tai` lên remote trước khi tích hợp code team; có thể tạo thêm tag/snapshot `dashboard-ui22-before-team-merge` nếu team đồng ý.
3. Không fetch/merge/rebase khi working tree phát sinh dirty files mới hoặc chưa hiểu thay đổi nào chưa commit.

Không tự thực hiện commit/push/tag; Codex phải hỏi Tài trước.

### Lớp 2 — tích hợp trên nhánh thử nghiệm

Từ `page/tai` sạch, tạo một nhánh integration riêng, ví dụ `codex/dashboard-team-integration`. Không kéo thẳng vào branch làm việc chính.

Quy trình dự kiến:

```bash
git fetch origin
git merge --no-commit --no-ff origin/release/staging
```

- `fetch` tách riêng bước cập nhật remote khỏi bước merge để dễ quan sát.
- `--no-commit` cho phép review toàn bộ kết quả trước merge commit.
- Nếu hướng tích hợp sai và chưa commit, dùng `git merge --abort`; không dùng `git reset --hard`.
- Nếu nhánh thử nghiệm hỏng, bỏ nó và quay lại `page/tai`; snapshot Dashboard vẫn nguyên.

### Lớp 3 — resolve theo ownership và hành vi

| Conflict ở đâu                     | Nguyên tắc xử lý                                                  |
| ---------------------------------- | ----------------------------------------------------------------- |
| `features/auth/**`                 | Giữ code của Mon, không tự sửa thay                               |
| `features/profile/**`              | Giữ code của Triều Dược                                           |
| `features/settings/**`             | Giữ code của Trường Giang                                         |
| `features/dashboard/**`            | Giữ Dashboard của Tài, chỉ ghép contract mới đã thống nhất        |
| `src/styles.css`                   | Merge thủ công từng block; không nhận nguyên file một phía        |
| `app.ts`, `app.html`, `index.html` | Kết hợp boot/theme với thay đổi Auth/root, tránh hai loader       |
| `layouts/app-layout/**`            | Giữ TS + HTML + CSS đồng bộ; ghép route/integration seam của team |
| `core/theme/**`                    | Cả app chỉ có một ThemeService chung                              |
| `core/api/shell-data/**`           | Giữ public contract UI; thay nguồn live bên trong khi API có thật |
| `shared/ui/empty-state/**`         | Giữ fix không ép `h-full`, ghép thêm API/input mới nếu team cần   |

Không chọn mù “Accept Current”, “Accept Incoming”, `ours` hoặc `theirs` cho nguyên file shared. Resolve phải theo từng hunk và sau đó đọc lại file hoàn chỉnh.

### Cách xử lý từng điểm nóng

#### `src/styles.css`

Tách về mặt tư duy thành hai lớp khi resolve:

- Lớp global của team: font, base HTML/body, Material theme và token toàn ứng dụng.
- Lớp Dashboard của Tài: `.dashboard-shell`, `.nexus-*`, `app-server-rail`, Command Center, message actions, friend menu, Atmospheres, Nexus Boot và Dashboard scrollbar.

Giữ global contract mới của team nhưng phải bảo toàn các block đã scope cho Dashboard. Sau khi tích hợp ổn, có thể đề xuất tách CSS Dashboard sang stylesheet riêng để giảm conflict; đây là thay đổi cấu trúc/file nên phải báo và được Tài duyệt trước.

#### App root và Auth transition

- Chỉ giữ một fallback trước bootstrap trong `index.html`.
- Root có thể chứa boot outlet tối thiểu; không sao chép logic Auth vào Dashboard.
- Nếu Auth có callback loader riêng, thống nhất một contract/state thay vì render hai overlay chồng nhau.
- Regression-test login, Google callback, F5 và lần đi vào `/channels`.

#### Theme

- Dùng một `ThemeService` toàn app và một storage key `nexuscord-theme`.
- Auth/Profile/Settings đọc cùng token; không tạo service hoặc storage key riêng.
- Atmosphere tiếp tục scope dưới `.dashboard-shell`, không phủ neutral palette riêng sang feature của người khác.

#### `ShellData` và API thật

- Không xoá public signal/method mà template hiện đang dùng.
- Giữ demo source tách khỏi live source; production mặc định demo OFF.
- Khi API có thật, thay phần live source bằng adapter/store phía trong thay vì sửa đồng loạt template.
- Nếu contract backend khác, tạo mapping có type và chuyển từng phase; không làm user mới quay lại dữ liệu giả mặc định.

#### AppLayout và shared component

- Resolve mỗi component theo bộ `TS + HTML + CSS + spec`, tránh trộn template mới với TS cũ.
- Giữ invariant về `min-width`, `min-height`, `overflow`, scroll owner và responsive drawer.
- Profile/Settings integration chỉ giữ seam/route cần thiết; không dựng hoặc sửa UI feature của người khác.

### Gate kiểm chứng trước khi nhập lại `page/tai`

Chỉ đưa nhánh integration trở lại `page/tai` khi đạt đủ:

1. `git diff --check` pass.
2. Toàn bộ unit/component test pass.
3. Browser/SSR/prerender build pass và không vượt CSS/bundle budget đã chốt.
4. Login và Google callback không hồi quy.
5. F5 light/dark không flash sai theme; Nexus Orbit không chạy khi đổi kênh nội bộ.
6. New user mặc định rỗng; demo bật/tắt được.
7. Sáu Atmospheres, Friends search và Command Center hoạt động.
8. Server group/reorder/ungroup có đủ feedback hình ảnh.
9. DM/Channel, message actions, context panel và empty states đúng.
10. Không có horizontal scrollbar ngoài ý muốn.
11. Profile/Settings/Auth của thành viên khác được smoke-test nếu chúng đã tồn tại.
12. Tài tự kiểm tra visual, drag/drop, scroll, responsive và dark/light trên browser thật.

Sau khi pass, mới merge/fast-forward kết quả integration về `page/tai`, push và mở/cập nhật PR theo quyết định của Tài.

## 10. Checklist bắt buộc trước khi merge/pull code team

1. Đọc `NEXUSCORD_HANDOFF.md` và file này.
2. Vào `nexus-fe`, kiểm tra `git branch --show-current` phải là `page/tai`.
3. Chạy `git status --short`; không pull/rebase khi chưa hiểu toàn bộ dirty files.
4. Không reset, checkout hoặc làm mất snapshot `ed0975f` cùng các file Theme Studio/Dashboard Appearance.
5. Kiểm tra hash remote `release/staging` mới nhất trước khi kết luận conflict.
6. Hỏi nhóm ai đang sửa các điểm nóng:
   - `src/styles.css`
   - `src/app/app.ts`, `app.html`, `index.html`
   - `layouts/app-layout/**`
   - `core/theme/**`
   - `core/api/shell-data/**`
   - `shared/ui/empty-state/**`
7. Sau khi code của team xuất hiện, so diff hai phía theo merge-base; không chỉ nhìn `git status`.
8. Resolve conflict theo hành vi, không chọn mù “ours” hoặc “theirs”.
9. Giữ các invariant của Dashboard:
   - tài khoản mới mặc định rỗng;
   - demo OFF mặc định;
   - theme persist qua route/F5;
   - server group/reorder/ungroup hoạt động;
   - không cuộn ngang shell;
   - Profile/Settings không có popup giả;
   - loader không chặn navigation nội bộ Dashboard.
10. Sau merge, regression-test ít nhất Auth login/callback, Dashboard Friends/DM/Channel, theme light/dark, Settings/Profile route nếu đã có.
11. Chạy build, toàn bộ unit/component test và `git diff --check`.
12. Tài tự kiểm tra visual, drag/drop, scroll và responsive trên browser thật.

## 11. Khi bắt đầu nối backend thật

- Không xoá `ShellData` hoặc demo contract trước khi API/schema được mentor/team chốt.
- Tách rõ live source và demo source; production không được tự bật demo.
- Không tự tạo hoặc thay database schema.
- Nếu cần schema mới, làm theo quy trình migration của skill và chờ mentor xác nhận.
- API thật phải giữ trạng thái loading/error/offline/reconnecting đã dựng ở Dashboard.
- Không biến UI action preview thành success giả trước khi backend trả kết quả.
- Search message content cần permission, pagination và backend contract; không nhét vào Command Center bằng dữ liệu giả.

## 12. Những việc Codex mới không được tự làm

- Không tự revert 35 file shared chỉ vì chúng nằm ngoài `features/dashboard/**`; nhiều file là ngoại lệ đã khai trong plan và Dashboard đang phụ thuộc vào chúng.
- Không tự move Theme Studio, Server Rail, ShellData hoặc EmptyState sang folder khác.
- Không tự refactor `src/styles.css` hoặc tách component/folder trước khi báo Tài và được duyệt.
- Không tự commit, push, rebase hoặc resolve conflict.
- Không sửa Auth/Profile/Settings để “đồng bộ giao diện” nếu người phụ trách chưa yêu cầu.
- Không cài dependency/plugin để xử lý merge.
- Không đánh giá conflict dựa trên branch remote cũ; phải kiểm tra hash hiện tại.

## 13. Prompt dành cho tài khoản Codex mới

```text
Đọc toàn bộ:
D:\minhtai_22401270\y2\TTNN\nexuscord\NEXUSCORD_HANDOFF.md
và
D:\minhtai_22401270\y2\TTNN\nexuscord\NEXUSCORD_MERGE_AUDIT.md

Sau đó kiểm tra branch, git status, merge-base và diff thật trong nexus-fe.
Tóm tắt riêng: Dashboard-owned files, shared/cross-cutting files, file người khác và backend/database.
Không sửa, reset, pull, rebase, commit hoặc resolve conflict trước khi báo Tài.
Đặc biệt kiểm tra src/styles.css, app root/index, layouts/app-layout, core/theme,
core/api/shell-data và shared/ui/empty-state nếu code team đã thay đổi.
Nếu cần tích hợp code team, bắt buộc dùng quy trình snapshot page/tai -> nhánh integration ->
merge --no-commit -> resolve theo ownership -> test/build/manual QA -> mới nhập lại page/tai.
```

---

Kết luận cho Codex tiếp nhận: code hiện không xâm phạm trực tiếp Auth/Profile/Settings/backend/database, nhưng có các ngoại lệ shared cần được merge có chủ đích. Đừng nhầm “Git không báo conflict” với “không có hồi quy giao diện”.
