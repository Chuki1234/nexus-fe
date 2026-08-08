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
