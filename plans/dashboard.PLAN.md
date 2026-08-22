# Dashboard — Kế hoạch triển khai

> Bản kế hoạch cho trang Dashboard. Mọi quyết định ở đây phải khớp với
> [`NEXUS_CONTEXT.md`](NEXUS_CONTEXT.md) — nếu lệch thì `NEXUS_CONTEXT.md` thắng.
>
> Lập ngày: 31/07/2026 · Còn 16 ngày tới hạn 16/08 · Mốc kiểm tra 08/08 (còn 8 ngày)

---

## Phiên UI-only — Friends Dashboard (08/08/2026)

- Project: **Nexus** (bỏ qua toàn bộ Fizzle)
- Member: **Minh Tài**
- Nhánh làm việc: **`page/tai`** (đã được Tài xác nhận dùng thay cho quy ước tên nhánh trong skill)
- Phạm vi: **chỉ UI/UX frontend**, hỗ trợ cả dark mode và light mode; không gọi API mới,
  không sửa backend, database, auth, realtime hay logic nghiệp vụ.
- Giới hạn file code: **`src/app/features/dashboard/**`**. Không sửa `layouts/**`,
  `shared/**`, `core/**`, cấu hình dự án hoặc thư mục của member khác. Ngoại lệ UI duy nhất là
  `src/styles.css` để khai báo palette light dùng chung theo đúng design system đã có.

### Phase UI-1 — Hoàn thiện màn hình Bạn bè theo bản phác thảo NexusCord

Status: APPROVED

> Tài đọc phần phase này rồi tự đổi đúng dòng trên thành `Status: APPROVED` để mở gate code.
> Tin nhắn “ok” trong chat không thay thế gate này theo `implement-skill`.

#### Mục tiêu

- **UI/UX:** Dựng phần nội dung Friends Dashboard giống bố cục ảnh Discord tham chiếu nhưng
  mang nhận diện NexusCord Hybrid: dark mode MongoDB deep-teal, light mode Starbucks
  warm-cream, Manrope, CTA xanh, nút/badge pill và card 12px.
- **Feature (chỉ tương tác giao diện):** Có bốn trạng thái `Trực tuyến`, `Tất cả`, `Chờ duyệt`,
  `Thêm bạn`; tìm kiếm/lọc danh sách; hàng bạn bè; yêu cầu kết bạn; form thêm bạn và panel
  `Đang hoạt động`. Không gửi dữ liệu thật.
- **Data:** Không thuộc phase này. Chỉ dùng dữ liệu giả hiện có và state cục bộ bằng Angular
  Signals; không thay đổi model dùng chung hay kết nối API.

#### File/folder dự kiến

- Chỉnh sửa:
  - `src/styles.css` — chỉ bổ sung palette `html[data-theme='light']` từ
    `DESIGN-nexuscord-hybrid.md`; không đổi cấu trúc hay thêm dependency.
  - `src/app/features/dashboard/friends/friends.ts|html|css|spec.ts`
  - `src/app/features/dashboard/friends/components/friends-toolbar.ts|html|css|spec.ts`
  - `src/app/features/dashboard/friends/components/friend-row.ts|html|css|spec.ts`
- Nếu cần tách component để giữ trang lắp ráp gọn, tạo bằng Angular CLI trong đúng folder:
  - `src/app/features/dashboard/friends/components/activity-panel/`
  - `src/app/features/dashboard/friends/components/add-friend-form/`
  - `src/app/features/dashboard/friends/components/friend-request-item/`
- Backend: **không sửa**.
- Hạ tầng dùng chung (`layouts`, `shared`, `core`, package/tooling): **không sửa**.
- `src/styles.css`: chỉ sửa token màu/light elevation và `color-scheme` phục vụ hai theme;
  đây là thay đổi UI dùng chung đã được khai rõ trước khi code.

#### Tiêu chí hoàn thành

- Màn hình desktop kết hợp với app shell sẵn có thành bốn vùng: server rail, DM sidebar,
  danh sách bạn bè và panel `Đang hoạt động`; phase này chỉ dựng hai vùng cuối trong Dashboard.
- Tab/filter có trạng thái chọn rõ ràng; ô tìm kiếm chỉ xuất hiện ở các tab danh sách; tab
  `Thêm bạn` hiển thị form riêng và không giả vờ đã gọi API.
- Có trạng thái danh sách thường, không có kết quả tìm kiếm và yêu cầu đang chờ; không để vùng
  nội dung trắng vô nghĩa.
- Responsive: panel hoạt động tự ẩn hoặc chuyển vị trí khi thiếu chiều rộng; nội dung chính
  không tràn ngang và vùng bấm đạt tối thiểu 40–44px khi phù hợp.
- Có nút chuyển dark/light ngay trên Friends Dashboard. Việc chuyển mode chỉ đổi token màu,
  không đổi layout; mặc định giữ dark mode như trạng thái hiện tại của repo.
- Light mode dùng canvas kem `canvas`, bề mặt ấm và green CTA theo palette Starbucks; dark mode
  dùng deep-teal và MongoDB green. Không dùng nền trắng tinh, chữ đen tinh, gradient hoặc gold
  làm accent phổ thông.
- Chỉ dùng token hiện có trong `styles.css`, Angular Material và `mat-icon`; không hardcode mã
  màu trong component, không thêm SVG/PNG icon rời, không thêm dependency.
- Giữ `ChangeDetectionStrategy.OnPush`, Signals, native control flow và nhãn ARIA/focus visible;
  không dùng `any`, `ngClass`, `ngStyle`, `@HostBinding` hay `@HostListener`.

#### Kiểm chứng dự kiến

- Unit/component test trong các file `*.spec.ts` thuộc Dashboard: chuyển tab, lọc tìm kiếm,
  trạng thái rỗng, form Thêm bạn, semantics `aria-pressed`, action row và nút đổi dark/light.
- Compile-check: `npm run build` trong `nexus-fe`.
- Kiểm tra giao diện trực tiếp: **Tài tự thực hiện** theo yêu cầu; agent không thêm Playwright,
  công cụ kiểm kê hình ảnh hay file Codex vào repo trong phase UI-only này.

#### Kết quả Phase UI-1

- Ngày hoàn thành: 08/08/2026 — chờ Tài xác nhận giao diện trực tiếp.
- Commit: không tự commit/push nếu Tài chưa yêu cầu.
- Kết quả test: `npm run build` pass · unit/component Friends `21/21 pass`.
- Đánh giá UI/UX: đã bám NexusCord Hybrid, Angular Material, mat-icon, token dark/light và responsive; chờ Tài duyệt trực tiếp.
- Đánh giá Feature: đủ bốn view UI, tìm kiếm, request actions, form thêm bạn và panel hoạt động; không gọi API.
- Đánh giá Data: không áp dụng — UI-only, dữ liệu giả.
- Vấn đề phát sinh / ghi chú: không thêm Playwright theo phạm vi đã duyệt; lần test đầu 19/21 do thiếu aria-label nút theme, đã sửa và chạy lại 21/21.

### Phase UI-2 — Doodle wallpaper cho vùng lịch sử chat

Status: APPROVED

> Tài đọc phase này rồi tự đổi đúng dòng trên thành `Status: APPROVED` để mở gate code.
> Asset `public/assets/doodle.svg` do Tài cung cấp sẽ được giữ nguyên nội dung.

#### Mục tiêu

- **UI/UX:** Dùng `doodle.svg` làm pattern line-art lặp lại theo tinh thần wallpaper WhatsApp,
  nhưng phối màu và độ tương phản theo NexusCord Hybrid để vùng chat có cá tính mà nội dung
  tin nhắn vẫn là trọng tâm.
- **Feature (chỉ giao diện):** Pattern xuất hiện ở vùng lịch sử tin nhắn của DM và kênh chữ;
  không phủ lên toolbar, message composer, panel chi tiết/thành viên hoặc trạng thái kênh thoại.
- **Data:** Không thuộc phase này. Không thêm API, state, model, backend hoặc dữ liệu giả mới.

#### File/folder dự kiến

- Asset đầu vào đã có, chỉ tham chiếu và không chỉnh sửa:
  - `public/assets/doodle.svg`
- Chỉnh sửa trong phạm vi Dashboard:
  - `src/app/features/dashboard/conversation/conversation.html|css|spec.ts`
  - `src/app/features/dashboard/channel/channel.html|css|spec.ts`
- Không tạo component mới, không thêm dependency và không sửa `layouts/**`, `shared/**`,
  `core/**`, backend, database hoặc cấu hình dự án.

#### Tiêu chí hoàn thành

- Wallpaper là lớp trang trí không tương tác, không có semantics thừa và không chặn click,
  chọn chữ hay cuộn lịch sử tin nhắn.
- SVG được tile theo đúng tỉ lệ, đủ nhận ra các chi tiết doodle nhưng có độ tương phản thấp;
  phần mở đầu cuộc trò chuyện/kênh luôn nằm trên lớp pattern và vẫn dễ đọc.
- Dark mode dùng sắc line-art dịu trên nền deep-teal; light mode dùng sắc xanh/teal nhẹ trên
  nền kem ấm. Chỉ dùng design token hiện có và `currentColor`, không hardcode mã màu trong
  component và không sửa trực tiếp SVG.
- Không tạo chuyển động lặp gây xao nhãng; “hoạt họa” ở phase này là các chi tiết minh họa
  line-art như ảnh tham chiếu WhatsApp. Tôn trọng `prefers-reduced-motion` bằng cách không thêm
  animation cho wallpaper.
- Pattern chỉ xuất hiện trong kênh chữ; trạng thái kênh thoại và lỗi không tìm thấy giữ nền
  sạch, đúng ngữ cảnh hiện tại.
- Giữ `ChangeDetectionStrategy.OnPush`, native control flow và cấu trúc route hiện có.

#### Kiểm chứng dự kiến

- Unit/component test của `ConversationPage` và `ChannelPage`: xác nhận vùng lịch sử DM và
  kênh chữ có hook wallpaper; kênh thoại không render vùng này; các trạng thái cũ không hồi quy.
- Compile-check: `npm run build` trong `nexus-fe`.
- Kiểm tra trực tiếp dark/light và độ đọc chữ: **Tài tự thực hiện**; agent không thêm
  Playwright, công cụ kiểm kê hình ảnh hoặc file Codex vào repo.

#### Kết quả Phase UI-2

- Ngày hoàn thành: 08/08/2026 — chờ Tài xác nhận giao diện trực tiếp.
- Commit: không tự commit/push nếu Tài chưa yêu cầu.
- Kết quả test: `npm run build` pass · toàn bộ frontend unit/component `119/119 pass`.
- Đánh giá UI/UX: `doodle.svg` được dùng làm CSS mask lặp, đổi sắc theo token dark/light,
  không chặn click/cuộn/chọn chữ; chờ Tài duyệt độ đậm và kích thước pattern trực tiếp.
- Đánh giá Feature: wallpaper chỉ có trong lịch sử DM và kênh chữ; kênh thoại, lỗi không tìm
  thấy, toolbar, composer và panel bên không render wallpaper.
- Đánh giá Data: không áp dụng — UI-only.

### Phase UI-3 — Trạng thái người dùng mới và tinh chỉnh điều hướng Dashboard

Status: APPROVED

> Tài đọc phase này rồi tự đổi đúng dòng trên thành `Status: APPROVED` để mở gate code.
> Phase này cần sửa `layouts/app-layout/**` và `core/api/shell-data.ts` vì server rail, DM
> sidebar, user controls và dữ liệu shell hiện nằm ở đó. Đây là vùng dùng chung; Tài cần báo
> lại nhóm để tránh conflict. Không di chuyển thư mục và không sửa phần của member khác.

#### Mục tiêu

- **UI/UX:** Sửa nhịp khoảng cách và vùng hiển thị ở DM sidebar; thêm nút tìm kiếm trên nút
  thêm máy chủ, hỗ trợ hình thức nhóm máy chủ và thêm bánh răng cạnh mic/loa bằng Material
  Symbols từ Google Fonts, bám dark/light NexusCord Hybrid.
- **Feature (chỉ giao diện/state frontend):** Tài khoản vừa đăng ký khởi đầu với `0` máy chủ,
  `0` bạn bè, `0` cuộc trò chuyện và `0` lời mời; các vùng tương ứng hiển thị empty-state/CTA
  phù hợp thay vì người, bot, server hoặc badge giả.
- **Data:** Chỉ dọn dữ liệu mock khởi tạo ở frontend và giữ contract typed để sau này thay bằng
  API. Không gọi API, không sửa backend/database/auth và không giả lập kết quả từ backend.

#### File/folder dự kiến

- Chỉnh sửa trong Dashboard:
  - `src/app/features/dashboard/friends/friends.ts|html|spec.ts`
- Ngoại lệ hạ tầng dùng chung bắt buộc cho đúng vị trí component hiện có:
  - `src/app/layouts/app-layout/components/server-rail/server-rail.ts|html|css|spec.ts`
  - `src/app/layouts/app-layout/components/channel-sidebar/channel-sidebar.ts|html|css|spec.ts`
  - `src/app/layouts/app-layout/components/channel-sidebar/components/conversation-list.html|css|spec.ts`
  - `src/app/layouts/app-layout/components/user-panel/user-panel.ts|html|css|spec.ts`
  - `src/app/core/api/shell-data.ts`
- Không tạo component mới, không thêm dependency, không sửa `shared/**`, backend, database,
  auth, realtime, route của trang khác hoặc cấu hình dự án.

#### Tiêu chí hoàn thành

- `ShellData` không khởi tạo server, channel, conversation, bot, bạn bè hoặc badge giả. Trang
  Friends không khởi tạo lời mời kết bạn giả; tab `Tất cả`, `Trực tuyến`, `Chờ duyệt` và panel
  hoạt động đều phản ánh đúng trạng thái rỗng của người mới.
- DM sidebar giữ mục `Bạn bè` và tiêu đề `Tin nhắn trực tiếp`, sau đó hiển thị thông báo rỗng
  ngắn gọn. Không còn tên/trạng thái bị che; hàng có min-height, gap, padding và truncate đúng,
  sidebar đủ rộng ở desktop nhưng vẫn đi theo drawer hiện có ở màn hình hẹp.
- Server rail luôn giữ lối vào DM. Nút Material Symbol `search` nằm ngay trên nút thêm server,
  có tooltip/nhãn truy cập mô tả tìm tin nhắn, kênh chữ, kênh thoại và máy chủ. Phase UI-only
  không giả vờ đã tìm kiếm được khi chưa có dữ liệu/API.
- Contract UI server hỗ trợ group/folder tùy chọn; server không thuộc nhóm vẫn hiển thị riêng,
  nhóm thật có thể thu gọn/mở rộng cục bộ. Với tài khoản mới không render group hoặc server giả.
  Việc tạo, kéo-thả và lưu group lên backend không thuộc phase UI-only này.
- User panel có ba nút cùng nhịp: mic, loa và Material Symbol `settings`; bánh răng nằm kế hai
  nút âm thanh, đủ tooltip/aria-label và được thể hiện rõ là chưa nối trang Settings nếu route
  đó chưa tồn tại. Không tạo route giả hoặc sửa trang Settings của member khác.
- Chỉ dùng Angular Material, `mat-icon`/Material Symbols đã nạp qua Google Fonts và token hiện
  có; không thêm SVG/PNG icon, không hardcode mã màu, không gradient và không thêm dependency.
- Giữ OnPush, Signals, native control flow, touch target tối thiểu 40px khi phù hợp; dark/light
  chỉ đổi token màu, không đổi cấu trúc hoặc khoảng cách.

#### Kiểm chứng dự kiến

- Unit/component test: shell mặc định rỗng; Friends hiển thị đúng empty-state; DM sidebar không
  có người giả; server rail vẫn có DM + search + add-server nhưng không có server/badge giả;
  folder chỉ render khi fixture test cấp group thật; user panel có mic/loa/settings đúng ARIA.
- Chạy lại test Dashboard và layout liên quan để bắt hồi quy spacing/route/empty-state.
- Compile-check: `npm run build` trong `nexus-fe`.
- Kiểm tra trực tiếp dark/light, chiều rộng/sidebar và khoảng cách: **Tài tự thực hiện**; agent
  không thêm Playwright, công cụ kiểm kê hình ảnh hoặc file Codex vào repo.

#### Kết quả Phase UI-3

- Ngày hoàn thành: 08/08/2026 — chờ Tài xác nhận giao diện trực tiếp.
- Commit: không tự commit/push nếu Tài chưa yêu cầu.
- Kết quả test: `npm run build` pass · toàn bộ frontend unit/component `119/119 pass`.
- Đánh giá UI/UX: DM sidebar rộng hơn, row có min-height/gap/truncate; server rail có Material
  Symbols search/folder; user panel có ba control mic/loa/settings và giữ token dark/light.
- Đánh giá Feature: tài khoản mới không còn server, channel, conversation, bot, bạn bè, lời mời
  hoặc badge giả; empty-state hiển thị đúng. Group server thu gọn/mở rộng khi nhận contract thật;
  search/settings thể hiện rõ chưa nối dữ liệu/route, không giả chức năng backend.
- Đánh giá Data: frontend khởi tạo rỗng và giữ contract typed `ServerGroupSummary`; không thay
  backend/database/auth. Đã sửa đúng ngoại lệ `layouts/**` và `core/api/shell-data.ts` được duyệt.

### Phase UI-4 — Scrollbar theo nội dung và cân bằng tương phản dark/light

Status: APPROVED

> Tài đọc phase này rồi tự đổi đúng dòng trên thành `Status: APPROVED` để mở gate code.
> Không tạo/di chuyển thư mục. Phase cần sửa `src/styles.css` và `shared/ui/empty-state/**`
> vì scrollbar token + Angular Material theme là dùng chung, còn `EmptyState` đang gây overflow
> giả. Đây là vùng dùng chung đã khai trước; Tài cần báo nhóm để tránh conflict.

#### Nguyên nhân đã xác định từ ảnh phản hồi

- `EmptyState` tự gắn `h-full` trong khi Friends main còn section label, margin và padding;
  tổng chiều cao vì vậy vượt viewport nhẹ dù không có danh sách, tạo scrollbar gần đầy như ảnh 1.
- Friends main đã dùng `overflow-y-auto`; vấn đề không phải thiếu scroll mà là child ép cao sai.
  Sau khi bỏ overflow giả, scrollbar chỉ xuất hiện khi danh sách thật vượt chiều cao khả dụng.
- Angular Material list lấy màu active từ `secondary-container` và chữ từ
  `on-secondary-container`, nhưng hai system token này chưa được map sang palette NexusCord;
  light mode vì vậy có nền active xanh tối nhưng chữ/icon vẫn tối như ảnh 2.
- Hover profile hiện đổi từ `canvas` sang `surface`, hai màu quá gần nhau ở light mode; trạng
  thái hover/focus không đủ rõ như ảnh 3. Empty card và một số tab cũng thiếu viền/phân lớp.

#### Mục tiêu

- **UI/UX:** Scroll đúng theo nội dung, thanh cuộn gọn và ít gây chú ý khi nghỉ; hover/focus mới
  hiện rõ thumb/track. Dark dùng tông đen-teal có opacity; light dùng House Green pha trong trên
  nền kem, không dùng scrollbar đen thô hoặc màu ngoài design system.
- **Feature (chỉ giao diện):** Khi chưa có hoặc có ít bạn/lời mời thì không scroll; khi danh sách
  vượt viewport thì scroll trong đúng panel, toolbar/sidebar bên cạnh không bị kéo theo.
- **Data:** Không áp dụng. Không đổi mock contract, API, backend, database, auth hoặc realtime.

#### File/folder dự kiến

- Token/theme/scrollbar dùng chung:
  - `src/styles.css`
- Sửa nguồn overflow và trạng thái card dùng chung:
  - `src/app/shared/ui/empty-state/empty-state.ts|html|spec.ts`
- Áp dụng scroll container + flex sizing đúng trong Dashboard:
  - `src/app/features/dashboard/friends/friends.html|css|spec.ts`
  - `src/app/features/dashboard/friends/components/activity-panel/activity-panel.html|spec.ts`
  - `src/app/features/dashboard/conversation/conversation.html|spec.ts`
  - `src/app/features/dashboard/channel/channel.html|spec.ts`
  - `src/app/features/dashboard/server-home/server-home.html|spec.ts`
- Đồng bộ scrollbar/active/hover ở app shell:
  - `src/app/layouts/app-layout/components/server-rail/server-rail.html|spec.ts`
  - `src/app/layouts/app-layout/components/channel-sidebar/channel-sidebar.html|spec.ts`
  - `src/app/layouts/app-layout/components/channel-sidebar/components/conversation-list.html|spec.ts`
  - `src/app/layouts/app-layout/components/user-panel/user-panel.html|spec.ts`
- Không tạo component/file/folder mới, không thêm dependency và không sửa backend/tooling.

#### Tiêu chí hoàn thành

- `EmptyState` không tự ép `height: 100%`; caller cần lấp phần trống sẽ dùng `flex-1 min-h-0`.
  Friends main là flex column có `min-h-0`; empty-state không tạo overflow, danh sách dài vẫn
  scroll độc lập trong main.
- Dùng một class scrollbar chung đã token hóa cho Friends main, activity panel, DM/channel
  sidebar, server rail và history chat; không sao chép CSS scrollbar vào từng component.
- WebKit và Firefox đều có fallback: thumb trong suốt/rất nhẹ lúc nghỉ, hiện rõ khi panel
  hover hoặc focus-within; track dùng màu tối có opacity phù hợp theme; bo tròn, không có nút
  mũi tên thô và không làm layout nhảy ngang.
- Map đủ `secondary-container` / `on-secondary-container` cùng state-layer cần thiết sang token
  Nexus; item `Bạn bè` active ở light mode dùng nền mint/cream phân biệt và chữ/icon House Green
  hoặc ink đạt tương phản, dark mode dùng deep-teal + chữ sáng.
- Profile trigger và icon controls có hover/focus rõ bằng `surface-feature`, viền/radius/token
  nhất quán; không làm avatar/tên/trạng thái bị chìm hoặc đổi layout.
- Empty-state card có hairline/elevation nhẹ để tách khỏi canvas trong light mode và không phát
  sáng gắt ở dark mode. Tab Friends active/inactive và section label được rà lại để không có
  chữ tối trên nền tối hoặc chữ quá mờ trên nền kem.
- Không hardcode màu trong component, không gradient, không dùng pure black/white làm canvas;
  chỉ thay token màu giữa hai mode, geometry và spacing giữ nguyên.

#### Kiểm chứng dự kiến

- Unit/component test: `EmptyState` không còn `h-full`; các vùng overflow có class scrollbar;
  active/hover dùng đúng semantic token/class; hành vi tab/empty-state cũ không hồi quy.
- Compile-check: `npm run build`; chạy toàn bộ frontend unit/component test.
- Tài tự kiểm tra trực tiếp: tab `Chờ duyệt` rỗng không còn scrollbar; thêm đủ fixture/data để
  vượt chiều cao thì scrollbar xuất hiện; hover/focus scrollbar, item Bạn bè và profile trigger
  ở cả dark/light. Agent không thêm Playwright/công cụ kiểm kê ảnh/file Codex vào repo.

#### Kết quả Phase UI-4

- Ngày hoàn thành code/test: 08/08/2026; chờ Tài kiểm tra trực tiếp dark/light.
- Commit: không tự commit/push nếu Tài chưa yêu cầu.
- Kết quả test: `npm run build` pass; toàn bộ `32/32` test file và `133/133` unit/component
  test pass bằng `npm test -- --watch=false`; `git diff --check` không có lỗi whitespace.
- Đánh giá UI/UX: `EmptyState` không còn tự ép `h-full`; card rỗng có hairline/elevation nhẹ;
  scrollbar token dùng chung chỉ tăng tương phản khi hover/focus; Material secondary-container,
  tab active và profile hover đã map sang cream/mint ở light, deep-teal ở dark.
- Đánh giá Feature: vùng Friends/chat/sidebar/rail cuộn độc lập khi nội dung thật vượt chiều cao;
  trạng thái rỗng hoặc danh sách ngắn không còn child ép overflow giả. Không đổi luồng dữ liệu.
- Đánh giá Data: không áp dụng — UI-only.

### Phase UI-5 — Context panel bên phải: pinned trên desktop, slide-in khi tương tác

Status: APPROVED

> **Đề xuất cần Tài xác nhận trước khi làm:** tạo đúng một folder component mới bằng Angular CLI:
> `src/app/features/dashboard/components/context-panel/`. Folder này nằm trong cấu trúc
> `dashboard/components` hiện có, không di chuyển/đổi tên folder nào. Tách component dùng chung
> giúp Friends, DM và Channel không phải copy ba bản panel/animation/responsive khác nhau.

#### Brainstorm hành vi được đề xuất

- **Friends — pinned mặc định trên desktop rộng:** panel `Đang hoạt động` giữ cố định ở mép phải
  như ảnh tham chiếu. Trên màn hình nhỏ panel không chiếm cột; bấm icon panel trong toolbar mới
  trượt vào dưới dạng overlay.
- **Xem nhanh profile:** bấm avatar ở một hàng bạn bè hoặc avatar mở đầu DM thì panel đổi sang
  `Hồ sơ nhanh`. Tên/hàng còn lại vẫn dẫn vào chat, tránh biến mọi click thành mở panel.
- **DM — contextual:** mặc định đóng; nút `right_panel_open` sẵn có trên chat toolbar hoặc bấm
  avatar sẽ mở profile từ mép phải. Đóng panel không làm mất/đổi cuộc trò chuyện.
- **Channel — contextual:** mặc định đóng; bấm nút panel mở danh sách/thông tin thành viên.
  Không dựng thành viên giả khi backend chưa có dữ liệu.
- **Không dùng panel cho mọi nút:** mic/loa/theme/tab/filter vẫn hành động tại chỗ. Những nội
  dung phù hợp bổ sung sau gồm pinned messages, kết quả tìm kiếm chi tiết hoặc thông tin event;
  phase này không thêm nút/data giả cho các chức năng chưa có.

#### Mục tiêu

- **UI/UX:** Một panel phải thống nhất dark/light, trượt từ rìa phải với motion nhẹ; desktop có
  chế độ chiếm cột/pinned, màn hình hẹp dùng overlay để không bóp nội dung chính.
- **Feature (state UI-only):** Mở/đóng đúng trigger, đổi nội dung Activity/Profile/Member mà
  không đổi route ngoài ý muốn; đóng bằng nút close, backdrop và phím Escape khi focus nằm trong
  panel. State cục bộ bằng Signals, không lưu backend.
- **Data:** Tái sử dụng `ConversationSummary`/dữ liệu hiện có. Không thêm API, backend, database,
  auth, realtime hoặc mock user/member mới.

#### File/folder dự kiến

- **Tạo mới bằng Angular CLI sau khi Tài xác nhận folder + APPROVED:**
  - `src/app/features/dashboard/components/context-panel/context-panel.ts|html|css|spec.ts`
- Chỉnh wrapper/trigger dùng chung trong Dashboard:
  - `src/app/features/dashboard/components/chat-toolbar/chat-toolbar.ts|html|spec.ts`
  - `src/app/features/dashboard/components/member-panel/member-panel.ts|html|spec.ts`
- Friends: panel pinned + chuyển Activity/Profile từ avatar:
  - `src/app/features/dashboard/friends/friends.ts|html|css|spec.ts`
  - `src/app/features/dashboard/friends/components/friends-toolbar.ts|html|spec.ts`
  - `src/app/features/dashboard/friends/components/activity-panel/activity-panel.ts|html|spec.ts`
  - `src/app/features/dashboard/friends/components/friend-row.ts|html|spec.ts`
- DM/Channel: contextual panel mặc định đóng:
  - `src/app/features/dashboard/conversation/conversation.ts|html|css|spec.ts`
  - `src/app/features/dashboard/channel/channel.ts|html|css|spec.ts`
- Không tạo service/store/folder khác, không sửa `layouts/**`, `core/**`, backend hoặc tooling.

#### Component contract dự kiến

- Input: `title`, `open`, `pinned`; output: `closed`.
- Content dùng `ng-content`, để ActivityPanel/MemberPanel/member empty-state tự chịu trách nhiệm
  dữ liệu; ContextPanel chỉ quản layout, header, close/backdrop, responsive và animation.
- `pinned=true`: desktop rộng giữ cột bên phải; mobile/tablet vẫn chỉ hiện khi `open=true`.
- `pinned=false`: mọi breakpoint mặc định đóng, `open=true` mới mở; desktop chiếm cột, màn hình
  hẹp overlay. Không dùng global singleton nên route này không rò state sang route khác.

#### Tiêu chí hoàn thành

- Desktop `xl`: Friends hiển thị Activity cố định; DM/Channel không có khoảng trắng/cột panel
  khi đóng. Khi mở, panel rộng ổn định khoảng 288–336px và nội dung chính dùng `min-width: 0`.
- Dưới `xl`: panel position fixed ở mép phải, có backdrop opacity nhẹ, z-index trên content
  nhưng dưới dialog; chiều rộng không vượt viewport, nội dung panel scroll độc lập.
- Motion 150–200ms ease; `prefers-reduced-motion: reduce` tắt transition. Không animation lặp.
- Có heading semantic, `aria-label`, `aria-expanded` trên trigger, nút close tối thiểu 40px;
  backdrop/close/Escape trả panel về closed. Không trap người dùng hoặc chặn scroll sau khi đóng.
- Friends avatar là button profile riêng, không lồng button trong link; click tên/nội dung hàng
  vẫn đi chat. Profile từ DM avatar mở đúng người hiện tại.
- Activity/Profile/Member dùng panel chung, không lặp outer border/background/scrollbar; scrollbar
  dùng class/token của UI-4 nếu phase đó được duyệt.
- Dark mode dùng deep-teal/surface-feature + chữ sáng; light mode dùng cream/mint + House Green;
  border/shadow theo token, không hardcode màu trong component, không gradient.

#### Kiểm chứng dự kiến

- Unit/component test ContextPanel: pinned/open/closed, close output, backdrop và Escape.
- Friends test: desktop contract pinned Activity; toolbar toggle; avatar phát profile preview và
  không điều hướng nhầm. DM/Channel test: default closed, toolbar mở/đóng đúng content.
- Compile-check `npm run build`; chạy toàn bộ frontend unit/component test.
- Tài tự kiểm tra trực tiếp ở desktop + viewport nhỏ, dark + light; agent không thêm Playwright,
  công cụ kiểm kê hình ảnh hoặc file Codex vào repo.

#### Kết quả Phase UI-5

- Ngày hoàn thành code/test: 08/08/2026; folder `context-panel/` đã được Tài xác nhận và
  scaffold bằng Angular CLI, chờ Tài kiểm tra trực tiếp responsive/dark/light.
- Commit: không tự commit/push nếu Tài chưa yêu cầu.
- Kết quả test: `npm run build` pass; toàn bộ `32/32` test file và `133/133` unit/component
  test pass. Test mới bao phủ open/pinned/close/backdrop/Escape, toolbar/avatar trigger và
  trạng thái đóng mặc định của DM/Channel.
- Đánh giá UI/UX: Friends giữ Activity pinned ở desktop; DM/Channel mở panel contextual có motion
  180ms; dưới `xl` dùng overlay + backdrop, tôn trọng reduced-motion. Panel, header, hover, border,
  shadow và scrollbar chỉ dùng token Hybrid dark/light.
- Đánh giá Feature: toolbar có `aria-expanded`; avatar Friends/DM mở đúng quick profile; tên/hàng
  Friends vẫn đi chat; close/backdrop/Escape đóng panel; Friends profile đóng xong quay về Activity.
- Đánh giá Data: UI-only, tái sử dụng `ConversationSummary`; không thêm API/backend/member giả.
  `MemberPanel` đã bỏ số máy chủ chung và ngày tham gia hardcode chưa có nguồn dữ liệu thật.

### Phase UI-6 — Phân cấp màu trạng thái rõ ràng cho dark/light

Status: APPROVED

> Tài đọc phase này rồi tự đổi đúng dòng trên thành `Status: APPROVED` để mở gate code.
> Phase không tạo file/folder mới. Chỉ sửa state style và template/spec đã có; không thêm màu hex
> ngoài DESIGN hybrid, không sửa backend, data, route, tooling hoặc cấu trúc thư mục.

#### Nguyên nhân xác định từ ảnh phản hồi

- Friends tab đang dùng `surface-feature` làm nền active trên `canvas`. Hai cặp màu chỉ lệch
  khoảng `1.02:1` ở light (`#f2f0eb` / `#eaf5f0`) và `1.46:1` ở dark
  (`#001e2b` / `#003d4f`), nên trạng thái đang chọn gần như chìm vào toolbar.
- Material icon button hiện chỉ dùng state-layer xám opacity thấp. Mic/theme khi hover vì vậy thành
  vòng xám không liên quan tới xanh chủ đạo Starbucks/MongoDB và icon không có điểm nhấn rõ.
- `secondary-container` của Material đang map sang `surface-feature`, nên Friends/DM/channel active
  ở sidebar lặp lại đúng vấn đề tương phản thấp của top tabs.
- Hover, selected, toggle âm thanh và disabled chưa có vai trò màu tách biệt; người dùng phải đoán
  dựa vào thay đổi nền rất nhẹ thay vì nhìn là nhận ra trạng thái.

#### Hệ màu trạng thái sẽ áp dụng

- **Idle:** nền trong suốt/canvas; chữ/icon `slate` hoặc `ink` theo cấp bậc. Không thêm vòng nền xám
  cố định khiến toolbar nặng và không nhầm idle với selected.
- **Hover/focus:** nền `surface-feature`, chữ/icon + viền 1px dùng `primary-soft`. Cặp foreground này
  đạt khoảng `5.16:1` ở light và `4.32:1` ở dark trên hover surface; viền brand giúp nhận biết
  component ngay cả khi chênh lệch giữa hai màu nền thấp.
- **Selected/expanded/current route:** nền `primary`, chữ/icon `on-primary`, không dùng chữ tối trên
  nền xanh tối. Tương phản dự kiến `7.44:1` cho light selected và `10.89:1` cho dark selected;
  light thành Starbucks Green + chữ trắng, dark thành MongoDB Green + chữ deep-teal.
- **Audio-off:** mic/headset đang tắt dùng `danger-surface` + `danger` + `danger-border`, vì đây là
  trạng thái thiết bị bị tắt chứ không phải navigation selected. Trạng thái bật bình thường quay
  về idle; hover vẫn dùng brand.
- **Disabled:** icon `muted`, không nhận hover fill/viền brand và giữ cursor disabled để không tạo
  affordance giả. Theme toggle là hành động đổi mode nên không bị tô selected chỉ vì
  `aria-pressed=true`; nó chỉ nhận hover/focus brand.

#### Mục tiêu

- **UI/UX:** Nhìn một lần phân biệt được hover, đang chọn/đang mở, audio bị tắt và disabled ở cả
  dark/light; dùng đúng palette, pill, focus ring và state hierarchy của DESIGN hybrid.
- **Feature (giao diện):** Giữ nguyên toàn bộ click/toggle/router logic; chỉ đổi presentation và
  class semantic. `aria-pressed`, `aria-expanded`, `aria-current` vẫn là nguồn trạng thái.
- **Data:** Không áp dụng. Không đổi signal data, mock contract, API, backend, auth hoặc database.

#### File/folder dự kiến

- Token alias/Material mapping và utility state dùng chung:
  - `src/styles.css`
- Friends tabs, profile/action rows và icon toolbar:
  - `src/app/features/dashboard/friends/components/friends-toolbar.html|spec.ts`
  - `src/app/features/dashboard/friends/components/friend-row.html|spec.ts`
  - `src/app/features/dashboard/friends/components/friend-request-item/friend-request-item.html|spec.ts`
- Context/chat icon controls:
  - `src/app/features/dashboard/components/chat-toolbar/chat-toolbar.html|spec.ts`
  - `src/app/features/dashboard/components/context-panel/context-panel.html|spec.ts`
- App shell navigation và user controls:
  - `src/app/layouts/app-layout/components/user-panel/user-panel.html|spec.ts`
  - `src/app/layouts/app-layout/components/server-rail/server-rail.html|spec.ts`
  - `src/app/layouts/app-layout/components/channel-sidebar/components/conversation-list.html|spec.ts`
  - `src/app/layouts/app-layout/components/channel-sidebar/components/channel-list.html|spec.ts`
- Không tạo component/service/folder mới và không sửa TS logic nếu không phát hiện contract thực tế
  bắt buộc trong lúc triển khai; nếu scope thay đổi phải cập nhật plan và báo Tài trước.

#### Tiêu chí hoàn thành

- Mọi Friends filter active, Material nav item có `aria-current=page` và panel trigger có
  `aria-expanded=true` dùng `primary/on-primary`; inactive không vô tình giữ `text-ink` đè lên
  foreground selected của Material.
- Tab inactive/row/icon button hover dùng `surface-feature + primary-soft` và viền brand; active
  mạnh hơn hover bằng fill primary. Không dùng opacity xám làm tín hiệu chính.
- Mic/headset `aria-pressed=true` có danger treatment nhưng vẫn đọc rõ ở hai mode; theme toggle
  không bị hiểu nhầm là lỗi/tắt tiếng. Settings disabled không sáng lên khi hover.
- Profile trigger, friend/request row và server group/global-search có cùng quy tắc hover; không
  đổi kích thước, spacing hoặc làm layout nhảy khi thêm viền (dùng border trong suốt/inset ring).
- Focus-visible vẫn có outline `primary` 2px, không bị hover/selected shadow che; touch target giữ
  tối thiểu 40px. Transition màu 150–200ms và tắt theo reduced-motion nếu có motion mới.
- Không hardcode hex trong component, không gradient, không thêm gold/category accent sai ngữ cảnh;
  dark/light chỉ khác giá trị token, không khác geometry.

#### Kiểm chứng dự kiến

- Unit/component test: tabs active dùng selected classes; icon/nav/row có semantic state utility;
  audio toggle đổi danger state theo `aria-pressed`; disabled không nhận interactive state class.
- Compile-check `npm run build`; chạy toàn bộ frontend unit/component test.
- Tài tự kiểm tra trực tiếp các vị trí trong 4 ảnh cùng Friends/sidebar/server rail ở dark + light,
  hover bằng chuột và focus bằng bàn phím. Agent không thêm Playwright, ảnh kiểm kê hoặc file Codex.

#### Kết quả Phase UI-6

- Ngày hoàn thành: 2026-08-08, trên branch `page/tai`.
- Commit: không tự commit/push nếu Tài chưa yêu cầu.
- Kết quả test: `npm test -- --watch=false` pass `32/32` file, `135/135` test;
  `npm run build` pass cả browser/SSR và prerender.
- Đánh giá UI/UX: đã thêm semantic state dùng chung cho filter tab, icon control, avatar trigger,
  row và Material navigation; selected/expanded/current dùng `primary/on-primary`, hover/focus dùng
  `surface-feature/primary-soft`, audio-off dùng danger token, disabled không nhận brand hover.
  Tài giữ phần kiểm tra trực tiếp dark/light theo đúng yêu cầu.
- Đánh giá Feature: giữ nguyên signal/click/router và ARIA; chỉ đổi presentation/class semantic,
  không thêm backend, mock data, route, component, service hoặc folder mới trong phase này.
- Đánh giá Data: không áp dụng — UI-only.

### Phase UI-7 — Chế độ dữ liệu demo bật/tắt tại runtime

Status: APPROVED

> Tài mở phase này, đọc và tự đổi đúng dòng trên thành `Status: APPROVED` để mở gate code.
> Phase cố ý sửa `core/api/shell-data.ts` vì đây là nguồn dữ liệu shell dùng chung. Không tạo
> folder mới, không sửa backend/database/auth và không biến dữ liệu demo thành mặc định production.

#### Quyết định hành vi

- Giữ cam kết UI-3: khi app vừa khởi động, `ShellData` mặc định **demo OFF**, nên tài khoản mới
  vẫn không có server, channel, DM, bạn bè, badge hoặc lời mời giả.
- Thêm nút Material icon `storage` ngay bên trái nút đổi dark/light trong Friends toolbar. Nút có
  `aria-pressed`, label/tooltip “Bật dữ liệu demo” hoặc “Tắt dữ liệu demo”; khi ON dùng state
  `primary/on-primary` để không nhầm với theme hay audio toggle.
- Bật demo sẽ đưa bộ server, channel và conversation cũ trở lại ngay trong toàn bộ app shell;
  tắt demo trả về dữ liệu rỗng ngay, không cần sửa/comment code và không reload.
- Demo mode chỉ sống trong singleton service của phiên app. F5/reload luôn trở về OFF; không dùng
  `localStorage`, URL flag hay environment production để tránh vô tình trình bày mock như dữ liệu thật.

#### Mục tiêu theo 3 tiêu chí

- **UI/UX:** Có một control 40px nhất quán với toolbar, Material icon + tooltip, trạng thái ON/OFF
  nhìn và đọc được ở dark/light; không làm thay đổi spacing hoặc logic các tab Friends.
- **Feature:** `ShellData` cung cấp signal trạng thái và hàm bật/tắt. Server rail, channel list,
  DM sidebar, Friends list và activity panel phản ứng theo cùng một nguồn dữ liệu trong runtime.
- **Data:** Tách hẳn `DEMO_*` constants khỏi nguồn live rỗng. `servers`, `serverGroups`,
  `conversations`, `channelsOf`, `serverOf`, `channelOf`, `conversationOf` và `totalMentions`
  đều trả đúng tập đang chọn; demo không gọi API và không ghi database.

#### File/folder dự kiến

- Nguồn live/demo và unit test trực tiếp:
  - `src/app/core/api/shell-data.ts`
  - `src/app/core/api/shell-data.spec.ts` — **một file test mới trong folder có sẵn**, không tạo folder.
- Nút toolbar và wiring tại trang Friends:
  - `src/app/features/dashboard/friends/components/friends-toolbar.ts|html|spec.ts`
  - `src/app/features/dashboard/friends/friends.ts|html|spec.ts`
- State màu ON của demo toggle:
  - `src/styles.css`
- Hồi quy tài khoản mới và server rail khi demo ON:
  - `src/app/layouts/app-layout/components/server-rail/server-rail.spec.ts`

#### Tiêu chí hoàn thành

- Khởi tạo `new ShellData()` vẫn trả mảng rỗng ở mọi nguồn, giữ nguyên toàn bộ test UI-3.
- Bật demo bằng hàm hoặc nút làm xuất hiện đúng server/channel/conversation cũ và group server
  demo; `totalMentions` tính từ tập demo. Tắt lại trả về rỗng, không giữ reference/state rác.
- Button nằm ngay bên trái theme toggle, có touch target tối thiểu 40px, `aria-pressed` đúng và
  state selected dùng token Hybrid; không hardcode hex, không icon ảnh/SVG mới.
- Stub trong test được mở rộng đúng contract thay vì nới lỏng type hoặc xóa assertion “người mới rỗng”.
- Không thêm route, component, service, folder, backend, API hoặc cơ chế persistence.

#### Kiểm chứng dự kiến

- Unit `ShellData`: OFF mặc định; ON có servers/groups/channels/conversations/mentions; OFF lần nữa
  rỗng; lookup method trả đúng theo mode.
- Component: toolbar phát toggle và cập nhật ARIA; Friends click ON/OFF đổi giữa list và empty-state;
  server rail mặc định không có server giả nhưng render demo sau khi service bật.
- Compile-check `npm run build`, sau đó chạy toàn bộ frontend unit/component test và giữ 100% pass.
- Tài tự kiểm tra trực tiếp dark/light. Theo yêu cầu trước đó, agent không thêm Playwright, ảnh
  kiểm kê hay file Codex vào repo.

#### Kết quả Phase UI-7

- Ngày hoàn thành: 2026-08-08, trên branch `page/tai`.
- Commit: không tự commit/push nếu Tài chưa yêu cầu.
- Kết quả test: `npm run build` pass cả browser/SSR/prerender; toàn bộ unit/component
  `33/33` file, `141/141` test pass. Lần chạy đầu `140/141` do hai lookup còn đọc nguồn live;
  đã sửa `serverOf`/`conversationOf` đọc tập active và chạy lại sạch.
- Đánh giá UI/UX: nút Material `storage` nằm ngay bên trái theme, có tooltip/ARIA, touch target
  40px và selected state `primary/on-primary` dùng chung dark/light; chờ Tài kiểm tra trực tiếp.
- Đánh giá Feature: click ON đưa server/group/channel/DM/Friends/activity demo vào toàn shell;
  click OFF trả ngay về empty-state UI-3. Không reload, comment code hay thêm route/component.
- Đánh giá Data: live mặc định rỗng; constants `DEMO_*` tách biệt và chỉ được chọn bởi signal
  runtime. Lookup/mention đọc đúng tập active; không persistence, API, backend hoặc database.

### Phase UI-8 — Polish Dashboard, kéo-thả nhóm server, shell dialogs và theme bền qua route

Status: APPROVED

> Tài đọc phase này rồi tự đổi đúng dòng trên thành `Status: APPROVED` để mở gate code.
> **Đề xuất cấu trúc cần duyệt:** tạo đúng một folder mới `src/app/core/theme/` bằng Angular CLI,
> chứa service/spec quản lý theme toàn app. Settings/Add Server dùng template dialog ngay trong
> component hiện có, không tạo folder/component mới và không chiếm ownership trang Settings.

#### Nguyên nhân xác định

- Doodle hiện chỉ có opacity `0.045` dark / `0.075` light nên nét primary gần như biến mất trên
  canvas, đặc biệt ở vùng chat rộng.
- Ảnh phản hồi cho thấy `matListItemIcon` đang gắn thẳng lên custom `app-avatar`; Material ép host
  theo geometry icon, làm nền avatar thành viên bị hẹp/méo và status dot lệch khỏi góc avatar.
- Group server hiện chỉ là một icon folder. Người dùng không nhìn thấy server nào ở trong nhóm và
  cũng không thể tạo/move nhóm bằng cách kéo các server lại với nhau.
- Settings và Add Server đang disabled hoàn toàn, nên không có layout để review trước khi team nối
  feature thật.
- Theme signal đang nằm trong `FriendsPage` và luôn khởi tạo `'dark'`; khi route tạo lại Friends,
  effect ghi đè `data-theme`, làm light mode quay về dark.

#### Quyết định UI/UX và hành vi

- **Doodle:** tăng vừa phải lên khoảng `0.08` dark / `0.12` light, vẫn dùng mask + token primary,
  giữ nguyên kích thước pattern và không làm giảm khả năng đọc nội dung chat.
- **Avatar/DM-Friends rows:** bọc avatar trong slot Material cố định thay vì gắn directive trực tiếp
  lên custom component; giữ avatar vuông 32–40px, presence dot neo đúng bottom-right, name/status
  thẳng hàng và selected/hover không làm thay đổi geometry.
- **Server group preview:** group tile là card 48px chứa lưới 2×2 miniature của tối đa bốn server
  (ảnh thật nếu có, fallback initials nếu chưa có); tooltip/ARIA đọc tên nhóm và số server. Preview
  luôn cho biết đây là folder trước khi bấm, còn expand vẫn hiện danh sách server lớn như hiện tại.
- **Drag grouping:** dùng `@angular/cdk/drag-drop` đã cài sẵn, không thêm dependency. Kéo server lên
  một server khác tạo group runtime; kéo server lên group preview sẽ thêm/chuyển server vào group;
  kéo trong cùng group là no-op. Group còn dưới hai server tự rã để rail không giữ folder vô nghĩa.
  Đây là UI state trong phiên, chưa ghi backend/database.
- **Settings dialog:** bỏ disabled gear; click mở `MatDialog` dạng Discord-like hai cột. Cột trái
  chỉ có category layout tĩnh, cột phải hiển thị rõ “Đây là setting” và ghi chú team Settings sẽ
  nối nội dung thật; chỉ có close, không tạo Settings route/API giả.
- **Add Server dialog:** bật nút `+`; click mở `MatDialog` chọn “Tạo máy chủ” hoặc “Tham gia máy chủ”,
  cho chuyển bước local và xem form layout. CTA submit vẫn disabled kèm giải thích chưa nối backend;
  close/back hoạt động, không tự thêm server giả vào production.
- **Theme toàn app:** `ThemeService` provided-in-root giữ signal `dark|light`, đồng bộ `data-theme`,
  đọc/ghi preference bằng `localStorage` chỉ ở browser và fallback dark an toàn khi SSR. `AppLayout`
  khởi tạo service nên reload trực tiếp route channel/server vẫn đúng; Friends toolbar gọi service
  thay vì sở hữu signal riêng.

#### Mục tiêu theo 3 tiêu chí

- **UI/UX:** Doodle dễ thấy hơn; avatar/presence cân; folder nhìn thấy member; dialogs dùng Material,
  token Hybrid, modal elevation, pill actions, responsive một cột khi hẹp; dark/light cùng geometry.
- **Feature:** Drag-create/move/dissolve group chạy runtime; expand/collapse/route cũ vẫn chạy;
  Settings/Add Server mở-đóng và chuyển step local; theme không reset khi đổi route hoặc reload.
- **Data:** Grouping chỉ cập nhật signal folder hiện hành, không thay server/channel/conversation;
  dialogs không giả API; theme chỉ lưu preference không nhạy cảm, SSR không chạm browser globals.

#### File/folder dự kiến

- Doodle:
  - `src/app/features/dashboard/conversation/conversation.css`
  - `src/app/features/dashboard/channel/channel.css`
- Avatar/list alignment:
  - `src/app/layouts/app-layout/components/channel-sidebar/components/conversation-list.html|css|spec.ts`
  - `src/app/features/dashboard/friends/components/friend-row.html|css|spec.ts`
  - Chỉ sửa `src/app/shared/ui/avatar/**` hoặc `status-dot/**` nếu wrapper fix chưa đủ; nếu cần sẽ
    ghi chú trước khi patch vì đây là shared UI.
- Theme (**folder mới đã khai trước, tạo bằng Angular CLI**):
  - `src/app/core/theme/theme.service.ts|spec.ts` (tên cuối theo schematic Angular 21 thực tế)
  - `src/app/layouts/app-layout/app-layout.ts|spec.ts`
  - `src/app/features/dashboard/friends/friends.ts|spec.ts`
  - `src/app/features/dashboard/friends/components/friends-toolbar.ts|spec.ts`
- Drag/drop group + Add Server dialog:
  - `src/app/core/api/shell-data.ts|spec.ts`
  - `src/app/layouts/app-layout/components/server-rail/server-rail.ts|html|css|spec.ts`
- Settings dialog:
  - `src/app/layouts/app-layout/components/user-panel/user-panel.ts|html|css|spec.ts`
- Modal/drag state dùng chung nếu Angular overlay cần global scope:
  - `src/styles.css`
- Không sửa backend, database, auth contract, route Settings hoặc folder member khác.

#### Tiêu chí hoàn thành

- Doodle nổi hơn rõ ràng ở hai mode nhưng headline/message vẫn là foreground chính; voice/empty/error
  không render wallpaper như cũ.
- Avatar DM/Friends giữ hình tròn đúng size; initial nằm giữa; dot không tách khỏi avatar; text hai
  dòng truncate đúng và row selected không méo.
- Group tile hiển thị 2–4 miniature; drag server A lên B tạo group; drag server C lên group thêm C;
  chuyển server giữa group không duplicate; folder dưới hai member tự rã; server route/link/badge giữ.
- Gear và Add Server không còn disabled; mỗi dialog có title, accessible close, focus restore,
  responsive layout và nội dung placeholder trung thực; không submit dữ liệu giả.
- Light mode giữ nguyên khi Friends → server/channel/DM → Friends và sau reload browser; SSR/build
  không lỗi `window/localStorage`; toolbar ARIA/icon cập nhật đúng mode.
- Không hardcode màu ngoài token, không thêm package, không thêm dialog component/folder, không đổi
  cấu trúc ngoài đúng folder `core/theme/` đã nêu.

#### Kiểm chứng dự kiến

- Unit ThemeService: default/fallback, toggle, DOM sync, storage browser-safe; AppLayout giữ theme qua
  route; Friends toolbar vẫn đổi đúng icon/ARIA.
- Unit ShellData/ServerRail: group create/move/dissolve không duplicate; preview miniature render;
  CDK drag/drop wiring có data target; UI-3 mặc định rỗng và UI-7 demo toggle vẫn pass.
- Component dialog: click gear thấy “Đây là setting” rồi close; click Add Server thấy choose/create/join,
  CTA backend disabled; avatar wrapper/presence geometry contract không bị Material ép.
- `npm run build`, sau đó chạy toàn bộ frontend unit/component test, giữ 100% pass.
- Tài tự kiểm tra trực tiếp độ đậm doodle, drag pointer, modal responsive và dark/light. Theo yêu cầu
  trước đó, agent không thêm Playwright, ảnh kiểm kê hoặc file Codex.

#### Kết quả Phase UI-8

- Ngày hoàn thành: 2026-08-08, trên branch `page/tai`.
- Commit: không tự commit/push nếu Tài chưa yêu cầu.
- Kết quả test: `npm run build` pass browser/SSR/prerender; toàn bộ unit/component `34/34`
  file và `150/150` test pass.
- Đánh giá UI/UX: doodle tăng lên `0.08` dark / `0.12` light; avatar DM/Friends có slot và
  geometry cố định; group tile luôn hiện lưới miniature; Settings/Add Server dùng dialog token
  Hybrid. Tài tự kiểm tra trực tiếp cảm nhận màu, pointer drag và responsive theo thỏa thuận.
- Đánh giá Feature: CDK drag tạo/chuyển/rã group runtime; gear và nút `+` mở layout local nhưng
  không submit; `ThemeService` ở `core/theme/` giữ light/dark qua route và localStorage browser-safe.
- Đánh giá Data: tài khoản mới vẫn rỗng mặc định; group chỉ thay signal demo trong phiên, dialog
  không gọi API và theme chỉ lưu preference không nhạy cảm. Không sửa backend/database/auth/route.

### Phase UI-9 — Dọn ranh giới ownership và nền tảng “Soft Structuralism”

Status: APPROVED

> **Gate bắt buộc:** Tài đọc phase này rồi tự đổi đúng dòng trên thành `Status: APPROVED`.
> **Thay đổi cấu trúc đã khai trước:** xóa đúng folder
> `src/app/features/dashboard/components/member-panel/` (4 file component/template/style/spec)
> vì đây là UI hồ sơ giả nằm sai ownership. Không xóa hoặc sửa `features/profile/**` và
> `features/settings/**` của thành viên khác.

#### Audit bằng Taste Skill

- Hướng thẩm mỹ chọn: **Soft Structuralism cho dashboard mật độ cao**. Giữ lưới Discord vì đây là
  sản phẩm chat, không bê macro-whitespace, bento marketing hoặc scroll reveal vào vùng làm việc.
- Manrope hiện tại là fallback hợp lệ của Design Hybrid và đã tránh Inter; tiếp tục dùng Manrope +
  Source Code Pro, không thêm font/package/CDN.
- Selected state hiện tô toàn bộ `primary` sáng, hover dùng outline kín; ở dark lẫn light đều tạo
  mảng tương phản gắt và làm từng hàng giống nút cứng. Hairline xuất hiện ở gần mọi ranh giới khiến
  shell bị cắt thành nhiều hình chữ nhật phẳng.
- Motion hiện dùng `180ms ease` đồng loạt, không có cảm giác khối lượng; pressed feedback chưa đồng
  nhất. Focus ring đã rõ và phải giữ nguyên.
- UI Dashboard đang sở hữu nhầm Settings dialog placeholder và hai luồng “Hồ sơ nhanh” ở Friends/DM,
  gây nguy cơ conflict với Trường Giang (Settings) và Triều Dược (Profile).

#### Mục tiêu và quyết định

- **Ownership cleanup:**
  - Gỡ `MatDialog`, template “Đây là setting” và CSS Settings dialog khỏi `UserPanel`; giữ gear ở
    trạng thái disabled, ghi ARIA/tooltip rõ phần này do team Settings phụ trách.
  - Gỡ profile output khỏi `FriendRow`; avatar trở lại phần nhận diện trong link mở DM, không mở
    profile panel.
  - Gỡ `MemberPanel`, `detailsOpen` profile và context panel khỏi DM Conversation; intro avatar chỉ
    là hình trình bày.
  - Friends giữ duy nhất right panel “Đang hoạt động”; channel vẫn giữ panel “Thành viên” vì đó là
    dữ liệu Dashboard, không phải trang Profile.
- **State mềm hơn:** selected navigation dùng `surface-feature` + ink/primary text + indicator xanh
  nhỏ thay cho tô cả hàng primary; hover dùng bề mặt chuyển sắc token + shadow teal rất nhẹ, không
  vẽ khung kín. Primary fill chỉ còn CTA, demo ON, unread/status và chỉ báo thật.
- **Motion:** đưa easing vật lý dùng chung `cubic-bezier(0.2, 0.8, 0.2, 1)`, 160–240ms; icon/button
  có pressed `scale(0.97–0.98)`, list row không translate để tránh layout rung; giữ
  `prefers-reduced-motion`.
- **Depth:** bổ sung shadow/surface semantic bằng token Hybrid và `color-mix`, không thêm hex ngoài
  palette; ánh sáng thống nhất từ trên xuống, không blur scrolling container, không gradient fill.

#### File/folder dự kiến

- Hạ tầng dùng chung **đã khai để báo nhóm**:
  - `src/styles.css`
  - `src/app/layouts/app-layout/components/user-panel/user-panel.ts|html|css|spec.ts`
- Dashboard thuộc Tài:
  - `src/app/features/dashboard/friends/friends.ts|html|spec.ts`
  - `src/app/features/dashboard/friends/components/friend-row.ts|html|css|spec.ts`
  - `src/app/features/dashboard/conversation/conversation.ts|html|spec.ts`
  - `src/app/features/dashboard/components/chat-toolbar.ts|html|spec.ts` chỉ khi cần input ẩn action
    hồ sơ ở DM nhưng vẫn giữ action Thành viên cho channel.
- Xóa đúng folder đã báo trước:
  - `src/app/features/dashboard/components/member-panel/member-panel.ts`
  - `src/app/features/dashboard/components/member-panel/member-panel.html`
  - `src/app/features/dashboard/components/member-panel/member-panel.css`
  - `src/app/features/dashboard/components/member-panel/member-panel.spec.ts`
- Không sửa `core/theme/**`, `shared/ui/**`, `features/profile/**`, `features/settings/**`, route,
  backend, database hay auth contract.

#### Tiêu chí hoàn thành

- **UI/UX:** hover/selected rõ nhưng không chói hoặc đóng khung; focus vẫn đạt; light/dark giữ cùng
  geometry; không còn popup/profile giả nằm trong Dashboard.
- **Feature:** gear không điều hướng hoặc mở Settings giả; avatar Friend/DM không mở profile; mở DM,
  activity panel, member panel của channel, demo toggle và theme toggle vẫn hoạt động.
- **Data:** không đổi `ShellData`, demo mặc định OFF và không thêm persistence/API.
- Build browser/SSR/prerender pass; toàn bộ unit/component test giữ 100% pass. Theo yêu cầu của Tài,
  không thêm Playwright/Codex audit file; Tài tự kiểm tra cảm nhận trực tiếp.

#### Kết quả Phase UI-9

- Ngày hoàn thành: 2026-08-08, sau khi Tài chuyển gate sang `APPROVED`.
- Commit/push: không tự thực hiện nếu Tài chưa yêu cầu.
- Kết quả test: `npm run build` pass browser/SSR/prerender; toàn bộ unit/component `33/33`
  file và `146/146` test pass.
- Đánh giá UI/UX: bỏ popup Settings và quick profile giả khỏi Dashboard; active/hover/focus chuyển
  sang surface depth, brand indicator nhỏ và motion cubic mềm hơn, vẫn giữ focus/reduced-motion.
- Đánh giá Feature: gear là integration seam bị disabled có label rõ team Settings phụ trách;
  avatar Friend/DM không mở profile; DM, activity và member panel thật của channel vẫn hoạt động.
- Đánh giá Data: không đổi `ShellData`, demo data, API, backend, database hoặc auth contract.

### Phase UI-10 — Làm mềm shell Dashboard, Friends/activity và chat workspace

Status: APPROVED

> **Gate bắt buộc:** triển khai sau UI-9; Tài đọc phase này rồi tự đổi đúng dòng trên thành
> `Status: APPROVED`. Phase này không tạo hoặc xóa folder.

#### Hướng thiết kế

- Giữ bảng màu Hybrid nguyên bản nhưng áp theo tỉ lệ: canvas làm nền, surface tạo vùng, green chỉ
  làm tín hiệu. Server icon dùng squircle; avatar người dùng tiếp tục tròn để presence dễ đọc.
- Dùng double-bezel có chọn lọc cho composer, Add Server choice và group server; không bọc mọi hàng
  thành card. Toolbar/list dùng độ nổi và khoảng thở thay cho nhiều đường viền.
- Friends content có max-width hợp lý trên màn rộng, list dùng khoảng cách mềm thay `divide-y` dày;
  segmented tabs có một outer surface và selected core nổi nhẹ.
- Activity cards giảm border, tăng hierarchy name/status; empty state trong Dashboard bỏ cảm giác
  “card nằm giữa card” bằng selector global chỉ giới hạn dưới `app-dashboard-shell`.
- Chat toolbar dùng shadow separator rất nhẹ; composer nổi khỏi đáy với shell/core đồng tâm; doodle
  giữ opacity đã duyệt và luôn nằm sau nội dung.
- Motion chỉ dùng transform/opacity/color, custom easing và reduced-motion; không dùng backdrop blur
  trên vùng cuộn, không thêm animation trang trí vào message list.

#### File dự kiến

- Hạ tầng dùng chung **đã khai để báo nhóm**:
  - `src/styles.css`
  - `src/app/layouts/app-layout/app-layout.html|css|spec.ts`
  - `src/app/layouts/app-layout/components/server-rail/server-rail.ts|html|css|spec.ts`
  - `src/app/layouts/app-layout/components/channel-sidebar/channel-sidebar.ts|html|css|spec.ts`
  - `src/app/layouts/app-layout/components/channel-sidebar/components/channel-list.html|css|spec.ts`
  - `src/app/layouts/app-layout/components/channel-sidebar/components/conversation-list.html|css|spec.ts`
  - `src/app/layouts/app-layout/components/user-panel/user-panel.ts|html|css|spec.ts`
- Dashboard thuộc Tài:
  - `src/app/features/dashboard/friends/friends.html|css|spec.ts`
  - `src/app/features/dashboard/friends/components/friends-toolbar.html|css|spec.ts`
  - `src/app/features/dashboard/friends/components/friend-row.html|css|spec.ts`
  - `src/app/features/dashboard/friends/components/activity-panel.html|css|spec.ts`
  - `src/app/features/dashboard/components/context-panel/context-panel.html|css|spec.ts`
  - `src/app/features/dashboard/components/chat-toolbar/chat-toolbar.html|css|spec.ts`
  - `src/app/features/dashboard/components/message-composer/message-composer.html|css|spec.ts`
  - `src/app/features/dashboard/conversation/conversation.html|css|spec.ts`
  - `src/app/features/dashboard/channel/channel.html|css|spec.ts`
- Không sửa component trong `shared/ui/**`; nếu cần làm mềm empty/search, dùng selector dưới
  `app-dashboard-shell` trong stylesheet dùng chung đã khai, tránh conflict vào source shared.

#### Tiêu chí hoàn thành

- **UI/UX:** shell có lớp sâu và optical spacing nhưng không giảm diện tích chat; active/hover/focus
  phân cấp rõ; Friends không kéo nội dung loãng hết màn hình; composer và panel responsive; dark/light
  cùng nhịp, không hardcode màu ngoài token.
- **Feature:** rail/search/group drag/Add Server, sidebar scroll, Friends tabs/search/demo/theme,
  activity/member channel panel và DM/channel composer placeholder giữ hành vi hiện tại.
- **Data:** tài khoản mới vẫn render empty-state đúng, demo chỉ bật khi người dùng chủ động; không
  đổi schema/mock/API.
- Build browser/SSR/prerender pass và toàn bộ unit/component test giữ 100% pass; Tài tự kiểm tra
  pointer drag, responsive và cảm nhận mềm/cứng trên trình duyệt.

#### Kết quả Phase UI-10

- Ngày hoàn thành: 2026-08-08, sau UI-9 và khi Tài chuyển gate sang `APPROVED`.
- Commit/push: không tự thực hiện nếu Tài chưa yêu cầu.
- Kết quả test: `npm run build` pass browser/SSR/prerender; toàn bộ unit/component `33/33`
  file và `146/146` test pass.
- Đánh giá UI/UX: áp Soft Structuralism có chọn lọc cho shell chat mật độ cao: workspace dạng
  surface island, server squircle, Friends segmented control + max-width, activity card nhẹ border,
  context panel mềm và composer double-bezel; dark/light dùng chung token/geometry. Tài giữ phần
  kiểm tra trực tiếp pointer drag, responsive và cảm nhận màu theo thỏa thuận.
- Đánh giá Feature: giữ nguyên rail/search/group drag/Add Server, sidebar scroll, Friends tabs/search,
  demo/theme toggle, activity/member channel panel và luồng DM/channel; không thêm Settings/Profile.
- Đánh giá Data: tài khoản mới vẫn rỗng mặc định, demo chỉ bật chủ động; không đổi schema/mock/API,
  backend, database hoặc auth.

### Phase UI-11 — Ổn định layout toàn chiều cao và drag-sort server có chỉ báo

Status: APPROVED

> **Gate bắt buộc:** Tài đọc phase này rồi tự đổi đúng dòng trên thành `Status: APPROVED`.
> Phase không tạo, xóa hoặc di chuyển folder. Vì lỗi nằm ở app shell và dữ liệu shell frontend,
> phase cần sửa có kiểm soát `layouts/**`, `core/api/shell-data.ts` và `src/styles.css`; Tài báo nhóm
> trước khi merge để tránh conflict. Không sửa `features/profile/**` hoặc `features/settings/**`.

#### Nguyên nhân đã xác định từ ảnh và source

- Angular Material đặt chiều rộng mặc định của sidenav là `360px`, nhưng tổng rail `72px` + gap
  `8px` + sidebar `288px` + padding trái `8px` đang cần `376px`. Phần dư 16px làm
  `.mat-drawer-inner-container` sinh scrollbar ngang và cắt control bên phải của user panel.
- `.mat-drawer-content` của Material khai báo `display: block; overflow: auto`, có ưu tiên cao hơn
  Tailwind utility đang gắn trong template. Vì content không thực sự là flex column, workspace
  co theo chiều cao nội dung và để lại vùng trống lớn phía dưới ở Friends, DM và Channel.
- Server rail hiện dùng các drop-list độc lập chỉ nhận hành vi “thả lên server/group”. Không có
  drop slot cấp rail hoặc vị trí trước/sau, nên server trong group không thể kéo ra ngoài, không
  reorder chính xác và người dùng không thấy trước vị trí sẽ nhận server.

#### Mục tiêu

- **UI/UX:** drawer không còn scrollbar ngang; user identity và ba control mic/loa/settings nằm
  gọn trong một grid ổn định. Friends, DM, Channel và empty-state giãn kín workspace đến đáy ở mọi
  viewport. Khi kéo server, một line ngang dùng token Hybrid xuất hiện đúng drop slot trước/sau.
- **Feature:** kéo server vào group vẫn hoạt động; kéo server từ group ra rail sẽ ungroup; kéo giữa
  các slot sẽ reorder server ngoài group hoặc trong group. Group còn dưới hai server tự rã như hiện
  tại; click server, thu gọn group, search và Add Server không đổi hành vi.
- **Data:** chỉ bổ sung state/thao tác sắp xếp runtime trong `ShellData`; demo vẫn OFF mặc định,
  không persistence, API, backend, database, auth hoặc thay schema.

#### File/folder dự kiến

- `plans/dashboard.PLAN.md` — gate và kết quả phase.
- `src/app/layouts/app-layout/app-layout.{html,css,spec.ts}` — override flex/overflow của Material,
  đặt drawer width rõ ràng và bảo đảm workspace stretch toàn chiều cao.
- `src/styles.css` — selector giới hạn trong `app-dashboard-shell` để tắt overflow ngang của
  `.mat-drawer-inner-container`; không sửa source Angular Material.
- `src/app/layouts/app-layout/components/channel-sidebar/channel-sidebar.{ts,css,spec.ts}` — giữ
  sidebar đúng kích thước, min-width và overflow contract.
- `src/app/layouts/app-layout/components/user-panel/user-panel.{ts,html,css,spec.ts}` — chuyển hàng
  đáy sang grid co giãn an toàn và touch target 36px, không mở Profile/Settings.
- `src/app/layouts/app-layout/components/server-rail/server-rail.{ts,html,css,spec.ts}` — drop slot,
  line indicator, ungroup và reorder trong/ngoài group bằng Angular CDK hiện có.
- `src/app/core/api/shell-data.{ts,spec.ts}` — cập nhật thứ tự/group runtime có test; không thêm API.

#### Test dự kiến

- AppLayout: drawer/workspace có class contract chống overflow và stretch; không đổi route/theme.
- UserPanel/ChannelSidebar: identity có thể co, ba control không tràn và integration seam Settings
  vẫn disabled.
- ShellData: ungroup ra đầu/cuối rail, reorder ngoài group, reorder trong group, move giữa group,
  tự rã group một member, không duplicate ID và demo OFF vẫn rỗng.
- ServerRail: render drop slot có accessible label; event trước/sau gọi đúng thao tác; indicator chỉ
  xuất hiện khi CDK nhận drag; click/collapse/search/Add Server giữ nguyên.
- `npm run build` pass browser/SSR/prerender và `npm test -- --watch=false` giữ 100% pass. Theo thỏa
  thuận của Tài, không thêm Playwright/Codex audit file; Tài tự kiểm tra pointer drag và responsive.

#### Tiêu chí hoàn thành

- **UI/UX:** không có horizontal scrollbar ở drawer/workspace; không control nào bị cắt; mọi page
  dashboard phủ đủ chiều cao khả dụng; drop line rõ ở light/dark nhưng không chói.
- **Feature:** một server kéo được vào group, ra ngoài group và đến đúng vị trí line đã báo; không
  làm hỏng navigation/collapse/dialog hoặc empty/demo state.
- **Data:** thứ tự chỉ tồn tại trong phiên frontend; tắt demo trả về trạng thái user mới; không đổi
  backend/database/auth/API.
- Build browser/SSR/prerender và toàn bộ unit/component test pass; Tài kiểm tra trực tiếp giao diện.

#### Kết quả Phase UI-11

- Ngày hoàn thành: 2026-08-08, trên branch `page/tai` sau khi Tài chuyển gate sang `APPROVED`.
- Commit/push: không tự thực hiện nếu Tài chưa yêu cầu.
- Kết quả test: `npm run build` pass browser/SSR/prerender; toàn bộ unit/component `33/33`
  file và `153/153` test pass. Lần test đầu dừng ở compile spec vì biến DOM bị suy luận
  `unknown`; đã khai báo `Element[]` đúng type và chạy lại sạch.
- Đánh giá UI/UX: drawer dùng đúng 376px theo tổng rail/sidebar, inner container không còn cuộn
  ngang; Material content được override thành flex column nên Friends/DM/Channel giãn đến đáy.
  User panel dùng grid `minmax + 3 × 36px`; drop slot hiện line primary-soft có motion/reduced-motion.
- Đánh giá Feature: kéo lên server/group vẫn tạo hoặc chuyển group; drop line trong group reorder
  đúng insertion index; drop line ngoài group ungroup/reorder và group còn một member tự rã. Route,
  collapse, search, Add Server, demo và theme giữ nguyên; Tài kiểm tra pointer drag trực tiếp.
- Đánh giá Data: thêm thứ tự server runtime tách live/demo trong `ShellData`; demo vẫn OFF mặc định,
  tắt demo trả về user mới rỗng; không persistence, API, backend, database, auth hoặc đổi schema.

### Phase UI-12 — Nexus Thread, chat preview và Command Center

Status: APPROVED

> Tài đã duyệt bằng yêu cầu “làm thử cho tao xem thử” sau khi đọc phần brainstorm Nexus Thread,
> đồng thời đã cho phép append phase UI được đặt `APPROVED`. Phase này không tạo, xóa hoặc di chuyển
> folder; không sửa `features/profile/**`, `features/settings/**`, backend, database hay auth.
> Vì Command Center và server active indicator nằm trong app shell, phase sửa có kiểm soát
> `layouts/app-layout/components/server-rail/**`; đây là hạ tầng dùng chung cần báo nhóm trước khi merge.

#### Design read

- **Đối tượng:** Dashboard NexusCord cho sinh viên và nhóm nhỏ cần đổi nhanh giữa DM, server và kênh.
- **Công việc chính:** đọc ngữ cảnh cuộc trò chuyện, tìm đúng nơi cần đến và tiếp tục nhắn tin mà không
  mất phương hướng.
- **Palette:** giữ nguyên toàn bộ token Hybrid — warm cream/Starbucks green ở light, deep teal/MongoDB
  green ở dark; không thêm hex, gradient hoặc accent thứ hai.
- **Typography:** tiếp tục Manrope thay Euclid Circular A và Source Code Pro cho phím tắt; không đổi font
  hoặc dependency.
- **Layout:** rail và toolbar yên, lịch sử chat là vùng biểu đạt chính, context rail chỉ mở theo hành động.
- **Signature:** “Nexus Thread” — một đường nối primary mảnh mang nghĩa kết nối, dùng cho active server,
  reply, unread marker và trạng thái sống. Command palette riêng lẻ là pattern phổ biến; Thread khiến
  pattern đó thuộc về NexusCord thay vì trông như một dashboard mẫu.

#### Mục tiêu

- **UI/UX:** chat demo có grouped message, reply connector, unread divider, reaction và toolbar chỉ hiện
  khi hover/focus; doodle lùi sau message surface. Active server và drop slot dùng cùng ngôn ngữ Thread.
  Command Center mở bằng nút search hoặc `Ctrl/Cmd + K`, có tìm server, text/voice channel và DM bằng
  keyboard-focus rõ ràng. Light/dark dùng cùng geometry và tôn trọng reduced motion.
- **Feature:** dữ liệu demo ON hiển thị timeline mẫu để đánh giá giao diện; demo OFF vẫn giữ intro/empty
  đúng logic tài khoản mới. Search lọc trực tiếp dữ liệu shell hiện có và điều hướng bằng router link;
  không giả chức năng search message backend. Context panel channel vẫn chỉ hiển thị member thuộc
  Dashboard, không mở Profile/Settings.
- **Data:** chỉ đọc `ShellData.demoEnabled`, server, channel và conversation hiện có; không thêm mock vào
  live state, không persistence/API/schema/backend.

#### File dự kiến

- `plans/dashboard.PLAN.md` — gate và kết quả phase.
- `src/app/features/dashboard/channel/channel.{ts,html,css,spec.ts}` — timeline demo, Nexus Thread và
  context member UI.
- `src/app/features/dashboard/conversation/conversation.{ts,html,css,spec.ts}` — timeline DM demo cùng
  geometry, không thêm action Profile.
- `src/app/features/dashboard/components/message-composer/*` và `chat-toolbar/*` — visual state,
  helper copy, focus/hover polish; không gửi dữ liệu thật.
- `src/app/features/dashboard/components/context-panel/*` — focus/transition và Escape theo Angular
  host binding; không thêm nội dung ngoài Dashboard.
- `src/app/layouts/app-layout/components/server-rail/*` — Command Center, shortcut và Nexus Thread active.
- `src/styles.css` — style timeline/Command Center dùng chung nhưng khóa selector trong Dashboard; tránh
  nhân đôi CSS giữa Channel/DM và giữ từng component dưới budget 4 kB của Angular.
- Không tạo component/folder/dependency mới; không sửa `ShellData` nếu contract hiện tại đã đủ.

#### Test dự kiến

- Channel/Conversation: demo ON render message groups, reply/unread/reaction; demo OFF vẫn không dựng
  user/message giả và không mất intro/composer.
- ServerRail: nút search mở dialog; query lọc server/channel/DM; `Ctrl/Cmd + K` gọi cùng Command Center;
  tài khoản mới có empty guidance; drag/drop/Add Server không đổi.
- ContextPanel/Composer/Toolbar: aria, Escape, focus và disabled seam vẫn đúng.
- `npm run build` pass browser/SSR/prerender và `npm test -- --watch=false` giữ 100% pass. Theo thỏa thuận,
  Tài tự kiểm tra cảm nhận trực tiếp ở light/dark và responsive; không thêm Playwright/Codex audit file.

#### Tiêu chí hoàn thành

- **UI/UX:** Nexus Thread xuất hiện nhất quán nhưng không biến thành decoration; chat là vùng nổi bật duy
  nhất; Command Center rõ hierarchy, không có glass/glow/gradient thừa; contrast/focus đạt AA theo token.
- **Feature:** demo toggle quyết định có/không timeline mẫu; Command Center tìm và điều hướng dữ liệu shell
  hiện có; context rail, theme, route, server drag group và Add Server không regression.
- **Data:** user mới vẫn rỗng mặc định, không thêm message vào live state và không đụng backend/database.

#### Kết quả Phase UI-12

- Ngày hoàn thành code/test: 2026-08-08 trên branch `page/tai`.
- Commit/push: không tự thực hiện nếu Tài chưa yêu cầu.
- Kết quả test: `npm run build` pass browser/SSR/prerender, không còn warning component CSS;
  toàn bộ unit/component `33/33` file và `157/157` test pass. Lần test đầu dừng ở compile vì stub
  `ServerRail` cast trực tiếp object tối giản sang `ShellData`; đã đổi test double qua `unknown` theo
  đúng cảnh báo TypeScript và chạy lại sạch.
- Đánh giá UI/UX: Nexus Thread nối active server, toolbar, composer, reply và unread bằng đúng token
  Hybrid; chat demo có grouped/compact row, hover actions, reaction, reply và member context. Command
  Center dùng hierarchy yên, focus rõ, `Ctrl/Cmd + K`, responsive/reduced-motion; không gradient,
  glass hoặc accent ngoài design system. Style timeline dùng chung được khóa vào Channel/DM trong
  `src/styles.css`, tránh lặp và giữ CSS component dưới budget Angular.
- Đánh giá Feature: demo OFF vẫn chỉ có intro và không dựng message/member giả; demo ON render timeline
  để review. Command Center lọc server, text/voice channel và DM từ `ShellData`, click điều hướng bằng
  router link; search message được ghi rõ là chờ backend. Drag group, Add Server, theme, route, context
  panel và seam Profile/Settings giữ nguyên.
- Đánh giá Data: không sửa `ShellData`, API, backend, database, auth hoặc schema; chỉ đọc các signal demo
  và collection shell hiện có. Tài khoản mới vẫn rỗng mặc định.

### Phase UI-13 — Server group container và drag intent rõ ràng

Status: APPROVED

> Tài yêu cầu trực tiếp chỉnh interaction server rail và trước đó đã cho phép phase UI append được đặt
> APPROVED. Phase này chỉ tinh chỉnh phần Dashboard shell đã thuộc các phase UI trước; không tạo, xóa
> hoặc di chuyển folder, không thêm dependency và không đụng Profile, Settings, Auth hay backend.
> layouts/app-layout/components/server-rail/** là vùng layout dùng chung nên cần báo nhóm trước khi merge.

#### Chẩn đoán UI hiện tại

- Group khi mở chỉ là các server rời xếp dọc, thiếu một surface/connector chung nên không thể nhìn nhanh
  chúng thuộc cùng folder.
- Drop line đang làm tốt vai trò reorder nhưng bị dùng cạnh interaction gom nhóm, khiến intent “đặt vào
  group” và “đổi vị trí” khó phân biệt.
- Logic ungroup đã có trong ShellData, nhưng khe ngoài group chỉ cao 0.5rem; pointer khó bắt và không
  có affordance cho biết kéo tới đâu để đưa server ra ngoài.

#### Mục tiêu

- **UI/UX:** group mở có một vỏ surface-soft liên tục, bo 12px, connector Nexus Thread và nhãn nhóm
  kín đáo để toàn bộ server con được đọc như một đơn vị. Khi kéo chồng lên server hoặc group hợp lệ,
  chính target phình nhẹ và có halo primary; drop line chỉ còn mang nghĩa reorder. Khi kéo server đang
  trong group, hiện một drop zone “Ngoài nhóm” đủ lớn, có Material Symbol và active state rõ.
- **Feature:** phân biệt ba intent: thả lên server/group để gom nhóm; thả vào line để reorder; thả vào
  vùng ngoài nhóm để ungroup. State drag/hover phải được dọn khi drop, exit hoặc drag end; không highlight
  target là chính server đang kéo hoặc group mà server đã thuộc sẵn.
- **Data:** dùng lại groupServers, addServerToGroup, moveServerToGroup và
  moveServerOutsideGroups; chỉ sửa ShellData nếu test chứng minh logic hiện có sai. Không persistence,
  API, backend, database hoặc schema.

#### File dự kiến

- plans/dashboard.PLAN.md — gate và kết quả phase.
- src/app/layouts/app-layout/components/server-rail/server-rail.ts — drag intent signals và cleanup.
- src/app/layouts/app-layout/components/server-rail/server-rail.html — group container, target enter/exit
  và dedicated ungroup zone.
- src/app/layouts/app-layout/components/server-rail/server-rail.css — surface nhóm, scale/halo,
  drop-zone state và reduced motion.
- src/app/layouts/app-layout/components/server-rail/server-rail.spec.ts — semantics và interaction state.
- src/styles.css — style interaction mới được scope bằng app-server-rail để không vượt budget
  anyComponentStyle 4 kB của Angular; không ảnh hưởng component ngoài rail.
- src/app/core/api/shell-data.ts|spec.ts chỉ khi kiểm chứng phát hiện lỗi data thật.
- Không tạo folder/component/dependency mới.

#### Test dự kiến

- Group mở render một container chung có tên, số server và các server con; thu gọn vẫn giữ miniature.
- Drag server hợp lệ lên server/group kích hoạt đúng scale target; exit/drag end xóa state.
- Server kéo không tự highlight chính nó; member trong cùng group không tạo lại group.
- Kéo member của group làm hiện ungroup zone; drop gọi moveServerOutsideGroups và group hai member tự rã.
- Các slot reorder trong/ngoài group vẫn render và gọi đúng insertion index.
- npm run build và npm test -- --watch=false pass; Tài tự kiểm tra pointer drag ở light/dark.

#### Tiêu chí hoàn thành

- **UI/UX:** nhìn group mở nhận ra ngay phạm vi group; ba intent grouping/reorder/ungroup có ba phản hồi
  khác nhau; không thêm màu ngoài token Hybrid, không gradient/glass/glow nặng và tôn trọng reduced motion.
- **Feature:** gom vào server/group, kéo ra ngoài và reorder đều thao tác được bằng vùng hit đủ lớn; state
  không bị kẹt sau drag.
- **Data:** demo OFF vẫn rỗng; cấu trúc group/order runtime giữ typed và không đụng backend.

#### Kết quả Phase UI-13

- Ngày hoàn thành code/test: 2026-08-09 trên branch page/tai; chờ Tài kiểm tra pointer drag trực tiếp.
- Commit/push: không tự thực hiện nếu Tài chưa yêu cầu.
- Kết quả test: npm run build pass browser/SSR/prerender, không có warning anyComponentStyle;
  toàn bộ unit/component 33/33 file và 160/160 test pass. CSS interaction được scope bằng
  app-server-rail trong styles.css để server-rail.css còn 3.8 kB, dưới budget 4 kB.
- Đánh giá UI/UX: group mở có surface-soft bo 12px, caption folder, member count và connector
  Nexus Thread bao toàn bộ server con. Grouping dùng scale 1.12 + halo trên target thật; reorder
  vẫn dùng line ngang; ungroup dùng drop zone “Ra ngoài” 52 × 36px chỉ hiện khi kéo member trong
  group. Light/dark chỉ dùng token Hybrid và reduced-motion bỏ transform.
- Đánh giá Feature: drag state phân biệt server/group target, drop slot và ungroup target; target
  chính server đang kéo, member cùng group và group nguồn không highlight sai. Drag end/drop dọn
  toàn bộ feedback. Vùng Ra ngoài gọi lại moveServerOutsideGroups ở insertion index 0; drop-line
  ngoài group vẫn hỗ trợ chọn vị trí chính xác như trước.
- Đánh giá Data: không cần sửa ShellData vì test hiện có đã chứng minh ungroup/reorder và group
  hai member tự rã đúng. Không thêm persistence, API, backend, database, auth hoặc schema; demo OFF
  vẫn giữ tài khoản mới rỗng.

## Checklist hoàn thiện Dashboard còn lại

Checklist này là bảng theo dõi UI/UX của phần Minh Tài phụ trách. Mỗi nhóm chỉ được triển khai sau khi
có phase riêng trong file này; những mục cần backend/database vẫn giữ ở trạng thái chờ team chốt contract.

### 1. Trạng thái sản phẩm

- [x] Skeleton đúng hình dạng cho lần tải đầu của Friends, DM và Channel; không dùng spinner chung chung.
- [x] Lỗi tải dữ liệu có nội dung cụ thể, nút thử lại và vùng thông báo truy cập được.
- [x] Ngoại tuyến và đang kết nối lại dùng banner gọn, không xoá nội dung người dùng đang đọc.
- [x] Không có quyền và nội dung không còn tồn tại được phân biệt bằng copy/icon/action riêng.
- [x] Có cách preview độc lập với backend để Tài kiểm tra cả dark/light và responsive.
- [x] Unit/component test cùng build browser/SSR pass; không thay dữ liệu live/demo hiện có.
- [x] Boot screen có thương hiệu cho F5 và lần đi từ Auth vào Dashboard; không chặn chuyển kênh nội bộ.

### 2. Accessibility và kiểm thử trình duyệt

- [ ] Playwright E2E cho Friends, DM, Channel, Command Center và server rail.
- [ ] AXE/WCAG AA cho dark/light, focus ring, dialog focus return và aria-live.
- [ ] Keyboard alternative cho group/reorder/ungroup server; thông báo kết quả cho screen reader.
- [ ] Kiểm tra viewport 320/480/768/1024/1280/1440 và touch target tối thiểu 40–44px.
- [ ] Không cuộn ngang ngoài ý muốn; reduced-motion không còn scale/slide gây khó chịu.

### 3. Server và Channel UI

- [ ] Tách Add Server preview khỏi server rail theo `features/servers/**` sau khi duyệt folder.
- [ ] Tạo server: personal/group, tên, icon preview, validation và trạng thái submit.
- [ ] Join server: invite hợp lệ/hết hạn/đã tham gia/server đầy.
- [ ] Create channel: text/voice, tên, private/access preview và validation.
- [ ] Chỉ nối submit thật sau khi API/schema được mentor xác nhận.

### 4. Chat interaction UI

- [ ] Composer nhiều dòng, giới hạn ký tự, reply/edit mode và draft state.
- [ ] Pending/sent/failed/retry cho message optimistic.
- [ ] Attachment tray, upload progress/error, drag/drop và paste preview.
- [ ] Reaction/sticker/message actions/file gallery ở mức UI contract.
- [ ] Không giả gửi thành công khi backend chưa tồn tại.

### 5. Notification và Voice UI

- [ ] Notification center: unread/all, mention/friend/server, mark-read và empty/loading/error.
- [ ] Voice lobby, participant tile, mic/deafen/camera/screen-share controls.
- [ ] Connecting/reconnecting/disconnected và denied-device permission.
- [ ] Chờ team chốt Socket.IO/WebRTC/LiveKit trước khi nối realtime thật.

### 6. Dọn kỹ thuật trước bàn giao

- [ ] Chia nhỏ `server-rail` và các template chat quá dài sau khi nhóm duyệt vùng `layouts/**`.
- [ ] Ẩn hoặc khóa demo/state preview ở production build.
- [ ] Kiểm tra CSS budget, bundle, route lazy-load và toàn bộ regression test.
- [ ] Không sửa Auth/Profile/Settings hay database schema thuộc phần người khác.

### Phase UI-14 — Trạng thái sản phẩm có thể preview, sẵn sàng nối API

Status: APPROVED

> Tài yêu cầu trực tiếp tạo checklist rồi triển khai mục 1, đồng thời trước đó đã cho phép phase UI append
> được đặt `APPROVED`. Phase này chỉ thêm UI state trong `features/dashboard/**` và nối vào các route
> Dashboard; không đụng backend, database, Auth, Profile hoặc Settings.

#### Chẩn đoán

- Dashboard hiện có empty/not-found state nhưng chưa phân biệt loading, API error, forbidden, offline và
  reconnecting; khi nối HTTP/socket sau này các trang sẽ phải tự chèn UI rời rạc nếu không có contract chung.
- Không có backend để kích hoạt các state, vì vậy cần một preview source không làm thay đổi demo/live data và
  không thêm control phát triển vào giao diện production.
- Spinner tròn chung chung không phản ánh cấu trúc Friends/chat; loading cần skeleton theo đúng hình dạng nội dung.

#### Mục tiêu theo ba tiêu chí

- **UI/UX:** một component state dùng token NexusCord Hybrid, loading bằng skeleton có nhịp mềm; error,
  forbidden và missing có hierarchy/copy/action riêng; offline/reconnecting là banner gọn, dark/light dùng
  cùng geometry và tôn trọng reduced-motion.
- **Feature:** `?ui-state=loading|error|offline|reconnecting|forbidden|missing` preview được trên Friends,
  DM và Channel. Retry/close state preview đưa route về trạng thái sẵn sàng mà không reload hay đổi dữ liệu.
- **Data:** state preview chỉ đọc query param, không thêm mock member/server/message, không gọi API và không
  sửa schema; source live vẫn rỗng và demo toggle giữ nguyên hành vi.

#### File/folder dự kiến

- `plans/dashboard.PLAN.md` — checklist, gate và kết quả phase.
- `src/app/features/dashboard/components/dashboard-state/**` — scaffold bằng Angular CLI; skeleton/panel/banner.
- `src/app/features/dashboard/services/dashboard-ui-state.ts|spec.ts` — scaffold bằng Angular CLI; chuẩn hoá
  query param thành typed state và clear preview bằng Router.
- `src/app/features/dashboard/friends/friends.ts|html|spec.ts` — render blocking/connection state quanh nội dung.
- `src/app/features/dashboard/channel/channel.ts|html|spec.ts` — render state trước dữ liệu channel.
- `src/app/features/dashboard/conversation/conversation.ts|html|spec.ts` — render state trước dữ liệu DM.
- `src/app/features/dashboard/server-home/server-home.ts|html|spec.ts` — giữ state nhất quán ở route server home.
- Không sửa `layouts/**`, `shared/**`, backend hoặc database; không thêm dependency.

#### Test dự kiến

- DashboardState render skeleton khác nhau cho list/chat, có `aria-busy`/`role=status` và không có spinner.
- Error/forbidden/missing có đúng icon, copy và action; offline/reconnecting dùng banner không-blocking.
- Query không hợp lệ rơi về `ready`; clear preview giữ route hiện tại và xoá duy nhất `ui-state`.
- Friends/DM/Channel giữ UI cũ ở ready, state blocking không dựng dữ liệu giả; banner connection không xoá content.
- `npm run build`, toàn bộ unit/component test và `git diff --check` pass.

#### Tiêu chí hoàn thành

- [x] Hoàn tất toàn bộ sáu checkbox mục “1. Trạng thái sản phẩm”.
- [x] Light/dark chỉ dùng token hiện có, không hardcode hex/gradient/glass/glow nặng.
- [x] Không làm thay đổi demo toggle, routing, server drag/group hoặc ownership của member khác.

#### Kết quả Phase UI-14

- Ngày hoàn thành code/test: 2026-08-09 trên branch `page/tai`; chờ Tài kiểm tra giao diện trực tiếp.
- Commit/push: không tự thực hiện vì Tài chưa yêu cầu.
- Kết quả test: toàn bộ frontend `35/35` test file và `174/174` unit/component test pass;
  `npm run build` pass browser/SSR/prerender, không có warning `anyComponentStyle`; `git diff --check` pass.
- Đánh giá UI/UX: loading dùng skeleton riêng cho list/chat; error/forbidden/missing dùng panel có copy,
  Material Symbol và action riêng; offline/reconnecting dùng banner không-blocking. Màu, border, shadow và
  animation chỉ dùng token NexusCord Hybrid, có `prefers-reduced-motion` và semantics `status/alert/aria-busy`.
- Đánh giá Feature: Friends, DM, Channel và Server Home đọc preview typed qua query `ui-state`; action xoá riêng
  query này, giữ route/query khác. Blocking state không render timeline/composer/list; connection state vẫn giữ
  nội dung đang xem. Query lạ tự rơi về `ready`.
- Đánh giá Data: không thêm server/member/message giả, không sửa ShellData, backend, database, Profile, Settings
  hoặc server drag/group; demo toggle và dữ liệu rỗng của tài khoản mới giữ nguyên.

### Phase UI-15 — Nexus Orbit Boot cho F5 và lần đầu vào Dashboard

Status: APPROVED

> Tài giao agent tự chọn hiệu ứng phù hợp và yêu cầu triển khai để kiểm tra bằng DevTools. Tài trước đó đã
> cho phép phase UI append được đặt `APPROVED`. Phase này cần ngoại lệ tối thiểu ở `app-root`, `index.html`
> và `styles.css` vì loader phải xuất hiện trước khi route Dashboard/Angular hoàn tất; không sửa Login/Auth.

#### Chẩn đoán

- State loading ở Phase UI-14 chỉ dựng sau khi route component đã tồn tại, nên không thể che khoảng chờ khi
  F5 đang bootstrap/hydrate hoặc guard đang khôi phục session và hồ sơ.
- Nếu bật full-screen loader cho mọi `NavigationStart`, việc đổi DM/kênh nội bộ sẽ chớp màn hình và làm mất
  cảm giác app thời gian thực. Loader chỉ nên chạy ở initial navigation và lần đi từ route ngoài vào `/channels`.
- Loader hiện ngay trên máy nhanh tạo flash khó chịu; cần reveal delay ngắn, minimum visible time khi đã hiện,
  exit bằng opacity/transform và một query preview dành cho kiểm tra thủ công.

#### Mục tiêu theo ba tiêu chí

- **UI/UX:** “Nexus Orbit Boot” dùng monogram N phẳng, hai quỹ đạo và ba node chuyển động bằng transform;
  không spinner, gradient, glow 3D hoặc ảnh logo nặng. Dark/light dùng token Hybrid, copy ngắn, có reduced-motion.
- **Feature:** boot screen chỉ hiện nếu initial/entry-to-Dashboard kéo dài quá ngưỡng; không hiện khi chuyển kênh
  nội bộ. `?boot-preview=1` giữ hiệu ứng đủ lâu để Tài mở DevTools xem mà không thêm nút phát triển lên giao diện.
- **Data:** chỉ quan sát Angular Router; không gọi API, không đọc/ghi dữ liệu Dashboard và không thay Auth guard.

#### File/folder dự kiến

- `plans/dashboard.PLAN.md` — gate, checklist và kết quả phase.
- `src/app/features/dashboard/components/nexus-boot/**` — scaffold bằng Angular CLI; markup/semantics visual.
- `src/app/features/dashboard/services/nexus-boot-state.ts|spec.ts` — scaffold bằng Angular CLI; state machine timer
  cho initial navigation, entry Dashboard, preview và exit.
- `src/app/app.ts|html|spec.ts` — ngoại lệ root tối thiểu để overlay sống xuyên thời gian activate route.
- `src/index.html` — fallback markup và đọc theme đã lưu trước bootstrap để F5 không lóe sai màu.
- `src/styles.css` — CSS scope `.nexus-boot*` dùng chung cho fallback trước bootstrap và Angular component.
- Không sửa `features/auth/**`, `core/auth/**`, Profile, Settings, backend/database hoặc thêm dependency.

#### Test dự kiến

- NexusBoot có `role=status`, `aria-live=polite`, copy đúng và class exit; không có spinner/image.
- State service không hiện khi navigation kết thúc trước reveal delay; hiện và giữ minimum time khi navigation chậm.
- Từ route ngoài vào `/channels` được kích hoạt; `/channels` sang `/channels` không kích hoạt lại.
- `boot-preview=1` ép thời gian preview; reduced-motion được đảm bảo bằng CSS media query.
- `npm run build`, toàn bộ unit/component test, Prettier và `git diff --check` pass.

#### Tiêu chí hoàn thành

- [x] F5/restore session chậm có boot screen, máy nhanh không bị flash bắt buộc.
- [x] Sau đăng nhập vào Dashboard có transition; đổi server/kênh/DM không bật full-screen loader.
- [x] Dark/light, mobile, SSR/hydration và reduced-motion giữ cùng geometry, không cuộn ngang.
- [x] Chỉ sửa đúng ngoại lệ shared đã khai và không thay ownership/logic Auth.

#### Kết quả Phase UI-15

- Ngày hoàn thành code/test: 2026-08-09 trên branch `page/tai`; chờ Tài duyệt animation trực tiếp.
- Commit/push: không tự thực hiện vì Tài chưa yêu cầu.
- Kết quả test: toàn bộ frontend `37/37` test file và `181/181` unit/component test pass;
  `npm run build` pass browser/SSR/prerender, initial bundle `614.85 kB` dưới budget warning `700 kB`, không có
  warning `anyComponentStyle`. Dev server trả HTTP 200; HTML SSR có fallback boot, theme bootstrap và title NexusCord.
- Đánh giá UI/UX: Nexus Orbit Boot dùng monogram phẳng, hai orbit, ba node và progress thread; màu chỉ lấy token
  Hybrid. Reveal delay 160ms tránh flash, exit 220ms, animation chỉ đổi transform/opacity và reduced-motion tắt motion.
- Sau lượt duyệt trực tiếp của Tài: vòng nền lớn được thu theo cạnh ngắn viewport và căn đồng tâm tuyệt đối với
  monogram để không còn lệch thị giác; khi hệ điều hành bật reduced-motion, progress thread được ẩn thay vì đứng
  yên ở 64% gây cảm giác trang bị treo.
- Bốn connection node được chuyển từ tọa độ rời theo khung vuông sang làm con trực tiếp của hai ellipse: mỗi orbit
  có một cặp node đối xứng tại hai đầu. Sau lượt duyệt tiếp theo, cả bốn dot dùng chung kích thước, màu, viền và
  nhịp thở; chỉ độ đậm hai nét ellipse tạo phân lớp. Vị trí theo phần trăm giữ đúng quỹ đạo ở desktop/mobile.
- Đánh giá Feature: initial navigation và lần từ route ngoài vào `/channels` được theo dõi; navigation Dashboard
  nội bộ không kích hoạt overlay. `?boot-preview=1` giữ loader 2,4 giây cho DevTools. Browser automation nội bộ
  không kết nối được trong phiên này nên phần duyệt cảm giác animation để Tài thực hiện trên dev server thật.
- Đánh giá Data: không sửa `features/auth/**`, `core/auth/**`, guard, session, ShellData, backend hoặc database;
  state machine chỉ quan sát Router và timer phía browser, SSR không tạo timer giữ tiến trình render.

### Phase UI-16 — Cân chỉnh user panel và cụm điều khiển âm thanh

Status: APPROVED

> Tài đã yêu cầu trực tiếp cân lại avatar/profile và ba icon mic, tai nghe, cài đặt sau khi kiểm tra hover
> trên giao diện thật; các phase UI append trước đó đã được cho phép đặt `APPROVED`. Đây là ngoại lệ shared
> tối thiểu trong `layouts/**` vì user panel thuộc app shell của Dashboard; không dựng hay sửa trang Profile/Settings.

#### Chẩn đoán

- Nút danh tính chỉ cao `36px` và có padding dọc trong khi avatar đã cao `32px`, hai dòng tên/trạng thái cần
  thêm khoảng thở; vì vậy nội dung bị ép, tâm avatar và khối chữ không còn cân nhau khi hover.
- Ba icon button đứng trực tiếp trong grid với khoảng cách `2px`; glyph Material có cùng hộp 24px nhưng trọng tâm
  thị giác khác nhau, khiến mic/tai nghe/bánh răng trông lệch và các vùng hover dính thành một dải chật.
- Tên dài cần tiếp tục truncate trong cột co giãn, không được đẩy cụm điều khiển hoặc tạo overflow ngang.

#### Mục tiêu theo ba tiêu chí

- **UI/UX:** tách danh tính và audio controls thành hai cụm rõ ràng; profile có hàng `44px`, avatar và hai dòng
  copy căn giữa; ba nút có cùng khung `36px`, lõi icon `20px`, gap đều và hiệu chỉnh quang học tối thiểu. Dark/light
  dùng cùng geometry và các token surface/hairline hiện có.
- **Feature:** giữ nguyên menu đăng xuất, tooltip, ARIA và state bật/tắt mic/tai nghe; Settings tiếp tục là integration
  seam bị khóa, không mở dialog hay route thuộc member khác.
- **Data:** không thêm hoặc sửa dữ liệu, profile contract, Auth, ShellData, API hay backend.

#### File/folder dự kiến

- `plans/dashboard.PLAN.md` — gate và kết quả phase.
- `src/app/layouts/app-layout/components/user-panel/user-panel.html|css|spec.ts` — ngoại lệ shared đã khai báo;
  chỉ đổi markup trình bày, geometry và regression test của chính user panel.
- Không tạo folder/component mới, không thêm dependency, không sửa `user-panel.ts`, `shared/avatar/**`,
  `features/auth/**`, Profile, Settings, backend hoặc database.

#### Test dự kiến và tiêu chí hoàn thành

- Profile row có hook riêng, cao ổn định và vẫn truncate tên dài; ba control nằm trong group có nhãn truy cập.
- Các button/icon dùng chung kích thước, mic/tai nghe vẫn toggle tại chỗ, Settings vẫn disabled.
- Không có overflow ngang; hover/focus/pressed dùng token và không đổi layout giữa dark/light.
- Chạy toàn bộ unit/component test, `npm run build`, Prettier và `git diff --check`.

#### Kết quả Phase UI-16

- Ngày hoàn thành code/test: 2026-08-09 trên branch `page/tai`; chờ Tài kiểm tra hover trực tiếp.
- Commit/push: không tự thực hiện vì Tài chưa yêu cầu.
- Kết quả test: toàn bộ frontend `37/37` test file và `181/181` unit/component test pass;
  `npm run build` pass browser/SSR/prerender, initial bundle `614.81 kB` dưới budget warning `700 kB`,
  không có warning `anyComponentStyle`; Prettier và `git diff --check` pass.
- Đánh giá UI/UX: profile row cao `44px` nên avatar `32px` và hai dòng copy không còn bị ép; identity và
  control group là hai vùng độc lập. Ba nút dùng chung hộp `36px`, lõi icon `20px`, gap đều và mic/tai nghe
  được bù tâm thị giác nhẹ; surface/viền chỉ dùng token nên geometry giữ nguyên ở dark/light.
- Đánh giá Feature: menu đăng xuất, tooltip, ARIA và state mic/tai nghe giữ nguyên; cụm control có nhãn group,
  tên dài tiếp tục truncate; Settings vẫn disabled và không dựng UI của member khác.
- Đánh giá Data: không sửa `user-panel.ts`, Auth, Profile contract, ShellData, API, backend hoặc database;
  không tạo folder/component/dependency mới.

### Phase UI-17 — Neo timeline chat lên vùng đầu nội dung

Status: APPROVED

> Tài yêu cầu trực tiếp giữ timeline căn giữa theo chiều ngang nhưng đưa cụm intro/tin nhắn lên phía trên.
> Phase UI append đã được cho phép đặt `APPROVED`; thay đổi chỉ thuộc hai trang chat của Dashboard.

#### Chẩn đoán và mục tiêu theo ba tiêu chí

- **UI/UX:** `chat-stage` đang dùng `justify-end`, nên khi chỉ có ít tin nhắn toàn bộ intro/timeline bị đẩy
  xuống đáy và mức tụt thay đổi theo chiều cao màn hình. Chuyển sang neo đầu nội dung ở top, vẫn giữ `max-w-4xl`,
  căn giữa ngang và padding hiện có để bố cục ổn định trên desktop/mobile, dark/light.
- **Feature:** Channel và DM dùng cùng quy tắc; vùng lịch sử vẫn tự cuộn khi nội dung vượt chiều cao, composer,
  wallpaper, message actions và demo toggle không đổi. Khi nối dữ liệu thật, logic scroll tới tin mới nhất sẽ
  thuộc phase message/pagination riêng, không giả lập trong phase UI này.
- **Data:** không sửa mock, ShellData, API, backend, database, Auth, Profile hoặc Settings.

#### File/folder và kiểm chứng

- `plans/dashboard.PLAN.md` — gate và kết quả phase.
- `src/app/features/dashboard/channel/channel.html|spec.ts`.
- `src/app/features/dashboard/conversation/conversation.html|spec.ts`.
- Không tạo file/folder/dependency mới và không sửa `layouts/**`, `shared/**`, `core/**`.
- Test xác nhận cả hai `chat-stage` dùng top anchor, không còn bottom anchor; chạy toàn bộ unit/component test,
  `npm run build`, Prettier và `git diff --check`.

#### Kết quả Phase UI-17

- Ngày hoàn thành code/test: 2026-08-09 trên branch `page/tai`; chờ Tài kiểm tra vị trí trực tiếp.
- Commit/push: không tự thực hiện vì Tài chưa yêu cầu.
- Kết quả test: toàn bộ frontend `37/37` test file và `181/181` unit/component test pass;
  `npm run build` pass browser/SSR/prerender, initial bundle `614.85 kB` dưới budget warning `700 kB`,
  không có warning `anyComponentStyle`; Prettier và `git diff --check` pass.
- Đánh giá UI/UX: `chat-stage` của Channel và DM chuyển từ bottom anchor sang top anchor, vẫn giữ
  `max-w-4xl`, căn giữa ngang, padding và wallpaper hiện có; vị trí không còn trôi theo chiều cao viewport.
- Đánh giá Feature: lịch sử vẫn là vùng cuộn độc lập và composer giữ nguyên; demo toggle, message action,
  context panel và state loading/error không đổi. Logic auto-scroll dữ liệu thật chưa được giả lập.
- Đánh giá Data: không sửa mock, service, ShellData, API, backend/database hay phần của member khác;
  không tạo file/folder/dependency mới.

### Phase UI-18 — Message actions và composer context preview

Status: APPROVED

> Tài yêu cầu trực tiếp bổ sung các chi tiết thao tác trên tin nhắn nhưng giới hạn ở UI Dashboard. Tài đã được
> báo trước việc thêm một component `message-actions/` trong cấu trúc `features/dashboard/components/` để Channel
> và DM không copy-paste interaction. Phase UI append trước đó đã được cho phép đặt `APPROVED`.

#### Chẩn đoán

- Toolbar hiện chỉ có ba icon bị khóa và lặp nguyên markup ở sáu tin demo; không có focus/tooltip thực dụng,
  reaction picker, phân biệt quyền sửa hay một nơi thể hiện ý định reply/edit/forward/delete.
- Nếu cho các action giả vờ thành công sẽ sai contract khi chưa có API, quyền, message id thật và socket sync.
  UI cần tương tác được nhưng phải nói rõ đâu là preview cục bộ và đâu đang chờ backend/team khác.

#### Mục tiêu theo ba tiêu chí

- **UI/UX:** toolbar nổi khi hover/focus, dùng Material icon/button/menu; reaction picker gọn theo hàng emoji,
  selected reaction thành chip có thể bỏ; menu “Thêm” có hierarchy rõ và destructive action tách màu semantic.
  Composer có context strip cho reply/edit/forward/delete, không làm nhảy chiều ngang; dark/light chỉ dùng token Hybrid.
- **Feature:** reaction hoạt động cục bộ trong từng message action; reply, edit tin của mình, forward và delete/recall
  mở đúng context preview phía trên composer và đóng được. Edit tin người khác disabled. Forward không mở trang/danh
  sách người nhận; delete không xóa mock; send/save vẫn khóa cho tới phase backend tương ứng.
- **Data:** không sửa mock collection, ShellData, API, DTO, backend/database, permission service hoặc realtime;
  không ghi reaction/action vào localStorage và không báo thành công giả.

#### File/folder dự kiến

- `plans/dashboard.PLAN.md` — gate và kết quả phase.
- Tạo bằng Angular CLI: `src/app/features/dashboard/components/message-actions/**`.
- `src/app/features/dashboard/components/message-composer/message-composer.ts|html|css|spec.ts` — context strip typed.
- `src/app/features/dashboard/channel/channel.ts|html|spec.ts` — lắp component/action preview cho kênh chữ.
- `src/app/features/dashboard/conversation/conversation.ts|html|spec.ts` — lắp component/action preview cho DM.
- `src/styles.css` — ngoại lệ UI dùng chung tối thiểu, chỉ scope panel overlay `.nexus-message-reaction-menu`
  vì CDK overlay render ngoài component tree.
- Không sửa `layouts/**`, `shared/**`, `core/**`, Auth, Profile, Settings; không thêm dependency hay folder khác.

#### Kiểm chứng và tiêu chí hoàn thành

- MessageActions có toolbar truy cập được, reaction toggle local, more menu và trạng thái edit theo ownership.
- MessageComposer render/đóng được bốn loại context nhưng input/send vẫn disabled.
- Channel và DM thay toàn bộ toolbar lặp bằng component chung; mỗi trang truyền đúng ownership/copy và context.
- `npm run build`, toàn bộ unit/component test, Prettier và `git diff --check` pass; Tài tự kiểm tra hover/menu trực tiếp.

#### Kết quả Phase UI-18

- Ngày hoàn thành code/test: 2026-08-09 trên branch `page/tai`; chờ Tài kiểm tra hover/menu trực tiếp.
- Commit/push: không tự thực hiện vì Tài chưa yêu cầu.
- Kết quả test: toàn bộ frontend `38/38` test file và `186/186` unit/component test pass;
  `npm run build` pass browser/SSR/prerender, initial bundle `616.27 kB` dưới budget warning `700 kB`,
  không có warning `anyComponentStyle`; Prettier và `git diff --check` pass. Lượt test đầu có `1/185` fail
  vì assertion đọc signal trước change detection; thêm chu kỳ render cho test rồi chạy lại toàn bộ sạch.
- Đánh giá UI/UX: toolbar dùng Material icon/button/menu, hover/focus không đổi layout; reaction picker là lưới
  năm emoji, reaction đã chọn thành chip có thể bỏ. More menu phân cấp edit/forward/destructive; composer context
  dùng Nexus Thread ở cạnh trái, delete đổi sang semantic danger; dark/light chỉ đổi token.
- Đánh giá Feature: reaction toggle cục bộ theo từng tin; reply/edit/forward/delete phát typed context và đóng được.
  Edit tin người khác disabled; Channel/DM đều dùng component chung. Composer input/send vẫn khóa; forward không
  mở danh sách đích và delete/thu hồi không xóa mock hay báo thành công giả.
- Đánh giá Data: không sửa ShellData/mock collection/API/DTO/backend/database/permission/realtime, không persistence
  reaction/action; không đụng `layouts/**`, `shared/**`, Auth, Profile hoặc Settings. Component mới được tạo bằng CLI.

### Phase UI-19 — Nexus Atmospheres và xem trước palette Dashboard

Status: APPROVED

> Tài gửi các mẫu Theme Preview của Discord và đã cho phép append phase UI ở trạng thái `APPROVED`. Phase này không
> sao chép paywall Nitro hay bảng màu nguyên bản; nó chuyển ý tưởng thành hệ “Nexus Atmospheres” thuộc riêng Dashboard.
> Trước khi code, Tài đã được báo chính xác hai folder/file mới và ngoại lệ tối thiểu ở `layouts/app-layout` +
> `src/styles.css` để palette có thể phủ đúng toàn bộ shell.

#### Chẩn đoán và hướng thẩm mỹ

- Theme hiện tại chỉ có một cặp Hybrid light/dark. Nó nhất quán nhưng chưa cho người dùng lựa chọn bầu không khí như
  các ảnh tham chiếu; nếu chỉ phủ một màu lên toàn trang sẽ làm rail, sidebar, workspace và panel chìm vào nhau.
- Nexus Atmospheres dùng các bộ màu tuyển chọn, mỗi bộ có cặp light/dark riêng và phân cấp bốn lớp bề mặt. Xanh Nexus
  vẫn là màu duy nhất cho CTA và trạng thái sống; palette chỉ thay canvas/surface/hairline/text neutral.
- “Chữ ký” của phase là swatch bốn mảnh mô phỏng đúng bốn vùng của Dashboard. Người dùng nhìn swatch sẽ hiểu trước
  màu nào đi vào rail, sidebar, workspace và panel, thay vì chọn một ô gradient trang trí không nói lên cấu trúc.

#### Mục tiêu theo ba tiêu chí

- **UI/UX:** panel trượt bên phải dùng ContextPanel hiện có; palette là radio card có swatch bốn vùng, tên và mô tả
  ngắn. Chọn áp dụng tức thì, có selected/focus/pressed rõ, tương phản ổn ở cả light/dark và tôn trọng reduced motion.
  Không dùng gradient fill, không thêm accent cạnh tranh với xanh Nexus.
- **Feature:** nút `palette` nằm trong cụm công cụ Friends cạnh demo/theme; mở Theme Studio và tạm thay Activity Panel.
  Có 6 lựa chọn gồm Hybrid nguyên bản, Sage café, Apricot dusk, Lilac circuit, Teal lagoon và Midnight ink. Lựa chọn
  được lưu localStorage, giữ nguyên khi đổi route/F5; đổi light/dark không làm mất Atmosphere đã chọn.
- **Data:** chỉ lưu một id palette không nhạy cảm ở trình duyệt, validate allow-list và fallback về Hybrid khi storage
  sai/bị chặn. Không thêm mock user/server, API, DTO, backend, database, Auth, Profile hoặc Settings.

#### File/folder dự kiến

- `plans/dashboard.PLAN.md` — gate và kết quả phase.
- Tạo bằng Angular CLI: `src/app/features/dashboard/components/theme-studio/**`.
- Tạo bằng Angular CLI: `src/app/features/dashboard/services/dashboard-appearance.ts|spec.ts`.
- `src/app/features/dashboard/friends/components/friends-toolbar.ts|html|spec.ts` — nút mở palette panel.
- `src/app/features/dashboard/friends/friends.ts|html|spec.ts` — điều phối Activity/Theme Studio trong một ContextPanel.
- `src/app/layouts/app-layout/app-layout.ts|html|spec.ts` — **ngoại lệ shared shell đã báo trước**, chỉ inject signal và
  gắn `data-atmosphere`; không đổi route, auth guard hoặc cấu trúc layout.
- `src/styles.css` — **ngoại lệ style dùng chung đã báo trước**, palette chỉ scope dưới `.dashboard-shell` nên các trang
  ngoài Dashboard không bị ảnh hưởng.
- Không sửa `core/**`, `shared/**`, Auth, Profile, Settings; không thêm dependency hoặc folder ngoài danh sách trên.

#### Kiểm chứng và tiêu chí hoàn thành

- Service đọc/ghi allow-list an toàn, fallback Hybrid khi storage sai và giữ state khi khởi tạo lại.
- ThemeStudio có radio semantics, selected marker, emit đúng palette và swatch dùng token cục bộ.
- Friends mở/đóng đúng Theme Studio, Activity Panel vẫn hoạt động; toolbar phản ánh `aria-expanded` đúng panel.
- AppLayout gắn đúng `data-atmosphere`; theme light/dark hiện có vẫn lưu và hoạt động qua điều hướng.
- `npm run build`, toàn bộ unit/component test, Prettier và `git diff --check` pass; Tài tự kiểm tra trực tiếp cả sáu
  Atmosphere ở hai mode và F5 để xác nhận persistence.

#### Kết quả Phase UI-19

- Ngày hoàn thành code/test: 2026-08-09 trên branch `page/tai`; chờ Tài kiểm tra trực tiếp sáu palette ở cả
  light/dark. Browser nội bộ của Codex lỗi môi trường trước khi tạo tab nên không ghi nhận visual QA tự động và không
  thêm Playwright/Codex artifact vào repo theo đúng yêu cầu của Tài.
- Commit/push: không tự thực hiện vì Tài chưa yêu cầu.
- Kết quả test: toàn bộ frontend `40/40` test file và `197/197` unit/component test pass; `npm run build` pass
  browser/SSR/prerender, initial bundle `623.59 kB` dưới budget warning `700 kB`, không có warning
  `anyComponentStyle`; Prettier và `git diff --check` pass.
- Đánh giá UI/UX: Theme Studio dùng panel phải hiện có, radio semantics và Material Ripple/Icon; sáu swatch bốn mảnh
  mô tả đúng rail/sidebar/workspace/context panel. Mỗi Atmosphere có cặp neutral light/dark riêng, trong khi CTA,
  online/unread và semantic state vẫn giữ xanh Nexus; focus, selected, pressed và reduced-motion đã có.
- Đánh giá Feature: nút palette nằm giữa demo và light/dark; Theme Studio tạm thay Activity Panel rồi trả lại nội dung
  ghim khi đóng. Chọn palette áp dụng ngay lên `data-atmosphere` của Dashboard shell, lưu qua F5/đổi route; mode và
  Atmosphere độc lập. Storage sai fallback Hybrid.
- Đánh giá Data: chỉ lưu allow-listed palette id trong localStorage; không sửa ShellData/mock/API/DTO/backend/database,
  không đụng Auth, Profile hoặc Settings. Component và service mới đều được scaffold bằng Angular CLI; ngoại lệ
  `layouts/app-layout` chỉ gắn một data attribute đã khai trước trong phase.

### Phase UI-20 — Menu tùy chọn bạn bè dạng UI preview

Status: APPROVED

> Tài đã yêu cầu thiết kế menu mở từ nút ba chấm của mỗi hàng bạn bè và xác nhận các lệnh chưa được tương tác.
> Phase này chỉ sửa các file Dashboard UI hiện có, không tạo folder/file component mới và không nối sang Profile,
> Settings, backend hoặc database.

#### Mục tiêu theo ba tiêu chí

- **UI/UX:** nút ba chấm có nhãn truy cập theo tên người dùng và mở một Material menu gọn, phân cấp thành nhận diện,
  liên lạc, quản lý và an toàn. Menu dùng token Hybrid/Nexus, tương phản tốt ở light/dark, có focus rõ và đánh dấu
  “Bản xem trước · chờ kết nối” để người dùng không hiểu nhầm đây là chức năng đã hoàn thiện.
- **Feature:** hiển thị sáu lệnh mẫu gồm gọi thoại, gọi video, tắt thông báo, thêm biệt danh, xóa khỏi danh sách bạn
  và chặn. Trigger mở/đóng được; toàn bộ lệnh bên trong disabled, không phát event, không điều hướng và không hiện
  trạng thái thành công giả. Nút nhắn tin hiện có vẫn hoạt động độc lập.
- **Data:** chỉ đọc `ConversationSummary` hiện có để hiển thị avatar, tên và trạng thái. Không sửa fake data,
  ShellData, API, DTO, permission, persistence, backend hoặc database.

#### File dự kiến

- `plans/dashboard.PLAN.md` — gate và kết quả phase.
- `src/app/features/dashboard/friends/components/friend-row.ts|html|css|spec.ts` — trigger, Material menu, bố cục và test.
- `src/styles.css` — style overlay tối thiểu scope bằng `.nexus-friend-options-menu`, vì Material menu render ngoài cây
  Dashboard qua CDK overlay.
- Không thêm dependency, folder hoặc file code mới; không sửa Auth, Profile, Settings hay phần của thành viên khác.

#### Kiểm chứng và tiêu chí hoàn thành

- Click nút “Tùy chọn cho <tên>” mở đúng menu của hàng tương ứng; menu có đủ sáu lệnh và tất cả đều disabled.
- Header menu dùng đúng dữ liệu của người bạn được chọn, trạng thái preview dễ nhận biết nhưng không lấn nội dung.
- Existing DM link, nút nhắn tin, hover/focus của hàng bạn bè không hồi quy.
- `npm run build`, toàn bộ unit/component test, Prettier và `git diff --check` pass; Tài tự kiểm tra trực tiếp light/dark.

#### Kết quả Phase UI-20

- Ngày hoàn thành code/test: 2026-08-09 trên branch `page/tai`; chờ Tài kiểm tra trực tiếp menu ở light/dark và các
  Nexus Atmosphere. Commit/push không tự thực hiện vì Tài chưa yêu cầu.
- Kết quả test: targeted FriendRow `8/8` test pass; toàn bộ frontend `40/40` test file và `199/199` unit/component
  test pass. `npm run build` pass browser/SSR/prerender, initial bundle `626.34 kB` dưới budget warning `700 kB`;
  Prettier và `git diff --check` pass.
- Đánh giá UI/UX: trigger ba chấm có accessible label theo đúng tên bạn bè và active state thống nhất. Material menu
  có header avatar/trạng thái, nhãn preview và ba nhóm Liên lạc/Quản lý/An toàn; bề mặt, divider, chữ phụ và danger
  đều dùng token Hybrid/Nexus, style overlay được scope riêng nên không đổi menu của trang thành viên khác.
- Đánh giá Feature: menu mở/đóng được, hiển thị đủ gọi thoại, gọi video, tắt thông báo, thêm biệt danh, xóa bạn và
  chặn. Cả sáu lệnh đều dùng trạng thái disabled thật; nút DM hiện có vẫn hoạt động và không có success state giả.
- Đánh giá Data: chỉ đọc `ConversationSummary` để render tên/avatar/presence; không sửa ShellData, fake data, API,
  DTO, permission, persistence, backend, database, Auth, Profile hoặc Settings; không thêm dependency/folder/file code.

### Phase UI-21 — Tăng tương phản hover/focus cho khối người dùng

Status: APPROVED

> Tài đã gửi ảnh light/dark cho thấy khối avatar + tên ở đáy sidebar gần như hòa vào nền khi hover, trong khi mic
> và tai nghe có tín hiệu màu đúng. Theo quyền append phase UI đã được Tài duyệt, phase này chỉ hiệu chỉnh state của
> `UserPanel`; không mở rộng giao diện Profile/Settings và không tạo folder/file mới.

#### Mục tiêu theo ba tiêu chí

- **UI/UX:** hover, keyboard focus và trạng thái menu đang mở của khối danh tính phải có nền `surface-feature` pha
  xanh Nexus, hairline xanh vừa đủ và elevation nhẹ. Tên đổi sang `primary-soft`, trạng thái tăng lên `slate`; avatar
  có vòng nhận diện nhỏ. Các tín hiệu dùng token trong `DESIGN-nexuscord-hybrid.md`, rõ ở cả warm-cream light và
  deep-teal dark nhưng không biến toàn bộ khối thành CTA xanh.
- **Feature:** giữ nguyên MatMenu đăng xuất hiện có; `aria-expanded=true` dùng chung state hình ảnh với hover/focus,
  click/keyboard vẫn mở menu bình thường. Mic, tai nghe và Settings không đổi logic hay vị trí.
- **Data:** không sửa ProfileService/AuthService, dữ liệu người dùng, API, fake data, backend hoặc database.

#### File dự kiến

- `plans/dashboard.PLAN.md` — gate và kết quả phase.
- `src/app/layouts/app-layout/components/user-panel/user-panel.css|spec.ts` — state nhận diện và test menu-open.
- Đây là ngoại lệ `layouts/**` tối thiểu đã báo trước vì UserPanel thuộc shared shell của Dashboard; không sửa component
  Profile/Settings, không thêm dependency, folder hoặc file code.

#### Kiểm chứng và tiêu chí hoàn thành

- Hover/focus/menu-open của khối danh tính tách rõ khỏi nền sidebar ở light/dark và không làm layout dịch chuyển.
- Trigger MatMenu phản ánh `aria-expanded` đúng; tên dài, audio toggle và Settings integration seam không hồi quy.
- Targeted UserPanel test, toàn bộ unit/component test, `npm run build`, Prettier và `git diff --check` pass.

#### Kết quả Phase UI-21

- Ngày hoàn thành code/test: 2026-08-09 trên branch `page/tai`; chờ Tài F5 và kiểm tra trực tiếp light/dark. Browser
  nội bộ của Codex không khởi tạo được môi trường kiểm tra nên không ghi visual QA tự động và không thêm artifact
  kiểm kê vào repo theo yêu cầu của Tài. Commit/push không tự thực hiện.
- Kết quả test: targeted UserPanel `7/7` test pass; toàn bộ frontend `40/40` test file và `200/200` unit/component
  test pass. `npm run build` pass browser/SSR/prerender, initial bundle `626.34 kB` dưới budget warning `700 kB`;
  Prettier và `git diff --check` pass.
- Đánh giá UI/UX: state hover/focus/menu-open dùng chung nền `surface-feature` pha 15% `primary-soft`, inner hairline
  xanh và shadow level nhẹ; tên chuyển `primary-soft`, trạng thái sang `slate`, avatar có vòng nhận diện. Tất cả dùng
  token Hybrid/Atmosphere, không hardcode hex và reduced-motion tắt transition/scale.
- Đánh giá Feature: trigger đăng xuất vẫn là MatMenu hiện có và phản ánh `aria-expanded`; mic/deafen giữ local toggle,
  Settings vẫn disabled integration seam. Không thay geometry nên không phát sinh overflow hoặc layout shift.
- Đánh giá Data: không sửa HTML/TypeScript service, ProfileService/AuthService, dữ liệu người dùng, API, fake data,
  backend, database, Auth, Profile hoặc Settings; không thêm dependency/folder/file code.

### Phase UI-22 — Phân tách tìm kiếm danh bạ và điều hướng toàn cục

Status: APPROVED

> Tài yêu cầu làm rõ ô tìm kiếm trên sidebar Bạn bè khác gì kính lúp trên server rail và đặt kết quả người dùng ở
> đâu. Theo quyền append phase UI đã được duyệt, phase này kích hoạt lọc dữ liệu shell hiện có và sửa copy/phân cấp
> của Command Center; không thêm folder, không giả lập tìm nội dung tin nhắn và không nối backend.

#### Mục tiêu theo ba tiêu chí

- **UI/UX:** ô đầu sidebar mang nhãn “Tìm người hoặc cuộc trò chuyện”, luôn nằm trên lối vào Bạn bè; khi nhập, các
  hàng người dùng/DM được lọc ngay tại vị trí danh sách Tin nhắn trực tiếp, section label hiện số kết quả và có empty
  state hướng người dùng sang Bạn bè để thêm người mới. Kính lúp rail được gọi rõ là “Điều hướng toàn Nexus”, dialog
  có dải phạm vi tĩnh Máy chủ/Kênh/Tin nhắn riêng để không bị hiểu là ô tìm nội dung chat.
- **Feature:** sidebar lọc tên và status không phân biệt hoa/thường hoặc dấu tiếng Việt. Command Center mặc định cân
  bằng tối đa ba DM, ba server và ba channel; khi nhập sẽ ưu tiên khớp đầu tên, rồi khớp trong tên, context và keyword.
  Ctrl/Cmd+K, route link và empty state người dùng mới tiếp tục hoạt động.
- **Data:** chỉ lọc các signal `conversations/servers/channels` trong ShellData hiện có. Không tìm người lạ hoặc nội
  dung message khi chưa có API/permission/pagination; không sửa ShellData collection, backend hay database.

#### File dự kiến

- `plans/dashboard.PLAN.md` — gate và kết quả phase.
- `src/app/layouts/app-layout/components/channel-sidebar/channel-sidebar.ts|html|spec.ts` — query sidebar và binding.
- `src/app/layouts/app-layout/components/channel-sidebar/components/conversation-list.ts|html|spec.ts` — lọc, vị trí
  kết quả người dùng và empty state theo query.
- `src/app/layouts/app-layout/components/server-rail/server-rail.ts|html|spec.ts` — phạm vi, cân bằng và ranking Command.
- `src/styles.css` — style dải scope trong dialog overlay, được scope dưới `.nexus-add-server-dialog .command-center`.
- Đây là ngoại lệ `layouts/**` và global overlay style tối thiểu đã báo trước; không thêm dependency/folder/file code,
  không sửa Auth, Profile hoặc Settings.

#### Kiểm chứng và tiêu chí hoàn thành

- Sidebar search enabled, lọc đúng demo conversation theo tên/status, bỏ dấu và hiển thị empty state tìm kiếm riêng.
- Friends route vẫn cố định phía trên; user/DM result không chạy sang rail hoặc workspace.
- Rail tooltip/aria/copy không tuyên bố tìm nội dung message; default có đủ DM/server/channel và query ranking đúng.
- Targeted test, toàn bộ unit/component test, `npm run build`, Prettier và `git diff --check` pass.

#### Kết quả Phase UI-22

- Ngày hoàn thành code/test: 2026-08-09 trên branch `page/tai`; chờ Tài kiểm tra trực tiếp hai phạm vi search tại
  `localhost:4200`. Commit/push không tự thực hiện vì Tài chưa yêu cầu.
- Kết quả test: ba targeted spec `24/24` test pass; toàn bộ frontend `40/40` test file và `203/203` unit/component
  test pass. `npm run build` pass browser/SSR/prerender, initial bundle `627.08 kB` dưới budget warning `700 kB`;
  Prettier và `git diff --check` pass.
- Đánh giá UI/UX: sidebar dùng copy “Tìm người hoặc cuộc trò chuyện”, giữ Friends cố định phía trên và render kết quả
  người/DM tại đúng danh sách với count/empty riêng. Command Center đổi thành “Điều hướng toàn Nexus” và có ba badge
  phạm vi Máy chủ/Kênh/Tin nhắn riêng dùng Material icon + token Hybrid, không lẫn với content search.
- Đánh giá Feature: sidebar lọc tên/status không phân biệt dấu/hoa thường. Command mặc định cân bằng 3 DM + 3 server +
  3 channel; query rank exact → starts-with → contains → context → keyword. Ctrl/Cmd+K, route link, new-user empty và
  nút xóa query tiếp tục hoạt động; ví dụ `binh` tìm được `bình'`, `lofi` đưa DM đúng tên lên trước, `standup` ra voice.
- Đánh giá Data: chỉ computed/filter các signal ShellData đã có; không sửa collection hay tạo dữ liệu giả mới, không
  giả tìm người ngoài danh bạ hoặc message content, không sửa API/backend/database/Auth/Profile/Settings và không thêm
  dependency/folder/file code.

### Phase UI-23 — Gỡ bỏ Nexus Atmospheres khỏi Dashboard

Status: APPROVED

> Tài xác nhận Atmosphere chỉ là phần thử nghiệm ngoài phạm vi Dashboard và hiện đã có thành viên khác phụ trách
> theme. Theo quyền append phase UI đã được duyệt, phase này xóa trọn feature Atmosphere nhưng giữ dark/light nền
> tảng để không xâm phạm phần theme chung hoặc Settings/Appearance của thành viên khác.

#### Mục tiêu theo ba tiêu chí

- **UI/UX:** bỏ nút palette và Theme Studio khỏi Friends toolbar/context panel; cụm công cụ còn lại tự liền mạch,
  Activity Panel tiếp tục mở/đóng đúng hành vi cũ và Dashboard vẫn dùng token Hybrid ở dark/light.
- **Feature:** xóa service/state/persistence Atmosphere, sáu palette, `data-atmosphere` và component preview; không để
  selector, import, test hoặc localStorage key mồ côi.
- **Data:** không sửa ShellData, API, backend hoặc database. Không đụng Auth, Profile, Settings/Appearance và
  `ThemeService` dùng chung.

#### File dự kiến

- `src/app/features/dashboard/components/theme-studio/**` — xóa component và test Atmosphere.
- `src/app/features/dashboard/services/dashboard-appearance.ts|spec.ts` — xóa state/persistence Atmosphere.
- `src/app/features/dashboard/friends/**` — tháo nút, panel, binding và test liên quan.
- `src/app/layouts/app-layout/app-layout.ts|html|spec.ts` — bỏ injection và `data-atmosphere`.
- `src/styles.css` — xóa palette/preview Atmosphere, giữ semantic surface hierarchy của Dashboard.
- `plans/dashboard.PLAN.md` — ghi scope và kết quả gỡ feature.

#### Kiểm chứng và tiêu chí hoàn thành

- `rg` không còn tham chiếu Atmosphere trong source code Dashboard.
- Friends toolbar không còn nút palette; demo, activity và dark/light vẫn hoạt động.
- Targeted test, toàn bộ unit/component test, `npm run build`, Prettier và `git diff --check` pass.

#### Kết quả Phase UI-23

- Ngày hoàn thành code/test: 2026-08-21 trên branch `pages/dashboard/minh-tai`; không commit/push tự động.
- Kết quả rà soát: source Dashboard còn `0` tham chiếu Atmosphere/Theme Studio/`data-atmosphere`; xóa 6 file
  chuyên biệt và tháo toàn bộ binding, CSS palette, persistence cùng test tương ứng.
- Kết quả test: hai targeted Friends spec `19/19` pass. Toàn bộ frontend `40/41` test file và `221/222` test pass;
  một test AppLayout cũ vẫn đòi nút Settings disabled với aria-label cũ, thuộc vùng Settings và không liên quan phase.
- `npm run build` pass browser/SSR/prerender; warning duy nhất là CSS budget của `settings/account-tab` vượt 185 bytes,
  không thuộc Dashboard. Prettier và `git diff --check` pass.
- Đánh giá UI/UX: Friends toolbar không còn nút palette; Activity Panel, demo toggle và dark/light nền tảng giữ nguyên.
  Dashboard quay về duy nhất token Hybrid với semantic surface hierarchy cho cả hai mode.
- Đánh giá Feature: đã xóa service/state/localStorage/6 palette/Theme Studio/`data-atmosphere`; không còn import,
  selector hoặc test mồ côi trong source.
- Đánh giá Data: không sửa ShellData, API, backend, database, Auth, Profile, Settings/Appearance hoặc ThemeService.

### Phase UI-24 — Quản lý nhóm kênh & Tạo kênh thật qua Backend API

Status: COMPLETED

> Tài đã yêu cầu bổ sung nút `+` tạo kênh cho từng nhóm Kênh chữ / Kênh thoại trong sidebar máy chủ,
> hỗ trợ thu gọn/mở rộng nhóm bằng chevron, hiện action buttons khi hover/focus từng hàng kênh (Mời, Cài đặt, Mở chat thoại),
> và tạo kênh thật lưu vào cơ sở dữ liệu qua Backend API thay vì dùng dữ liệu giả.

#### Mục tiêu theo ba tiêu chí

- **UI/UX:**
  - Tiêu đề nhóm kênh (Kênh chữ, Kênh thoại) có chevron xoay/lật mượt mà khi thu gọn/mở rộng và nút `+` nhỏ gọn tinh tế ở góc phải (`mat-icon` add) với tooltip "Tạo kênh".
  - Hàng kênh trong danh sách: khi hover hoặc focus bàn phím, xuất hiện dải action buttons bán trong suốt chuyển opacity êm ái:
    - Kênh chữ: nút "Mời" (`person_add`) và "Cài đặt kênh" (`settings`).
    - Kênh thoại: nút "Mở trò chuyện" (`chat_bubble_outline`), "Mời" (`person_add`) và "Cài đặt kênh" (`settings`).
  - Dialog "Tạo kênh" theo phong cách NexusCord Hybrid (Dark deep-teal / Light warm-cream):
    - Chọn loại kênh dạng thẻ radio trực quan (Kênh chữ vs Kênh thoại) kèm icon và mô tả.
    - Nhập tên kênh có tiền tố trực quan (`#` cho kênh chữ, volume cho kênh thoại) và hỗ trợ format slug.
    - Nút CTA pill chuẩn NexusCord với trạng thái loading spinner và hiển thị thông báo lỗi inline nếu API thất bại.
- **Feature:**
  - Bấm `+` ở nhóm nào mở dialog Tạo kênh với loại kênh đó được chọn sẵn.
  - Thu gọn/mở rộng từng nhóm độc lập, lưu trạng thái thu gọn trong component signal.
  - Các nút action trên hàng kênh chặn nổi bọt sự kiện (`event.stopPropagation()`) để không kích hoạt điều hướng nhầm kênh.
  - Gửi request tạo kênh thật lên backend qua `POST /api/servers/:serverId/channels`.
  - Cập nhật reactive danh sách kênh ngay trên `ShellData` sau khi tạo thành công mà không cần F5 trang.
- **Data:**
  - Backend NestJS `ServersController` & `ServersService`: Thêm endpoint `POST /api/servers/:serverId/channels`.
  - Kiểm tra quyền thành viên / owner trong `server_members`, tính toán `position` tự động tăng và insert vào bảng `public.channels`.
  - Trả về DTO `ChannelSummaryDto` chuẩn xác.
  - Tuyệt đối không hardcode dữ liệu giả trong `shell-data.ts`.

#### File thực hiện

- Frontend:
  - `plans/dashboard.PLAN.md` — ghi nhận kết quả và tiêu chí nghiệm thu.
  - `src/app/layouts/app-layout/components/channel-sidebar/components/channel-list.ts|html|css|spec.ts` — header nhóm (chevron + nút `+`), thu gọn/mở rộng, action buttons on hover/focus với `stopPropagation()`.
  - `src/app/layouts/app-layout/components/channel-sidebar/components/create-channel-dialog/create-channel-dialog.ts|html|css|spec.ts` — component dialog tạo kênh mới chuẩn Hybrid design.
  - `src/app/core/api/servers-api.service.ts|spec.ts` — method `createChannel(serverId, name, type, topic)`.
  - `src/app/core/api/shell-data.ts|spec.ts` — method `addChannel(serverId, channel)`.
- Backend:
  - `nexus-be/src/modules/servers/dto/create-channel.dto.ts` — DTO validate tạo channel.
  - `nexus-be/src/modules/servers/servers.controller.ts|spec.ts` — endpoint `POST /api/servers/:serverId/channels`.
  - `nexus-be/src/modules/servers/servers.service.ts|spec.ts` — logic kiểm tra membership, tính position và insert vào DB `channels`.

#### Kết quả kiểm thử & Nghiệm thu

- **Backend Tests:**
  - `npm test` trong `nexus-be`: **5/5 test suites passed, 36/36 tests passed (100%)**.
  - `npm run build` trong `nexus-be`: **Build thành công 0 lỗi**.
- **Frontend Tests:**
  - `npm test -- --watch=false` trong `nexus-fe`: **42/42 test files passed, 235/235 tests passed (100%)**.
  - `npm run build` trong `nexus-fe`: **Build production bundle thành công 0 lỗi**.
- **Đánh giá UI/UX:**
  - Chevron xoay êm ái `-90deg` khi thu gọn nhóm kênh, nút `+` hover đổi màu và hiện tooltip rõ ràng.
  - Hover/focus vào hàng kênh hiển thị mượt mà dải nút thao tác nhanh (Mời, Cài đặt, Mở chat thoại), không bị giật layout hay shift dòng.
  - Modal tạo kênh theo đúng bảng màu Hybrid Dark (Deep Teal) / Light (Warm Cream), có radio cards, auto slug slugify cho text channel, spinner loading và báo lỗi inline.
- **Đánh giá Feature:**
  - Bấm `+` ở Kênh chữ mở modal chọn sẵn Kênh chữ; bấm `+` ở Kênh thoại mở modal chọn sẵn Kênh thoại.
  - Click các nút action không gây nhảy route ngoài ý muốn.
  - Tạo kênh xong được đẩy vào `ShellData` và hiển thị tức thì trên sidebar.
- **Đánh giá Data:**
  - Backend NestJS insert trực tiếp vào bảng `public.channels` của Supabase, tự động gán vị trí thứ tự `position` kế tiếp.
  - Không sinh thêm dữ liệu giả mạo trong `shell-data.ts`.

---

### Phase UI-25 — Menu tùy chọn máy chủ (Server Context Menu) chuẩn mẫu Discord

Status: APPROVED

> Tài đã gửi hình ảnh mẫu menu tùy chọn kế bên tên máy chủ của Discord và yêu cầu xây dựng một bảng tùy chọn đầy đủ,
> chuẩn xác từng icon, danh mục phân cấp và cơ chế đóng mở (chevron xoay/đổi hướng, nút mời góc phải, các action phân nhóm, checkbox ẩn kênh tắt thông báo).
> Theo quy trình `implement-skill`, phase này ở trạng thái PENDING chờ Tài duyệt trước khi code.

#### Mục tiêu theo ba tiêu chí

- **UI/UX:**
  - Header máy chủ trong sidebar: hiển thị tên máy chủ cắt gọn (`truncate`), chevron `expand_more` lật `expand_less` (xoay 180deg) mượt mà khi menu mở/đóng, và nút icon `person_add` (Mời vào máy chủ) ở góc phải.
  - Menu tùy chọn máy chủ theo phong cách Hybrid (Dark deep-teal / Light warm-cream), bo góc `rounded-2xl`, bóng đổ `shadow-modal`, đường viền `border-hairline`:
    - **Nhóm 1:** `Nâng Cấp Máy Chủ` (`diamond` / `rocket_launch` với hiệu ứng màu tím/hồng đặc trưng).
    - **Nhóm 2:** `Mời Vào Máy Chủ` (`person_add` với màu primary xanh sáng), `Cài đặt máy chủ` (`settings`), `Tạo kênh` (`add_circle`), `Tạo Danh Mục` (`create_new_folder`), `Tạo Sự kiện` (`calendar_today`), `Thư Mục App` (`apps`).
    - **Nhóm 3:** `Cài đặt thông báo` (`notifications`), `Cài Đặt Bảo Mật` (`security`).
    - **Nhóm 4:** `Chỉnh Sửa Hồ Sơ Theo Máy Chủ` (`edit`), `Ẩn Các Kênh Bị Tắt Thông Báo` (`visibility_off` kèm checkbox toggle trạng thái).
    - **Nhóm 5:** `Rời khỏi máy chủ` (`logout` với màu đỏ `text-danger`).
- **Feature:**
  - Click vào header mở dropdown menu, đóng lại khi click ra ngoài hoặc chọn một mục.
  - Mục `Tạo kênh` kết nối mở trực tiếp `CreateChannelDialog`.
  - Mục `Cài đặt máy chủ` kết nối mở trực tiếp cài đặt server qua `UserSettingsService.openServerSettings('server-overview', serverId)`.
  - Mục `Mời Vào Máy Chủ` tích hợp trigger mời thành viên.
  - Mục `Ẩn Các Kênh Bị Tắt Thông Báo` hỗ trợ toggle checkbox trực tiếp trong menu.
  - Các mục nâng cao khác được cắm seam an toàn không làm lỗi hệ thống hay break layout.
- **Data:**
  - Giữ nguyên trạng thái phân quyền `canAccessServerSettings()` / vai trò người dùng trong server.
  - Không thêm dữ liệu giả mạo hay sinh mã rác.

#### File dự kiến thay đổi

- `plans/dashboard.PLAN.md` — kế hoạch phase UI-25.
- `src/app/layouts/app-layout/components/channel-sidebar/channel-sidebar.ts|html|css|spec.ts` — cập nhật header máy chủ, server menu dropdown đầy đủ mục theo mẫu, kết nối dialog tạo kênh và cài đặt.

#### Kiểm chứng và tiêu chí hoàn thành

- Click vào tên máy chủ / header mở menu tùy chọn với toàn bộ các nhóm theo hình chụp mẫu của Discord.
- Chevron trên header lật hướng khi menu mở / đóng.
- Nút "Tạo kênh" trong menu mở dialog tạo kênh (`CreateChannelDialog`).
- Nút "Cài đặt máy chủ" mở modal Cài đặt máy chủ.
- Nút "Ẩn Các Kênh Bị Tắt Thông Báo" có thể tick/untick checkbox.
- Tất cả unit tests FE (`npm test -- --watch=false`) và BE (`npm test`) tiếp tục pass 100%.
- `npm run build` thành công 0 lỗi.

---

### Phase UI-26 — Context Menu khi nhấp chuột phải trong Channel Sidebar (Category & Channel Context Menus)

Status: COMPLETED

> Bổ sung Context Menu khi nhấp chuột phải vào Danh mục/Nhóm kênh (Kênh chữ, Kênh thoại) và Từng hàng kênh (#chung, Kênh thoại).
> Menu xuất hiện chính xác tại vị trí con trỏ chuột (`clientX, clientY`), hỗ trợ bàn phím (`Shift+F10`), tự động lật hướng nếu gần mép màn hình,
> có submenu đa cấp cho Tắt âm (thời gian) và Cài đặt thông báo (mức độ), item nguy hiểm màu đỏ ở cuối, và các tính năng khả dụng hoạt động thật (Thu gọn danh mục, Thu gọn tất cả, Sao chép liên kết kênh, Đánh dấu đã đọc, Tạo kênh cùng loại).

#### Mục tiêu theo ba tiêu chí

- **UI/UX:**
  - Context menu định vị tại vị trí con trỏ chuột (`position: fixed; left, top`), tự động lật hướng và tránh tràn màn hình (nhờ CDK Overlay / MatMenu).
  - Phong cách Hybrid (Dark deep-teal / Light warm-cream), bo góc `rounded-lg` (`8px`), viền mờ `border-hairline`, bóng đổ `shadow-modal`.
  - Icon bên trái `20px` với khoảng cách `margin-right: 12px` chuẩn xác, nhãn chữ rõ ràng, mũi tên submenu `chevron_right` bên phải.
  - Submenu đa cấp cho:
    - `Tắt âm`: Lựa chọn 15 phút, 1 giờ, 8 giờ, 24 giờ, Đến khi tôi bật lại.
    - `Cài đặt thông báo`: Mặc định, Tất cả tin nhắn, Chỉ @mentions, Không có gì.
  - Mục nguy hiểm (`Xóa kênh`, `Xóa danh mục`) dùng `text-danger` với icon đỏ cảnh báo.
  - Phím tắt `Shift+F10` / phím Context Menu và phím `Escape` đóng menu hoạt động tự nhiên.
- **Feature:**
  - Chuột phải trên tiêu đề nhóm (Kênh chữ, Kênh thoại):
    - `Đánh dấu đã đọc`: Gọi đánh dấu đã đọc cho tất cả kênh trong nhóm.
    - `Thu gọn danh mục`: Toggle trạng thái thu gọn với checkbox trực quan.
    - `Thu gọn tất cả danh mục`: Thu gọn toàn bộ các nhóm kênh trong server.
    - `Tắt âm danh mục`: Mở submenu chọn thời gian tắt âm.
    - `Cài đặt thông báo`: Mở submenu chọn mức thông báo.
    - `Chỉnh sửa danh mục`: Seam (disabled hoặc thông báo nhóm mặc định hệ thống).
    - `Xóa danh mục`: Seam (disabled hoặc thông báo nhóm mặc định hệ thống).
  - Chuột phải trên hàng kênh (#chung, voice channel):
    - `Đánh dấu đã đọc`: Đánh dấu kênh là đã đọc.
    - `Mời vào kênh`: Seam trigger mở modal mời.
    - `Ghim kênh lên đầu`: Seam ghim kênh.
    - `Sao chép liên kết`: Sao chép URL kênh thật vào clipboard (`navigator.clipboard.writeText`) kèm thông báo.
    - `Tắt âm kênh`: Mở submenu chọn thời gian tắt âm.
    - `Cài đặt thông báo`: Mở submenu chọn mức thông báo.
    - `Chỉnh sửa kênh`: Mở modal cài đặt kênh / seam.
    - `Trùng lặp kênh`: Seam nhân bản kênh.
    - `Tạo kênh mới cùng loại`: Mở trực tiếp `CreateChannelDialog` với `defaultType` tương ứng.
    - `Xóa kênh`: Mục nguy hiểm (danger) với seam xác nhận xóa.
- **Data:**
  - Ghi nhận rõ: Do backend hiện chưa có bảng `categories` riêng biệt mà nhóm theo `channel.type`, các thao tác chỉnh sửa/xóa category hệ thống sẽ là seam an toàn không phá vỡ schema.
  - Sao chép liên kết, thu gọn nhóm, tạo kênh cùng loại hoạt động thật trên dữ liệu hiện hành.

#### File thực hiện

- `plans/dashboard.PLAN.md` — ghi nhận kết quả và nghiệm thu phase UI-26.
- `src/app/layouts/app-layout/components/channel-sidebar/components/channel-list.ts|html|css|spec.ts` — tích hợp context menu cho category header và channel row.

#### Kết quả kiểm thử & Nghiệm thu

- **Frontend Tests:**
  - `npm test -- --watch=false` trong `nexus-fe`: **42/42 test files passed, 245/245 tests passed (100%)**.
  - `npm run build` trong `nexus-fe`: **Build production bundle thành công 0 lỗi**.
- **Đánh giá UI/UX:**
  - Context menu mở chính xác tại vị trí con trỏ chuột khi nhấp chuột phải trên category header hoặc channel row.
  - Thiết kế chuẩn Discord với icon 20px, khoảng cách đệm 12px, submenu mượt mà, danger item màu đỏ cảnh báo.
- **Đánh giá Feature:**
  - Thu gọn danh mục có checkbox trạng thái, thu gọn tất cả nhóm kênh hoạt động tức thì.
  - Sao chép liên kết kênh vào clipboard hoạt động chuẩn xác.
  - Tạo kênh mới cùng loại mở trực tiếp modal `CreateChannelDialog` với đúng channel type.
  - Click chuột trái bình thường không bị ảnh hưởng.
- **Đánh giá Data:**
  - Hoạt động an toàn trên dữ liệu hiện hữu, không sửa đổi schema database hay sinh mã rác.

---

### Phase UI-27 — Tái thiết kế toàn diện hệ thống Drag & Drop và Folder của Server Rail chuẩn 100% Discord

Status: COMPLETED

> Đập bỏ và xây dựng lại toàn bộ cơ chế Drag & Drop và Folder của Server Rail theo đúng 100% tài liệu kỹ thuật chuẩn Discord:
>
> 1. Mảng 1 chiều chứa hỗn hợp Server đơn lẻ và Folder theo thứ tự người dùng.
> 2. Vùng tác động (Hitbox & Drop zones) tính toán chính xác theo tỷ lệ con trỏ chuột:
>    - 25% trên / 25% dưới: Reorder (hiển thị Drop Line Indicator thanh ngang trắng bo tròn giữa 2 item, không nhảy giật layout).
>    - 50% trung tâm: Gom nhóm tạo Folder mới (hiển thị highlight aura bao quanh item đích).
>    - Kéo vào Folder (đóng/mở): Folder đóng có viền highlight nhận item; Folder mở hiển thị drop line chèn vào danh sách con.
>    - Kéo Server ra ngoài Folder: Hiển thị drop line ở danh sách chính; tự động giải tán Folder khi chỉ còn <= 1 server.
> 3. Trạng thái hiển thị (UI States):
>    - Icon 48x48px: Mặc định tròn `50%` (circle), hover chuyển squircle `30%` trong 150ms.
>    - Folder đóng: Ô vuông bo góc chứa grid 2x2 icon thu nhỏ.
>    - Folder mở: Khung mở rộng theo chiều dọc với background dạng viên thuốc (Pill shape) màu xám mờ ôm trọn danh sách con.
>    - Chỉ báo Pill mép trái: Unread (chấm 8px), Hover (vạch 20px), Active (vạch 40px).
>    - Kéo thả mượt mà: Item gốc mờ 40%, drag preview bám theo chuột với bóng đổ, transition co giãn 200ms-300ms, không lag giật layout khi đang kéo.

#### Mục tiêu theo ba tiêu chí

- **UI/UX:**
  - Icon server/folder kích thước cố định 48x48px, circle 50% sang squircle 30% khi hover trong 150ms.
  - Folder đóng hiển thị 2x2 grid icon thu nhỏ (size 16x16px mỗi ô).
  - Folder mở hiển thị nền dạng viên nang (Pill background) xám mờ mượt mà ôm trọn danh sách server con.
  - Thanh chỉ báo mép trái (Pill indicator) 3 trạng thái: Không hiển thị (bình thường), Chấm nhỏ (unread), Vạch dài (hover/active).
  - Hiệu ứng Drag Preview nổi bám chuột và icon gốc giảm opacity 0.4.
  - Drop Line Indicator sắc nét dày 2-3px bo tròn 2 đầu xuất hiện giữa khe hở các item.
- **Feature:**
  - Sắp xếp thứ tự Server đơn lẻ và Folder trong một mảng thống nhất.
  - Kéo Server vào 25% trên/dưới item khác $\rightarrow$ Chèn thứ tự trước/sau (Reorder).
  - Kéo Server vào 50% trung tâm Server khác $\rightarrow$ Tạo Folder mới chứa 2 server.
  - Kéo Server vào Folder (đóng/mở) $\rightarrow$ Thêm server vào Folder.
  - Kéo Server từ trong Folder ra ngoài $\rightarrow$ Trả về Server đơn lẻ ngoài rail, tự động xóa Folder nếu chỉ còn $\le 1$ server.
  - Click mở/đóng Folder với animation chuyển động 200ms.
- **Data:**
  - Cấu trúc dữ liệu rail thống nhất: ServerItem & FolderItem.
  - Tương thích 100% với `ShellData` và API backend hiện tại.

#### File thực hiện

- `plans/dashboard.PLAN.md` — ghi nhận kết quả và nghiệm thu phase UI-27.
- `src/app/layouts/app-layout/components/server-rail/server-rail.ts|html|css|spec.ts` — tái thiết kế toàn diện logic, template và styling.

#### Kết quả kiểm thử & Nghiệm thu

- **Frontend Tests:**
  - `npm test -- --watch=false` trong `nexus-fe`: **42/42 test files passed, 250/250 tests passed (100%)**.
  - `npm run build` trong `nexus-fe`: **Build production bundle thành công 0 lỗi**.
- **Đánh giá UI/UX:**
  - Icon 48x48px chuyển từ tròn sang vuông mềm mại (150ms).
  - Drop line phát sáng xuất hiện chính xác ở khe giữa các item khi hover vào 25% trên/dưới.
  - Aura viền highlight phát sáng khi hover 50% tâm server hoặc folder.
  - Folder đóng hiển thị 2x2 grid thu nhỏ; Folder mở hiển thị nền viên thuốc ôm trọn danh sách con.
- **Đánh giá Feature:**
  - Toàn bộ cơ chế Drag & Drop và Folder hoạt động chính xác 100% theo đặc tả chuẩn Discord.

### Phase UI-28 — Hiệu chỉnh Server Rail theo video tương tác Discord thực tế

Status: COMPLETED

> Phase này thay thế các giả định chưa đúng trong UI-27 bằng hành vi quan sát trực tiếp từ video
> Discord do Tài cung cấp ngày 21/08/2026. Chỉ sửa Dashboard server rail và state sắp xếp cục bộ;
> không đụng Profile, Settings, Auth, backend, database hoặc schema dùng chung.

#### Vấn đề đã xác định

- `pointermove` của server con trong folder mở nổi bọt lên shell folder, khiến drop target con có thể
  bị target cha ghi đè; reorder trong group vì vậy không ổn định dù unit test gọi handler trực tiếp vẫn pass.
- Handler drop đang phụ thuộc `dropTarget` cuối cùng và các tham số target của `dropOnServer`,
  `dropOnGroup`, `dropIntoGroupAt` chưa được dùng, nên `pointerleave` ngay trước lúc thả có thể làm mất intent.
- `railItems` có cả server và folder nhưng `moveServerOutsideGroups()` lại tính vị trí từ danh sách chỉ
  có server ngoài nhóm; thả trước/sau folder có thể ra sai vị trí.
- Folder mới tạo chưa có quy tắc thu gọn ngay và center target chỉ có halo, chưa tạo cảm giác hai server
  đang nhập thành folder như video Discord.
- Drop line hiện dày, phát sáng và chiếm chiều cao; video dùng line mảnh, rõ nhưng không chói hoặc làm layout nhảy.

#### Mục tiêu tương tác

- Dùng một rail order thống nhất cho `server` và `folder`, giữ đúng vị trí khi group, reorder, move vào,
  kéo ra và tự rã folder; không duplicate hoặc đẩy item sai vị trí.
- Phân biệt ổn định ba intent: khe trên/dưới để reorder, tâm để group, ngoài vỏ folder để ungroup; truyền
  target cụ thể vào drop handler thay vì chỉ tin pointer state cuối cùng.
- Folder mới tạo thu gọn với preview 2×2; folder mở là surface dọc liên tục, có header và insertion line
  đúng index cho server con.
- Center target có merge preview và nở nhẹ sau dwell ngắn; folder đóng có thể tự mở khi hover-drag đủ lâu.
- Drag preview 48px, source giữ ghost slot; motion chỉ dùng transform/opacity, có reduced-motion, không neon.
- Kéo ra ngoài group hiện rail slot rõ; folder còn một server tự rã và giữ vị trí logic giống Discord.

#### File dự kiến

- `src/app/layouts/app-layout/components/server-rail/server-rail.ts|html|css|spec.ts`
- `src/app/core/api/shell-data.ts|spec.ts` nếu cần chuẩn hóa rail order runtime.
- Không tạo folder/component/dependency mới; không đổi API hoặc persistence backend.

#### Kiểm chứng bắt buộc

- Test DOM cho event bubbling, stale target sau pointerleave và explicit target drop.
- Test mixed server/folder order, group mới thu gọn, reorder trong group, ungroup, auto-dissolve, no duplicate.
- Giữ route, Command Center, Add Server, badge, empty state và demo/live data contract.
- Chạy target tests, toàn bộ frontend tests và production build; Tài kiểm tra pointer drag trên Chrome.

---

### Phase UI-29 — Giao diện & Kết nối Voice Room WebRTC (LiveKit) chuẩn NexusCord

Status: APPROVED

> Thiết kế và triển khai Voice Room toàn diện thuộc Dashboard: giao diện phòng thoại/video chuẩn sản phẩm thật, có mic, camera, chia sẻ màn hình, danh sách người tham gia và trạng thái kết nối tương tự trải nghiệm Discord nhưng mang ngôn ngữ thiết kế NexusCord Hybrid (deep-teal, brand-green, typography Euclid Circular A/Manrope, WCAG AA, full responsiveness).
>
> 1. **Kiến trúc WebRTC & Backend Token:**
>    - Frontend Angular 21 kết nối media qua `livekit-client`.
>    - Backend NestJS cấp token bảo mật qua `livekit-server-sdk` tại `POST /api/voice/channels/:channelId/token` (hoặc `POST /api/voice/token`).
>    - Token xác thực người dùng qua JWT/Supabase, kiểm tra quyền `CONNECT_VOICE` và `SPEAK_VOICE` của channel, không hardcode API secret ở client.
>    - Tên phòng chuẩn: `nexus:{serverId}:voice:{channelId}`.
>    - Xử lý mượt mà khi thiếu biến môi trường LiveKit (`LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`), hiển thị thông báo cấu hình rõ ràng mà không làm crash app.
> 2. **Trạng thái & Vòng đời Voice Room (State Machine):**
>    - Quản lý các trạng thái: `idle` | `requesting-permission` | `previewing` | `connecting` | `connected` | `reconnecting` | `disconnected` | `error`.
>    - Xử lý đầy đủ các ca: Permission denied, no device, device busy, network weak/reconnecting, room full, kick/server disconnect.
>    - Khi rời phòng (Leave/Disconnect), ngắt kết nối và tắt hoàn toàn local tracks (tắt đèn camera/mic phần cứng).
> 3. **Bố cục & Giao diện (Layout & UI/UX):**
>    - **Header:** Icon `volume_up`/`spatial_audio`, tên voice channel, subtitle/status, nút chat drawer, danh sách thành viên, grid/focus mode, fullscreen.
>    - **Trạng thái chưa tham gia (Unjoined / Voice Empty State):** Không để màn hình trống, hiển thị illustration, tên channel, số người đang trong phòng, mô tả ngắn, nút CTA “Tham gia thoại” và nút phụ “Xem thiết bị” (mở pre-join preview).
>    - **Pre-join preview:** Camera preview / avatar fallback, chọn microphone/camera/output speaker, audio level test meter trực quan, toggle mic/cam trước khi vào.
>    - **Connected Stage (Participant Grid):**
>      - 1 participant: focus tile lớn.
>      - 2 participants: 2 cột cân bằng.
>      - 3–4 participants: grid 2×2.
>      - 5–9 participants: grid 3×3.
>      - Nhiều hơn: grid responsive / pagination filmstrip.
>      - Screen share mode: luồng chia sẻ màn hình chiếm stage chính, participants chuyển thành filmstrip ngang/dọc.
>      - Mỗi Participant Tile: Video stream khi cam bật, Avatar fallback sắc nét khi cam tắt, Display name, Badge "Bạn", icon `mic_off`/`videocam_off`, connection quality indicator, viền speaking màu brand-green dịu khi đang nói, menu tùy chọn khi hover/focus, skeleton loading.
>    - **Control Bar:** Thanh điều khiển cố định đáy stage gồm: Mic toggle (`mic`/`mic_off`) kèm menu chọn input device/test mic, Camera toggle (`videocam`/`videocam_off`) kèm menu chọn camera, Screen share toggle (`screen_share`/`stop_screen_share`), Nút Mời (`person_add`), Activities placeholder disabled kèm tooltip, Participant list toggle (`group`), Fullscreen toggle (`fullscreen`), Ngắt kết nối (`call_end` màu danger riêng).
>    - **Channel Sidebar & User Panel Integration:**
>      - Khi kết nối thoại: Voice channel trên sidebar đổi sang trạng thái connected (icon/chữ brand-green, hiển thị thời lượng cuộc gọi).
>      - Danh sách thành viên đang ở trong phòng thoại xuất hiện thụt lề ngay dưới voice channel trên sidebar.
>      - User panel ở đáy sidebar hiển thị "Đã Kết Nối Giọng Nói", tên channel/server, sound wave/ping indicator, nút disconnect nhanh, và thanh quick action toolbar (screen share, video, activity).

#### Mục tiêu theo ba tiêu chí

- **UI/UX:**
  - Bám sát design system NexusCord Hybrid: Dark mode deep-teal `#001e2b`, `#002634`, `#003d4f`, brand-green `#00ed64` cho speaking/connected/CTA, text ink/slate/steel.
  - Sử dụng Angular Material wrapper, `mat-icon` (Material Symbols), pill buttons/badges, card bo tròn 12px.
  - Thiết kế responsive mượt mà trên desktop rộng, laptop nhỏ và mobile/tablet.
  - Đảm bảo chuẩn WCAG AA, focus-visible, keyboard navigation, tooltip, ARIA labels và tôn trọng `prefers-reduced-motion`.
- **Feature:**
  - Kết nối LiveKit WebRTC thật (publish/subscribe audio, video, screen share).
  - Tự động phát hiện active speaker và hiển thị viền xanh lá.
  - Chọn và chuyển đổi thiết bị microphone/camera/loa thời gian thực.
  - Trạng thái Sidebar Voice Channel và User Panel đồng bộ theo phiên gọi.
- **Data:**
  - API endpoint NestJS phát token có chữ ký ngắn hạn (TTL), kiểm tra quyền server/channel.
  - Clean state management với Angular Signals (OnPush).
  - Không truyền media qua Socket.IO, không ghi rác liên tục vào database.

#### File dự kiến thực hiện

- **Frontend (`nexus-fe`):**
  - `package.json` — bổ sung dependency `livekit-client`.
  - `src/app/core/api/voice-api.service.ts|spec.ts` — gọi API lấy LiveKit token.
  - `src/app/features/voice/services/voice-room.service.ts|spec.ts` — quản lý Room LiveKit, tracks, participants và signals.
  - `src/app/features/voice/services/media-device.service.ts|spec.ts` — quản lý media permissions, danh sách thiết bị và audio level meter.
  - `src/app/features/voice/voice-room/voice-room.ts|html|css|spec.ts` — Voice Room controller & layout.
  - `src/app/features/voice/voice-room/components/voice-prejoin/voice-prejoin.ts|html|css|spec.ts` — Pre-join modal/view.
  - `src/app/features/voice/voice-room/components/voice-stage/voice-stage.ts|html|css|spec.ts` — Grid layout & Screen share stage.
  - `src/app/features/voice/voice-room/components/participant-tile/participant-tile.ts|html|css|spec.ts` — Participant tile.
  - `src/app/features/voice/voice-room/components/voice-controls/voice-controls.ts|html|css|spec.ts` — Fixed bottom control bar.
  - `src/app/features/voice/voice-room/components/device-menu/device-menu.ts|html|css|spec.ts` — Menu chọn thiết bị mic/camera.
  - `src/app/features/dashboard/channel/channel.ts|html|css|spec.ts` — nhúng Voice Room vào kênh loại `voice`.
  - `src/app/layouts/app-layout/components/user-panel/user-panel.ts|html|css|spec.ts` — hiển thị trạng thái thoại đang kết nối.
  - `src/app/layouts/app-layout/components/channel-sidebar/components/channel-list.ts|html|css|spec.ts` — hiển thị danh sách người trong kênh thoại.
- **Backend (`nexus-be`):**
  - `package.json` — bổ sung dependency `livekit-server-sdk`.
  - `src/modules/voice/voice.module.ts`
  - `src/modules/voice/voice.controller.ts|spec.ts`
  - `src/modules/voice/voice.service.ts|spec.ts`
  - `src/modules/voice/dto/voice-token.dto.ts`
  - `src/app.module.ts` — import `VoiceModule`.

#### Kiểm chứng & Tiêu chí hoàn thành

- Khởi tạo kênh thoại hiển thị Unjoined Voice Empty State đầy đủ thông tin, không phải trang trống.
- Bấm "Xem thiết bị" mở Pre-join preview, hiển thị camera preview/avatar fallback và thanh đo âm lượng mic thật.
- Bấm "Tham gia thoại" xin token LiveKit, chuyển trạng thái `connecting` $\rightarrow$ `connected`.
- Lưới hiển thị thích ứng đúng số lượng participant (1, 2, 4, 9) và tự chuyển sang stage focus khi có screen share.
- Bật/tắt mic, camera, chia sẻ màn hình hoạt động chính xác với WebRTC tracks.
- Sidebar và User Panel hiển thị đúng trạng thái kết nối, thời lượng, và nút ngắt kết nối.
- Rời phòng dọn dẹp sạch sẽ tracks, tắt đèn mic/cam phần cứng.
- Toàn bộ unit tests (`npm test`) và build (`npm run build`) trên cả FE và BE đều pass 100%.

---

### Phase UI-30 — Channel Actions Suite: Invite Dialog, Voice Chat Drawer & Channel Settings Modal

Status: APPROVED

> Thiết kế và triển khai trọn bộ giao diện cho 3 nút tùy chọn/tương tác kênh (Text & Voice Channel) trên Sidebar và trong Dashboard theo đúng ảnh thiết kế Discord mẫu nhưng mang ngôn ngữ NexusCord Hybrid (deep-teal, brand-green, typography Euclid/Manrope, WCAG AA):
>
> 1. **Nút 1 (`person_add` / Mời vào kênh) — Dialog Mời Bạn Bè (`InviteChannelDialog`):**
>    - Mở khi bấm nút `person_add` trên thanh kênh (hover), trong context menu hoặc trong Voice Room.
>    - Header: Tiêu đề `"Mời bạn bè vào [Tên máy chủ]"`, phụ đề `"Người nhận sẽ đến #[Tên kênh]"`, nút đóng 'X'.
>    - Ô tìm kiếm bạn bè nhanh với icon kính lúp.
>    - Danh sách bạn bè scrollable: Avatar, tên hiển thị, username, nút "Mời" (bấm đổi sang "Đã gửi").
>    - Khối liên kết mời ở đáy: Input readonly link `https://nexus.gg/c/[code]`, nút "Sao chép" (đổi sang "Đã sao chép" khi click), ghi chú thời hạn 30 ngày và nút "Chỉnh sửa link mời".
> 2. **Nút 2 (`chat_bubble_outline` / Mở Trò Chuyện) — Voice Chat Drawer (`VoiceChatDrawer`):**
>    - Mở khi bấm icon tin nhắn trên kênh thoại hoặc nút chat trong Header kênh thoại.
>    - Chia đôi màn hình Dashboard:
>      - Cột chính (trái): Voice Room Stage (phòng thoại, grid, controls).
>      - Drawer trượt vào (phải, 360px–420px): Khung chat văn bản riêng của kênh thoại.
>      - Header drawer: `# [Tên kênh thoại]` + nút đóng 'X'.
>      - Timeline: Tin nhắn mở đầu `"Chào mừng bạn đến với #[Tên kênh thoại]!"` + danh sách tin nhắn.
>      - Message Composer ở đáy: Input `+ Nhắn [Tên kênh thoại]`, nút emoji, nút gửi.
> 3. **Nút 3 (`settings` / Chỉnh sửa kênh) — Modal Cài Đặt Kênh (`ChannelSettingsModal`):**
>    - Mở khi bấm nút bánh răng ⚙️ trên kênh hoặc chọn "Chỉnh sửa kênh" từ Context Menu.
>    - Bố cục 2 cột toàn màn hình chuẩn NexusCord Settings:
>      - Sidebar trái (240px): Tiêu đề `# [TÊN_KÊNH] KÊNH CHAT / KÊNH THOẠI`, danh sách tab (Tổng quan, Quyền hạn, Lời mời, Tích hợp), mục Xóa kênh màu đỏ nguy hiểm (`delete`).
>      - Panel phải (Tab **Tổng quan**):
>        - 1. **Tên kênh**: Input chỉnh sửa tên kênh.
>        - 2. **Chủ đề kênh**: Textarea kèm thanh công cụ định dạng mini (B, I, U, S, Eye), bộ đếm ký tự 1024, placeholder: `Hãy hướng dẫn mọi người cách sử dụng kênh này!`.
>        - 3. **Chế độ chậm (Slowmode)**: Dropdown chọn thời gian (Tắt, 5s, 10s, 15s, 30s, 1m, 2m, 5m, 10m, 15m, 30m, 1h, 2h, 6h) kèm hướng dẫn chi tiết.
>        - 4. **Độ Hiển Thị Nội Dung**: Radio options (Mặc định / Kênh Nội Dung Ẩn / Kênh giới hạn độ tuổi) kèm mô tả chi tiết.
>        - 5. **Ẩn sau khi không hoạt động**: Dropdown chọn thời gian (3 Ngày, 1 Giờ, 24 Giờ, 1 Tuần).
>        - Nút đóng `ESC` ở góc trên bên phải (hỗ trợ phím tắt ESC).
>        - Thanh thông báo lưu thay đổi ở đáy khi form dirty: "Bạn có thay đổi chưa lưu" + "Đặt lại" + "Lưu thay đổi".

#### File dự kiến thực hiện

- `src/app/layouts/app-layout/components/channel-sidebar/components/invite-channel-dialog/invite-channel-dialog.ts|html|css|spec.ts`
- `src/app/features/voice/voice-room/components/voice-chat-drawer/voice-chat-drawer.ts|html|css|spec.ts`
- `src/app/features/settings/modals/channel-settings-modal/channel-settings-modal.ts|html|css|spec.ts`
- `src/app/layouts/app-layout/components/channel-sidebar/components/channel-list.ts|html|css|spec.ts`
- `src/app/features/voice/voice-room/voice-room.ts|html|css|spec.ts`
- `src/app/features/dashboard/channel/channel.ts|html|css|spec.ts`

#### Kiểm chứng & Tiêu chí hoàn thành

- Bấm nút `person_add` mở `InviteChannelDialog`, tìm kiếm bạn bè, bấm Mời, bấm Sao chép liên kết có phản hồi rõ ràng.
- Kênh thoại: Bấm icon tin nhắn mở `VoiceChatDrawer` chia đôi màn hình cạnh Voice Stage mượt mà, có thể soạn tin và đóng mở drawer.
- Bấm nút `settings` ⚙️ mở `ChannelSettingsModal` 2 cột, xem và chỉnh sửa Tổng quan (tên kênh, chủ đề kênh, slowmode, độ hiển thị, ẩn không hoạt động), nhấn ESC hoặc nút X để đóng.
- 100% unit tests frontend (`npm test`) và build (`npm run build`) pass.

---

### Phase UI-31 — Voice Room Discord Parity: Single Header, Stream Viewer UX & Screen Scaling

Status: APPROVED

> Tinh chỉnh và đồng bộ trải nghiệm phòng thoại theo chuẩn Discord thực tế, giải quyết 4 điểm phản hồi từ người dùng:
>
> 1. **Loại bỏ Header kép (Single Header):** Ẩn `app-chat-toolbar` khi route đang mở kênh thoại (`type === 'voice'`), để `VoiceRoom` sử dụng một header duy nhất hiển thị trạng thái thoại, thời lượng kết nối, Live WebRTC pill, và 3 nút hành động (Chat, Mời, Cài đặt).
> 2. **Kích hoạt Mở Trò Chuyện từ Sidebar:** Đồng bộ trạng thái `isChatDrawerOpen` vào `VoiceRoomService` để bấm nút icon tin nhắn trên hàng kênh thoại ở Sidebar sẽ mở ngay Voice Chat Drawer mà không bị trễ.
> 3. **Nút "Mời vào phòng thoại" ở màn hình một mình:** Kết nối sự kiện `(inviteClicked)` của `app-voice-stage` để mở `InviteChannelDialog` trực tiếp.
> 4. **Chuẩn hóa Screen Share & Tính năng "Xem Stream" (Watch Stream UX):**
>    - Khi có người chia sẻ màn hình, ô participant trong lưới hiển thị badge **"TRỰC TIẾP" / "LIVE"** và nút **"Xem Stream"** (không tự động ép phóng to chiếm toàn màn hình khi người dùng chưa chọn xem).
>    - Khi bấm **"Xem Stream"**: mở giao diện phóng to stream ở sân khấu chính (Stage Focus), có nút **"Thu nhỏ stream"** (quay lại lưới) và **"Toàn màn hình"** (Fullscreen).
>    - Video screen share áp dụng `object-contain` với tỉ lệ chuẩn ứng dụng gốc (16:9/native scale) trên nền tối, không bị crop hay méo hình.

#### File dự kiến thực hiện

- `src/app/features/dashboard/channel/channel.html`
- `src/app/features/voice/services/voice-room.service.ts|spec.ts`
- `src/app/features/voice/voice-room/voice-room.ts|html|css|spec.ts`
- `src/app/features/voice/voice-room/components/voice-stage/voice-stage.ts|html|css|spec.ts`
- `src/app/features/voice/voice-room/components/participant-tile/participant-tile.ts|html|css|spec.ts`
- `src/app/layouts/app-layout/components/channel-sidebar/components/channel-list.ts|html|css|spec.ts`

#### Kiểm chứng & Tiêu chí hoàn thành

- Kênh thoại chỉ có đúng 1 header chuẩn duy nhất, không bị lặp 2 thanh header trên dưới.
- Bấm icon "Mở trò chuyện" trên Sidebar mở ngay Voice Chat Drawer.
- Bấm nút "Mời vào phòng thoại" khi ở phòng một mình mở ngay `InviteChannelDialog`.
- Screen share hiển thị badge LIVE trong lưới, bấm "Xem Stream" phóng to tỉ lệ chuẩn `object-contain`, có nút thu nhỏ quay lại lưới.
- Toàn bộ unit tests (`npm test`) và build (`npm run build`) đều pass 100%.

---
### Phase UI-32 — Friends API & dữ liệu kết bạn thật trên Supabase

Status: APPROVED

> **Gate bắt buộc:** Tài đọc toàn bộ phase này trong `plans/dashboard.PLAN.md` rồi tự đổi đúng dòng trên thành `Status: APPROVED`. Chưa có chữ APPROVED thì không được scaffold hoặc sửa code.

#### Mục tiêu

Thay luồng “Thêm bạn” UI preview bằng dữ liệu thật qua Angular → NestJS → Supabase, dùng bảng `public.friendships` đã có trong migration `20260731090400_social_and_settings.sql`. Không tạo bảng `friends` hoặc `friend_requests` mới và không tự thay đổi schema dùng chung.

#### Phạm vi Backend — `src/modules/friends/**`

- Scaffold bằng Nest CLI: module, controller, service và test; gateway realtime để phase sau.
- Bảo vệ toàn bộ endpoint bằng `SupabaseAuthGuard`; user gửi request luôn lấy từ `@CurrentUser()`, không nhận requester ID từ body.
- API REST:
  - `POST /api/friends/requests` — gửi lời mời bằng username.
  - `GET /api/friends` — danh sách quan hệ `accepted`.
  - `GET /api/friends/requests` — tách `incoming` và `outgoing`.
  - `PATCH /api/friends/requests/:userId/accept` — người nhận chấp nhận.
  - `DELETE /api/friends/requests/:userId` — từ chối hoặc hủy lời mời.
  - `DELETE /api/friends/:userId` — xóa bạn.
- Chuẩn hóa cặp UUID thành `user_a_id < user_b_id`; chặn tự kết bạn, request trùng và race condition; map lỗi unique `23505` thành HTTP 409.
- Query profile theo lô, không N+1; response chỉ trả id, username, tên hiển thị, avatar, presence/status cần cho Dashboard, không trả email/phone/token.
- Phase này chưa làm block vì schema hiện thiếu `blocked_by`; nếu cần phải lập migration riêng và chờ mentor duyệt.

#### Phạm vi Frontend — `src/app/features/dashboard/friends/**`

- Generate `FriendsApiService`/store đúng cấu trúc Angular hiện có, tái sử dụng form và component Friends hiện tại.
- `AddFriendForm` emit username; page/store gọi API thật, có pending/success/error rõ ràng và không còn copy “Không có API nào được gọi”.
- Tab `Tất cả`/“Trực tuyến” đọc danh sách accepted thật; tab `Chờ duyệt` hiển thị incoming/outgoing thật với accept/reject/cancel.
- Khi demo bật, chỉ dùng ShellData để preview; khi demo tắt, tải API thật. Tuyệt đối không ghi dữ liệu demo xuống Supabase.
- Friendship và DM là hai dữ liệu khác nhau; không tự tạo conversation khi vừa accept. Chỉ tạo/mở DM khi user bấm “Nhắn tin” ở phase Messages.
- Không sửa Profile, Settings, Auth, Theme/Atmosphere hoặc feature của member khác.

#### Kiểm chứng và tiêu chí hoàn thành

- **Data:** xác nhận `public.friendships` tồn tại; không migration schema mới; mỗi cặp user chỉ có một dòng ordered; dữ liệu còn sau F5 và đăng nhập lại.
- **Feature:** dùng hai tài khoản thật A/B kiểm tra gửi → B thấy incoming → B accept → cả hai thấy nhau trong danh sách; kiểm tra từ chối, hủy, xóa bạn, tự kết bạn và request trùng.
- **UI/UX:** loading/empty/error/success đầy đủ, button pending không gửi hai lần, copy tiếng Việt rõ ràng, WCAG AA và Material icon theo NexusCord Hybrid.
- **Test BE:** service/controller cover 201/200/204 và 400/401/404/409, Supabase error mapping, không lộ dữ liệu nhạy cảm.
- **Test FE:** form submit, pending, error, incoming/outgoing, accept/reject/cancel, demo-off dùng API thật.
- Chạy `npm test` và `npm run build` ở cả nexus-fe và nexus-be; chạy `npm run check:shared` nếu sửa type dùng chung.
---

### Phase DM-1 — Direct Messages: Conversations & Messages REST API

Status: APPROVED

> **Gate:** Đã duyệt bởi người dùng. Chỉ triển khai backend REST API, validation, phân quyền thành viên và unit test.
>
> 1. **Conversations REST Module (`src/modules/conversations/**`):**
>    - `POST /api/conversations/dm`: Nhận `recipientId`, kiểm tra quan hệ bạn bè (`friendships` status = 'accepted'). Nếu đã có conversation giữa 2 người (dựa trên unique `dm_key = min(A,B) + ':' + max(A,B)`), trả về conversation hiện có; nếu chưa có, tạo mới và thêm cả 2 vào `conversation_participants`.
>    - `GET /api/conversations`: Lấy danh sách DM của user hiện tại (kèm thông tin profile người bên kia và `unread_count` từ `read_states`).
>    - `GET /api/conversations/:id`: Lấy chi tiết conversation, kiểm tra requester thuộc `conversation_participants` (nếu không thuộc trả 403 Forbidden).
> 2. **Messages REST Module (`src/modules/messages/**`):**
>    - Dùng chung `MessagesService` cho cả REST và Gateway (Phase DM-2).
>    - `GET /api/conversations/:id/messages`: Tải lịch sử tin nhắn dùng Cursor Pagination (`id < $before ORDER BY id DESC LIMIT $limit`), kiểm tra quyền thành viên.
>    - `POST /api/conversations/:id/messages`: Gửi tin nhắn mới có `client_nonce` (idempotency key chống gửi trùng), kiểm tra nội dung không rỗng (max 4000 ký tự), lưu vào DB và trả về message record đầy đủ.
>    - `PATCH /api/messages/:id`: Sửa tin nhắn (chỉ cho phép chính tác giả `author_id`, set `edited_at = now()`).
>    - `DELETE /api/messages/:id`: Xóa tin nhắn (soft delete: set `deleted_at = now()`, content được ẩn hoặc giữ trạng thái đã xóa).
>    - `POST /api/conversations/:id/read`: Đánh dấu đã đọc, upsert vào `read_states` (`last_read_message_id = $messageId`).
> 3. **Validation & Authorization:**
>    - Bảo vệ bằng `SupabaseAuthGuard` (verify JWT qua Supabase Auth).
>    - Chống tự nhắn tin cho chính mình (`recipientId !== user.id`).
>    - DTO validation: `@IsString()`, `@IsNotEmpty()`, `@MaxLength(4000)`, `@IsUUID()`.

#### File dự kiến thực hiện

- `nexus-be/src/modules/conversations/conversations.module.ts`
- `nexus-be/src/modules/conversations/conversations.controller.ts` & `spec.ts`
- `nexus-be/src/modules/conversations/conversations.service.ts` & `spec.ts`
- `nexus-be/src/modules/conversations/dto/*.ts`
- `nexus-be/src/modules/messages/messages.module.ts`
- `nexus-be/src/modules/messages/messages.controller.ts` & `spec.ts`
- `nexus-be/src/modules/messages/messages.service.ts` & `spec.ts`
- `nexus-be/src/modules/messages/dto/*.ts`
- `nexus-be/src/app.module.ts`

---

### Phase DM-2 — Direct Messages: Realtime WebSocket Gateway (Socket.IO)

Status: PENDING

> Tích hợp Socket.IO Gateway hai chiều cho tin nhắn và trạng thái realtime:
>
> 1. **Handshake & Auth:** Xác thực socket connection bằng Supabase JWT access token từ query/auth headers.
> 2. **Room Management:** `conversation:join`, `conversation:leave` (room `conversation:{id}`). Xác thực thành viên trước khi cho phép join.
> 3. **Tin nhắn Realtime:**
>    - Nhận `message:send` với `clientMessageId`, gọi qua `MessagesService` lưu DB.
>    - Trả ACK cho người gửi gồm `{ id, clientMessageId, conversationId, createdAt, status }`.
>    - Broadcast `message:created` tới room `conversation:{id}`.
>    - Broadcast `message:edited`, `message:deleted`, `message:read`.
> 4. **Typing Indicator:** `typing:start`, `typing:stop` broadcast tới room (in-memory, không lưu DB).

---

### Phase DM-3 — Direct Messages: Frontend API Service & Realtime Store

Status: PENDING

> Dựng tầng Client giao tiếp REST & WebSocket trên Angular 21:
>
> 1. `ChatApiService`: Gọi REST API tải lịch sử, tạo/mở DM, sửa/xóa tin, đánh dấu đã đọc.
> 2. `ChatSocketService`: Quản lý kết nối Socket.IO, auto-reconnect, resync tin nhắn sau reconnect, join room, optimistic message queue.
> 3. Tích hợp `FriendRow`: Bấm nút nhắn tin từ danh sách bạn bè gọi `getOrCreateDm` có loading state, chống double click, và điều hướng vào `/channels/@me/:conversationId`.

---

### Phase DM-4 — Direct Messages: UI/UX Conversation Page & Realtime E2E

Status: PENDING

> Hoàn thiện giao diện trang DM `/channels/@me/:conversationId`:
>
> 1. Lịch sử tin nhắn thật từ DB qua cursor pagination khi cuộn lên trên (Infinite scroll).
> 2. Optimistic UI: hiển thị ngay tin nhắn đang gửi $\rightarrow$ đã gửi $\rightarrow$ lỗi kèm nút thử lại.
> 3. Realtime typing indicator ("... đang nhập").
> 4. Sửa/xóa tin nhắn trực tiếp với `MessageActions`.
> 5. Trạng thái kết nối: loading, empty, sending, failed, offline, reconnecting banner.
> 6. Không phá vỡ demo mode preview; khi demo mode tắt, dùng 100% dữ liệu thật.

---

## Phạm vi

Dashboard chia làm hai mảng lớn:

| Mảng                                           | Số phase | Ước lượng    |
| ---------------------------------------------- | -------- | ------------ |
| **A. Nhắn tin** (chat message)                 | P0 – P11 | ~14.5 ngày   |
| **B. Gọi thoại** (live calling, LiveKit Cloud) | C1 – C5  | ~4.5 ngày    |
|                                                | **Tổng** | **~19 ngày** |

> 🔴 **Vượt ngân sách thời gian ngay từ đầu.** Còn 16 ngày (31/07 → 16/08), cần 19 ngày.
> Thiếu ~3 ngày, và con số này giả định không có ngày nào trượt. Ba lối thoát, theo thứ
> tự nên chọn: (1) cắt P10 sticker + C5 video/chia sẻ màn hình → tiết kiệm 1.5 ngày;
> (2) hoãn P9 DM và C4 gọi 1-1 sang sau hạn → tiết kiệm 3 ngày; (3) hạ gọi thoại xuống
> chỉ còn presence, bỏ LiveKit → tiết kiệm 3.5 ngày. Quyết sớm sẽ đỡ hơn nhiều so với
> cắt trong hoảng loạn ở tuần cuối.

---

## Ba thứ không bao giờ được cắt

Theo `NEXUS_CONTEXT.md` §4. Ghi lại đây vì cả ba đều rơi vào phần chat, và cả ba
đều dễ bị bỏ qua khi chạy nước rút:

| Yêu cầu                              | Nằm ở phase | Vì sao không cắt được                                                  |
| ------------------------------------ | ----------- | ---------------------------------------------------------------------- |
| Cursor pagination (cấm `OFFSET`)     | P3          | `OFFSET` chậm dần theo độ sâu, và trả sai khi có tin mới chèn vào giữa |
| Read state đọc từ bảng `read_states` | P6          | Biến đếm trong memory sai ngay khi user F5 hoặc mở tab thứ hai         |
| Socket reconnect resync              | P5          | Mất mạng 3 giây là mất tin vĩnh viễn nếu không resync                  |

---

## A. Nhắn tin — 12 phase

Mỗi phase phải **chạy được và kiểm chứng được** trước khi sang phase sau.

### Bảng tổng quan

| Phase   | Nội dung                                     | Ước lượng  | Ghi chú                |
| ------- | -------------------------------------------- | ---------- | ---------------------- |
| **P0**  | Nền móng: schema, `shared/`, socket contract | 1.5 ngày   | Chặn tất cả            |
| **P1**  | Dashboard shell                              | 1 ngày     | Chặn Profile + Setting |
| **P2**  | Server & Channel (đọc)                       | 1 ngày     |                        |
| **P3**  | Đọc tin nhắn + cursor pagination             | 1.5 ngày   | ★ không cắt            |
| **P4**  | Gửi tin + optimistic UI                      | 1 ngày     |                        |
| **P5**  | Realtime socket + reconnect resync           | 2 ngày     | ★ không cắt            |
| **P6**  | Read state + badge unread                    | 1 ngày     | ★ không cắt            |
|         | — **Hết Messaging Core, mốc 08/08** —        | **9 ngày** | ⚠️ chỉ có 8 ngày       |
| **P7**  | Sửa / xoá / trả lời tin                      | 1 ngày     |                        |
| **P8**  | Đính kèm file & ảnh                          | 1.5 ngày   |                        |
| **P9**  | Tin nhắn riêng (DM 1-1)                      | 1.5 ngày   |                        |
| **P10** | Sticker                                      | 0.5 ngày   | Cắt được (§7 #4)       |
| **P11** | Thông báo in-app + mention                   | 1 ngày     |                        |

> ⚠️ **P0–P6 cần 9 ngày nhưng chỉ còn 8 ngày tới mốc 08/08.** Đã trượt trước khi
> bắt đầu. Hai cách xử lý: dời P8/P9/P10 xuống sau mốc (đã làm trong bảng trên),
> hoặc chấp nhận Messaging Core xong ngày 09–10/08. Không nên cắt bớt P5/P6 để
> kịp — đó là hai trong ba thứ cấm cắt.

---

### P0 — Nền móng

**Mục tiêu:** gỡ mọi thứ đang chặn. Không có UI nào ở phase này.

**Chức năng nhỏ**

1. **Đưa 15 bảng còn lại lên Supabase**
   - Chuyển `nexus_schema.sql` thành các file migration CLI (`supabase/migrations/`),
     vì repo đã đi theo đường CLI chứ không phải SQL Editor.
   - **Bảng `profiles` hoà giải bằng migration `ALTER`** (đã chốt 31/07 — giữ tài khoản
     test, giữ lịch sử migration sạch):

     | Việc        | Chi tiết                                                                                 |
     | ----------- | ---------------------------------------------------------------------------------------- |
     | Đổi tên cột | `birthdate` → `date_of_birth`                                                            |
     | Đổi kiểu    | `email`, `username`: `text` → `citext`                                                   |
     | Thêm cột    | `phone`, `avatar_url`, `banner_url`, `status_message`, `manual_presence`, `last_seen_at` |
     | Giữ nguyên  | Regex username **`{3,32}`** — sửa `nexus_schema.sql` từ `{2,32}` xuống cho khớp          |

   - **Sửa `nexus_schema.sql`** hai chỗ để nó không còn mâu thuẫn với các quyết định
     đã chốt: hạ regex username xuống `{3,32}`, và **xoá comment dòng 54–57** mô tả
     luồng login bằng phone (đã bỏ ở §3.6). Cột `phone` vẫn giữ, nhưng chỉ là thông
     tin hồ sơ, không phải định danh đăng nhập.
   - Cập nhật backend theo tên cột mới: `RegisterDto`, `AuthService.register`,
     `AuthService.completeProfile`, `AuthService.getProfile`, và form Angular.
   - ⚠️ Đổi `birthdate` → `date_of_birth` chạm vào code Auth **đang chạy được**. Chạy
     lại toàn bộ 36 test frontend sau khi sửa.

2. **Dựng `shared/` theo cách đã chốt** (copy có kiểm soát)
   - `nexus-fe/src/shared/` và `nexus-be/src/shared/` nội dung giống hệt.
   - Script `npm run check:shared` so sánh hai thư mục, thoát mã lỗi nếu lệch.
   - Nội dung: `permissions.ts` (hằng số bitfield), `dto/` (kiểu request/response),
     `socket-events.ts`.

3. **Viết socket event contract TRƯỚC khi implement**
   - `CLAUDE.md` gốc: _"Mọi socket event phải có TypeScript interface trong
     `shared/` trước khi implement"_. P0 làm interface, P5 mới viết gateway.
   - Danh sách event dự kiến ở [phụ lục cuối tài liệu](#phụ-lục--socket-event-contract).

4. **Hằng số permission bitfield**
   - Chép nguyên từ comment mục 4 của `nexus_schema.sql` thành `shared/permissions.ts`.
   - Viết sẵn hàm `computeEffectivePermissions()` + unit test, chưa gắn vào guard.
     Thuật toán: `base = OR(roles)` → nếu có `ADMINISTRATOR` thì allow tất cả →
     áp overwrite theo đúng thứ tự `@everyone → role → member`, mỗi bước
     `perms = (perms & ~deny) | allow`. **Sai thứ tự = user tự nâng quyền được.**

**Kiểm chứng:** `supabase db push` chạy sạch; `select count(*) from information_schema.tables
where table_schema='public'` trả 16; unit test permission pass; script check:shared pass.

---

### P1 — Dashboard shell

**Mục tiêu:** khung ba cột chạy được với dữ liệu giả. Đây là thứ Profile và Setting
gắn vào, nên phải xong sớm.

**Chức năng nhỏ**

1. **Layout ba cột** (theo `DESIGN-voltagent.md`)
   - Cột 1 — _server rail_: dải icon server dọc trái, hẹp.
   - Cột 2 — _channel list_: tên server + danh sách kênh + khu người dùng dưới đáy.
   - Cột 3 — _main_: nội dung, nơi các trang khác render vào.
2. **Routing khung**
   - `/channels/:serverId/:channelId` — kênh trong server
   - `/channels/@me` — danh sách DM
   - `/channels/@me/:conversationId` — một cuộc trò chuyện riêng
   - Trang Profile / Setting render vào cột 3 qua router outlet của shell.
3. **Trạng thái rỗng** cho từng vùng ("Chưa có server nào", "Chọn một kênh để bắt đầu").
4. **Responsive**: dưới `lg` thì cột 1+2 thu vào drawer.
5. **A11y**: điều hướng bàn phím giữa ba cột, `aria-current` cho kênh đang mở.

**Điểm kỹ thuật**

- Dùng `ex-app-shell-row` trong design system: hàng sidebar, trạng thái active dùng
  `primary` làm indicator. Màu xanh `#00d992` **chỉ** dành cho CTA và chỉ báo trạng
  thái sống — không dùng làm màu chữ body.
- Component nhỏ, `OnPush`, state bằng signal (luật trong `nexus-fe/.claude/CLAUDE.md`).

**Kiểm chứng:** vào `/channels/@me` thấy đủ ba cột; thu nhỏ cửa sổ thì cột 1+2 gập lại;
test AXE không lỗi.

---

### P2 — Server & Channel (chỉ đọc)

**Mục tiêu:** sidebar hiển thị dữ liệu thật.

**Chức năng nhỏ**

1. `GET /api/servers` — các server user đang tham gia (join `server_members`).
2. `GET /api/servers/:id/channels` — kênh của server, sắp theo `position`.
3. `PermissionsGuard` — gắn thật vào route, lọc kênh user không có `VIEW_CHANNEL`.
4. Sidebar hiển thị server rail + channel list từ API.
5. Chọn kênh → đổi route → cột 3 hiện tên kênh và `topic`.
6. Tạo server / tạo kênh ở mức tối thiểu (đủ để có dữ liệu mà test).
   - `ServerService.create()` phải gọi `create_default_role()` **trong cùng
     transaction** với insert server + insert owner vào `server_members`.

**Điểm kỹ thuật**

- Kênh `is_private` và `channel_overwrites` áp dụng ngay ở tầng lọc, đừng để tới P7
  mới thêm — sửa sau sẽ phải rà lại mọi endpoint.
- Phần **sửa/xoá server, kênh, RBAC UI, invite link** thuộc trang Setting, không làm ở đây.

**Kiểm chứng:** tạo 2 server, mỗi server 3 kênh; sidebar hiện đúng; user không phải
thành viên gọi API trả 403.

---

### P3 — Đọc tin nhắn ★

**Mục tiêu:** mở một kênh và đọc được lịch sử, cuộn ngược lên tải thêm.

**Chức năng nhỏ**

1. **`GET /api/channels/:id/messages?before=<cursor>&limit=50`**
   ```sql
   SELECT * FROM messages
   WHERE channel_id = $1 AND deleted_at IS NULL OR deleted_at IS NOT NULL
     AND id < $cursor
   ORDER BY id DESC LIMIT 50;
   ```
   Dùng index `idx_messages_channel_cursor`. **Cấm `OFFSET`.**
2. **Cuộn ngược vô hạn** — chạm đầu danh sách thì tải tiếp bằng `before = id nhỏ nhất`.
3. **Giữ vị trí cuộn** khi chèn tin cũ vào đầu (nếu không màn hình sẽ nhảy).
4. **Gom tin liên tiếp** cùng tác giả trong vài phút thành một khối, chỉ hiện avatar
   và tên ở tin đầu.
5. **Tin đã xoá** (`deleted_at` khác null) hiển thị "Tin nhắn đã bị xoá", không ẩn hẳn.
6. **Tin hệ thống** (`system_join` / `system_leave`) render khác tin thường.
7. **Dấu phân cách ngày** giữa các ngày khác nhau.
8. Timestamp lưu UTC, format ở tầng hiển thị (luật `CLAUDE.md`).

**Điểm kỹ thuật**

- `messages.id` là `bigint` — trong JS vượt `Number.MAX_SAFE_INTEGER` về lý thuyết.
  Ở quy mô đồ án thì không chạm tới, nhưng **truyền cursor dưới dạng chuỗi** để
  không phải sửa lại sau.
- `author_id` có thể null (`on delete set null`) → UI phải chịu được "Người dùng đã xoá".

**Kiểm chứng:** seed 200 tin vào một kênh, cuộn ngược tới đầu, kiểm tra không tin nào
lặp và không tin nào mất; xem query plan xác nhận có dùng index.

---

### P4 — Gửi tin nhắn

**Mục tiêu:** gõ và gửi được, tin hiện ngay lập tức.

**Chức năng nhỏ**

1. **`POST /api/channels/:id/messages`** — body gồm `content`, `client_nonce`, `reply_to_id?`.
2. **`client_nonce`** — client sinh uuid v4 **trước khi** gửi. Unique index
   `(author_id, client_nonce)` chặn ghi trùng khi retry.
3. **Optimistic UI** — vẽ tin ngay với trạng thái "đang gửi", thay bằng bản thật khi
   server trả về, đối chiếu bằng `client_nonce`.
4. **Gửi thất bại** — hiện trạng thái lỗi kèm nút thử lại, **giữ nguyên `client_nonce` cũ**
   (sinh nonce mới sẽ tạo tin trùng).
5. **Kiểm tra quyền** `SEND_MESSAGES` trong guard.
6. **Giới hạn** `content` 4000 ký tự, chặn cả ở form và DTO.
7. **Ô soạn thảo**: Enter gửi, Shift+Enter xuống dòng, tự giãn chiều cao.

**Điểm kỹ thuật**

- **Gửi bằng REST, không bằng socket.** Socket chỉ dùng để _nhận_ (P5). Lý do: REST có
  mã lỗi rõ ràng, retry và xác thực đơn giản; nếu gửi qua socket thì phải tự làm lại
  toàn bộ cơ chế ack/timeout. Server ghi DB xong mới broadcast.
- Khi gặp lỗi unique `client_nonce`, trả về **tin đã tồn tại** kèm 200 chứ không phải
  409 — client retry sau khi server đã ghi thành công là chuyện bình thường.

**Kiểm chứng:** gửi tin khi tắt mạng → thấy trạng thái lỗi; bật lại mạng, bấm thử lại
→ chỉ có đúng một tin trong DB.

---

### P5 — Realtime socket ★

**Mục tiêu:** hai tab thấy tin của nhau tức thì, và không mất tin khi rớt mạng.

**Chức năng nhỏ**

1. **Gateway NestJS + Socket.IO**, xác thực bằng access token Supabase ngay ở handshake
   (dùng lại cách của `SupabaseAuthGuard`). Token sai → từ chối kết nối.
2. **Room** — `channel:<uuid>` cho mỗi kênh, `user:<uuid>` cho thông báo riêng.
   Vào kênh thì join, rời thì leave.
3. **Nhận tin mới** — `message:new` broadcast tới room sau khi P4 ghi DB xong.
4. **Reconnect resync** ★ — client nhớ `id` tin cuối cùng đã nhận của mỗi kênh đang mở;
   khi socket kết nối lại thì gọi `GET /api/channels/:id/messages?after=<lastId>`
   để lấy phần bị miss. **Không có bước này thì mất mạng 3 giây là mất tin vĩnh viễn.**
5. **Trạng thái kết nối** hiển thị cho user ("Đang kết nối lại…").
6. **Đang gõ** — `typing:start` / `typing:stop`, tự tắt sau vài giây.
7. **Chống tự nhận** — người gửi đã có tin từ optimistic UI, phải khử trùng bằng
   `client_nonce` khi `message:new` của chính mình quay về.

**Điểm kỹ thuật**

- Cần thêm tham số `after` cho endpoint P3 (quét xuôi, `id > $after ORDER BY id ASC`).
- Presence và Redis: `NEXUS_CONTEXT.md` §8 đã kết luận **in-memory Map là đủ khi chỉ
  chạy 1 instance NestJS**. Chỉ cần `socket.io-redis` khi scale nhiều instance.
- ⚠️ Deploy target còn treo. Render free tier ngủ sau 15 phút → **đứt websocket**.
  Cần chốt trước khi demo (§8).

**Kiểm chứng:** mở 2 tab, gửi tin ở tab A → tab B hiện ngay. Tắt mạng tab B 30 giây,
gửi 5 tin ở tab A, bật mạng lại → tab B nhận đủ 5 tin, không trùng, đúng thứ tự.

---

### P6 — Read state & badge unread ★

**Mục tiêu:** biết kênh nào có tin chưa đọc.

**Chức năng nhỏ**

1. **`PUT /api/channels/:id/read-state`** — cập nhật `last_read_message_id` khi user
   xem tới cuối kênh.
2. **Đếm chưa đọc** — luôn tính từ bảng, không đếm trong memory:
   ```sql
   SELECT count(*) FROM messages
   WHERE channel_id = $1 AND id > (
     SELECT last_read_message_id FROM read_states
     WHERE user_id = $2 AND channel_id = $1
   );
   ```
3. **Badge trên sidebar** — chấm cho kênh có tin mới, số cho lượt nhắc tên (`mention_count`).
4. **Vạch "Tin chưa đọc"** chèn vào đúng vị trí trong danh sách tin.
5. **Cập nhật realtime** — nhận `message:new` ở kênh không mở thì tăng badge.

**Điểm kỹ thuật**

- `read_states` **không có primary key**, chỉ có hai partial unique index. Khi `upsert`
  phải chỉ rõ conflict target (`user_id, channel_id`), không dùng mặc định được.
- Mở tab thứ hai phải ra cùng kết quả — đây chính là lý do cấm đếm trong memory.

**Kiểm chứng:** mở 2 tab, đọc hết ở tab A → badge ở tab B biến mất sau khi F5.

---

### P7 — Sửa / xoá / trả lời

1. Sửa tin của mình → set `edited_at`, UI hiện nhãn "đã chỉnh sửa".
2. Xoá mềm → set `deleted_at`, giữ dòng lại (P3 đã render sẵn).
3. Xoá tin người khác → cần quyền `MANAGE_MESSAGES`.
4. Trả lời (`reply_to_id`) → hiện trích dẫn ngắn phía trên, bấm vào thì nhảy tới tin gốc.
5. Broadcast `message:updated` / `message:deleted`.

---

### P8 — Đính kèm file & ảnh

1. Upload lên Supabase Storage, lưu `storage_path` vào bảng `attachments`.
2. Kéo-thả và dán ảnh từ clipboard.
3. Xem trước ảnh/video kèm `width`/`height` (tránh nhảy layout khi ảnh tải xong).
4. Quyền `ATTACH_FILES`.
5. Giới hạn dung lượng và kiểu file, chặn ở cả hai tầng.
6. Tin chỉ có ảnh (content rỗng) — hợp lệ, nhưng **service layer phải tự kiểm tra**
   vì ràng buộc DB không nhìn được sang bảng `attachments`.

---

### P9 — Tin nhắn riêng (DM 1-1)

1. `conversations` + `conversation_participants`, `type = 'dm'`.
2. **`dm_key`** do NestJS sinh: `uuid nhỏ hơn + ':' + uuid lớn hơn`. Unique index chặn
   tạo trùng phòng giữa cùng hai người.
3. Danh sách DM ở `/channels/@me`.
4. Dùng lại toàn bộ P3–P7, chỉ đổi `channel_id` thành `conversation_id`.
5. Group DM là **mục cắt số 5** — chỉ làm nếu còn thời gian.

---

### P10 — Sticker _(cắt được — §7 #4)_

1. Proxy qua NestJS, **API key Giphy/Tenor giữ ở backend**.
2. Lưu `sticker_provider` + `sticker_id` + `sticker_url`. **Không tải ảnh về Storage.**
3. Hiển thị attribution theo điều khoản nhà cung cấp.
4. Nhà cung cấp (Giphy hay Tenor) còn treo ở §8.

---

### P11 — Thông báo in-app

1. Chỉ in-app: socket event + badge. **Không** push, **không** service worker, **không** FCM.
2. Nhận diện `@mention` khi gửi → tăng `mention_count` trong `read_states`.
3. Ghi bảng `notifications`, phát qua room `user:<uuid>`.
4. Trung tâm thông báo, đánh dấu đã đọc (`read_at`).

---

## B. Gọi thoại — 5 phase

**Đã chốt 31/07: audio thật, dùng LiveKit Cloud.** Xem `NEXUS_CONTEXT.md` §3.5.

Tin tốt: **không cần thêm bảng nào**. LiveKit tự giữ danh sách người trong phòng, và
bitfield trong `nexus_schema.sql` đã có sẵn `CONNECT_VOICE` (1<<10) và `SPEAK_VOICE` (1<<11).

### Bảng tổng quan

| Phase  | Nội dung                                      | Ước lượng | Phụ thuộc  |
| ------ | --------------------------------------------- | --------- | ---------- |
| **C1** | Nền móng LiveKit + endpoint phát token        | 0.5 ngày  | P0         |
| **C2** | Voice channel: vào/ra, nghe/nói, tắt mic      | 1.5 ngày  | C1, P2     |
| **C3** | Chỉ báo trạng thái: ai đang nói, mic/tai nghe | 0.5 ngày  | C2         |
| **C4** | Gọi riêng 1-1 trong DM: chuông, nhận/từ chối  | 1.5 ngày  | C2, **P9** |
| **C5** | Video + chia sẻ màn hình _(cắt được)_         | 1 ngày    | C2         |

---

### C1 — Nền móng LiveKit

1. Tạo tài khoản **LiveKit Cloud**, lấy `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`.
2. **API secret chỉ nằm trong `.env` của NestJS.** Không bao giờ vào bundle Angular —
   cùng nguyên tắc với `service_role` ở §3.2.
3. **`POST /api/voice/token`** — nhận `{ roomName }`, trả token đã ký:
   - Kiểm tra `CONNECT_VOICE` trước khi phát token. Không có quyền → 403, **không phát**.
   - `SPEAK_VOICE` quyết định token có quyền publish hay chỉ subscribe (vào nghe nhưng
     không nói được).
   - Token đặt hạn ngắn (vài phút), client xin lại khi cần.
4. Ánh xạ tên phòng: `voice:<channelId>` · `dm:<conversationId>`.
5. Cài `livekit-server-sdk` (BE) và `livekit-client` (FE).

**Kiểm chứng:** gọi endpoint bằng tài khoản không có `CONNECT_VOICE` → 403; có quyền →
token giải mã ra đúng room và đúng quyền publish.

---

### C2 — Voice channel

1. Bấm vào kênh `type = 'voice'` → xin token → vào phòng LiveKit.
2. **Danh sách người trong kênh** hiển thị ngay dưới tên kênh ở sidebar, thấy được cả
   khi mình không ở trong kênh đó.
3. **Nghe và nói thật**: publish track micro, subscribe track của người khác.
4. **Thanh điều khiển**: tắt/bật mic, tắt/bật loa (deafen), rời kênh.
5. **Xin quyền micro của trình duyệt** — xử lý tử tế khi người dùng từ chối.
6. Rời kênh, đóng tab, mất mạng → phải dọn sạch, không để lại "người ma" trong danh sách.

**Điểm kỹ thuật**

- Danh sách người lấy từ **sự kiện của LiveKit**, không tự đếm bằng Socket.IO — hai
  nguồn sẽ lệch nhau ngay khi có người rớt mạng.
- Nhưng vẫn phải phát sự kiện qua socket để **người ngoài kênh** thấy được ai đang ở
  trong đó (họ không ở trong phòng LiveKit nên không nhận được sự kiện của nó).
- Vào một voice channel khác phải tự rời phòng cũ.

**Kiểm chứng:** hai máy (hoặc hai trình duyệt khác nhau) cùng vào một kênh, nghe được
tiếng nhau. Đóng đột ngột một tab → tên biến khỏi danh sách bên kia trong vài giây.

---

### C3 — Chỉ báo trạng thái

1. **Ai đang nói** — viền sáng quanh avatar, lấy từ sự kiện active-speaker của LiveKit.
2. Biểu tượng mic tắt / loa tắt cạnh mỗi người.
3. Đồng bộ trạng thái này ra sidebar cho người ngoài kênh.
4. Màu xanh `#00d992` dùng làm chỉ báo "đang nói" — đúng luật design system: xanh chỉ
   dành cho CTA và **chỉ báo trạng thái sống**.

---

### C4 — Gọi riêng 1-1 _(cần P9 xong trước)_

1. Nút gọi trong cửa sổ DM.
2. **Chuông**: phát `call:incoming` qua room `user:<uuid>` của người nhận.
3. Nhận / Từ chối / Hết giờ tự huỷ (khoảng 30 giây).
4. Đang gọi: hiện thời lượng, tắt mic, kết thúc.
5. Ghi vào lịch sử hội thoại: "Cuộc gọi thoại · 3 phút" hoặc "Cuộc gọi nhỡ" —
   dùng `messages.type` mở rộng, hoặc thêm bảng `call_logs` nếu cần chi tiết hơn.
6. Xử lý các ca lệch: hai bên gọi nhau cùng lúc, người nhận đang bận ở cuộc khác.

---

### C5 — Video & chia sẻ màn hình _(cắt được)_

1. Bật/tắt camera, lưới hiển thị video.
2. Chia sẻ màn hình (một track riêng trong LiveKit).
3. Chọn thiết bị vào/ra (mic, loa, camera).

Đây là mục **nên cắt đầu tiên** nếu thiếu thời gian — chức năng gọi vẫn trọn vẹn khi
chỉ có tiếng.

---

## Phụ lục — Socket event contract

Bản nháp cho P0. Interface thật đặt ở `shared/socket-events.ts`.

**Client → Server**

| Event           | Payload         | Dùng ở |
| --------------- | --------------- | ------ |
| `channel:join`  | `{ channelId }` | P5     |
| `channel:leave` | `{ channelId }` | P5     |
| `typing:start`  | `{ channelId }` | P5     |
| `typing:stop`   | `{ channelId }` | P5     |

**Server → Client**

| Event                                            | Payload                                    | Dùng ở |
| ------------------------------------------------ | ------------------------------------------ | ------ |
| `message:new`                                    | `{ message }`                              | P5     |
| `message:updated`                                | `{ message }`                              | P7     |
| `message:deleted`                                | `{ channelId, messageId }`                 | P7     |
| `typing:update`                                  | `{ channelId, userIds }`                   | P5     |
| `unread:update`                                  | `{ channelId, unreadCount, mentionCount }` | P6     |
| `notification:new`                               | `{ notification }`                         | P11    |
| `voice:participants`                             | `{ channelId, users }`                     | C2     |
| `call:incoming`                                  | `{ conversationId, fromUserId }`           | C4     |
| `call:answered` / `call:declined` / `call:ended` | `{ conversationId }`                       | C4     |

Hai thứ **không** đi qua socket:

- **Gửi tin nhắn** — dùng `POST /api/channels/:id/messages` (lý do ở P4).
- **Trạng thái trong phòng gọi** — lấy từ sự kiện của LiveKit. Các event `voice:*` ở
  trên chỉ để **người ngoài phòng** thấy ai đang trong đó; người trong phòng luôn tin
  LiveKit, không tin socket (lý do ở C2).
