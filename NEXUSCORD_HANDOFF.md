# NexusCord — Context bàn giao cho Codex

> Cập nhật lần cuối: 09/08/2026, múi giờ Asia/Saigon.
>
> Đây là “nguồn sự thật” để một tài khoản Codex khác tiếp tục công việc với Minh Tài mà không phải hỏi lại toàn bộ lịch sử. Hãy đọc hết file này trước khi phân tích hoặc sửa code.
>
> Trước mọi thao tác pull/rebase/merge, đọc thêm `NEXUSCORD_MERGE_AUDIT.md` ở cùng thư mục.

## 1. Cách bắt đầu ở tài khoản Codex mới

1. Mở đúng workspace:
   D:\minhtai_22401270\y2\TTNN\nexuscord
2. Đọc toàn bộ file này.
3. Trước khi làm việc, đọc tiếp theo thứ tự:
   - nexus-fe/.claude/CLAUDE.md
   - nexus-fe/.claude/skills/implement-skill/SKILL.md
   - nexus-fe/.claude/skills/implement-skill/reference/plan-nexus.md
   - nexus-fe/.claude/skills/implement-skill/reference/folder-structure-nexus-client.md
   - nexus-fe/DESIGN-nexuscord-hybrid.md
   - nexus-fe/plans/dashboard.PLAN.md
4. Bỏ qua toàn bộ tài liệu Fizzle. Dự án đang làm là Nexus/NexusCord.
5. Chạy kiểm tra chỉ đọc trước khi sửa:
   - Git branch và git status trong nexus-fe.
   - Diff chưa commit.
   - Các file thuộc phạm vi Dashboard có liên quan trực tiếp đến yêu cầu mới.
6. Báo ngắn gọn cho Tài: đã hiểu phạm vi nào, dự định đụng file nào và có cần thêm/move folder hay không.
7. Chỉ bắt đầu code sau khi đã bám đúng gate/plan trong .claude và dashboard.PLAN.md.

Prompt có thể dán nguyên văn vào task mới:

```text
Đọc toàn bộ D:\minhtai_22401270\y2\TTNN\nexuscord\NEXUSCORD_HANDOFF.md trước.
Sau đó đọc .claude/CLAUDE.md, implement-skill/SKILL.md, các reference Nexus cần thiết,
DESIGN-nexuscord-hybrid.md và plans/dashboard.PLAN.md trong nexus-fe. Bỏ qua Fizzle.
Kiểm tra branch, git status và diff hiện tại trước khi đề xuất hoặc sửa code.
Không code ngay: trước tiên hãy tóm tắt ngắn những gì mày hiểu, phạm vi ownership của Tài,
các file đang chưa commit và kế hoạch thay đổi. Không thêm/move folder, dependency hoặc đụng
Profile/Settings/Auth/Backend nếu chưa được Tài duyệt.
```

## 2. Danh tính dự án và phạm vi của Tài

- Tên sản phẩm: NexusCord.
- Ý tưởng: web app clone Discord, sau này sẽ kết nối backend để người dùng thật giao tiếp với nhau.
- Frontend chính: nexus-fe.
- Backend: nexus-be, không nằm trong phạm vi UI Dashboard hiện tại.
- Framework hiện tại: Angular 21, Angular Material/CDK 21, Tailwind CSS 4, Signals, SSR.
- Package manager: npm 11.5.1.
- Nhánh frontend của Tài: page/tai.
- Tài chỉ chịu trách nhiệm phần Dashboard.
- Các route Dashboard chính:
  - /channels/@me
  - /channels/@me/:conversationId
  - /channels/:serverId/:channelId
- Khu vực Dashboard chủ yếu nằm trong:
  - nexus-fe/src/app/features/dashboard/**
- Một số thay đổi shell/layout/shared chỉ được làm khi thật sự cần cho Dashboard, đã khai báo rõ trong phase của dashboard.PLAN.md và phải báo Tài trước.

### Ownership phải tôn trọng

- Không đụng features/profile/**: phần của Triều Dược.
- Không đụng features/settings/**: phần của Trường Giang.
- Không đụng Auth hoặc phần của thành viên khác nếu yêu cầu không nói rõ.
- Không dựng placeholder Profile/Settings, không tạo route giả và không mở popup giả cho các phần này.
- Nếu một nút Dashboard trỏ tới tính năng của người khác chưa làm, giữ interaction trung tính hoặc báo rõ, không tự triển khai thay.

## 3. Luật làm việc đã thống nhất với Tài

Đây là các luật không được tự ý nới:

- Giai đoạn hiện tại chỉ làm UI/UX frontend cho Dashboard.
- Không sửa backend, database, auth, realtime, API thật hoặc business logic ngoài phạm vi UI.
- Không đổi cấu trúc thư mục.
- Không thêm hoặc move folder nếu chưa nói trước và được Tài đồng ý.
- Không thêm dependency nếu chưa báo và được duyệt.
- Chỉ sửa file có liên quan trực tiếp đến yêu cầu.
- Trước một thay đổi material, báo Tài ngắn gọn sẽ làm gì.
- Không tự commit hoặc push. Chỉ làm khi Tài yêu cầu rõ.
- Không thêm Playwright, file kiểm kê hình ảnh, file audit Codex, screenshot test hoặc artifact Codex vào frontend. Tài tự kiểm tra giao diện trực tiếp.
- Luôn bảo toàn thay đổi chưa commit của Tài và của các thành viên khác.
- Khi gặp dirty worktree, không reset, checkout hoặc xóa thay đổi không thuộc phạm vi.
- Sau khi sửa UI phải chạy kiểm chứng tương xứng: build, unit/component test liên quan và tốt nhất là toàn bộ test frontend khi có thể.
- Dùng apply_patch cho chỉnh sửa file thủ công; không dùng thao tác phá hủy.
- Giọng trao đổi hiện tại là tiếng Việt thân mật “tao–mày”. Cần thẳng, cụ thể, không nói vòng.

## 4. Logic sản phẩm đã chốt

### Người dùng mới

Tài khoản mới tạo lần đầu phải có trạng thái thật:

- 0 máy chủ.
- 0 bạn bè.
- 0 cuộc trò chuyện trực tiếp.
- 0 lời mời kết bạn.
- Không có bot, badge, server, group hoặc hoạt động giả tự xuất hiện.
- Các vùng tương ứng phải hiện empty state/CTA hợp lý.

Không được đưa mock data vào trạng thái mặc định chỉ để giao diện “đẹp”.

### Chế độ demo

Để vừa giữ logic người dùng mới vừa review UI khi có dữ liệu:

- ShellData có runtime demo toggle.
- Demo mặc định OFF.
- OFF phải trả giao diện tài khoản mới rỗng và giữ unit test đúng.
- ON hiển thị server, group, conversations, friends và timeline mẫu để review.
- Nút demo nằm bên trái nút đổi dark/light theme trên Friends toolbar.
- Tắt demo phải trở về empty state ngay trong runtime.
- Không biến dữ liệu demo thành API hoặc state nghiệp vụ thật.

File chính:

- nexus-fe/src/app/core/api/shell-data.ts

### Theme

- Có dark mode và light mode.
- Theme phải persist qua điều hướng và reload; không được quay về dark khi bấm server/kênh/DM.
- Theme hiện dùng ThemeService và localStorage key nexuscord-theme.
- Đổi theme chỉ đổi token màu, không đổi layout.

### Server rail

- Luôn có lối vào DM/Friends.
- Có nút tìm kiếm phía trên nút thêm server.
- Nút tìm kiếm mở Command Center; Ctrl/Cmd + K mở cùng dialog.
- Command Center tìm trong dữ liệu ShellData hiện có:
  - server;
  - text channel;
  - voice channel;
  - DM/conversation.
- Tìm nội dung message thật đang chờ backend; không giả vờ đã có.
- Server có thể kéo để đổi thứ tự.
- Server có thể kéo vào group.
- Server trong group phải hiện dạng miniature đủ để nhận ra group chứa gì.
- Có thể kéo server ra khỏi group.
- Khi kéo phải có drop-line/indicator cho vị trí sẽ thả.
- Không để xuất hiện thanh cuộn ngang ở đáy shell.

### Friends và conversation sidebar

- Spacing, avatar, status dot, tên và subtitle phải thẳng hàng, không bị che hoặc lệch.
- Chỉ xuất hiện scrollbar khi nội dung thật sự overflow.
- Scrollbar ở cả dark/light cần kín đáo khi nghỉ và sáng/rõ hơn khi hover.
- Trạng thái selected, hover, focus phải đủ tương phản; không dùng màu gần canvas khiến chữ/icon chìm.
- Activity panel/context rail bên phải có thể cố định theo màn Friends hoặc slide-in theo một số tương tác phù hợp.
- Context rail chỉ hiển thị nội dung thuộc Dashboard như activity, members, search, thread/pins; không biến thành Profile/Settings.

### Chat

- public/assets/doodle.svg là wallpaper line-art kiểu WhatsApp cho vùng lịch sử chat.
- Doodle chỉ nằm trong lịch sử DM/text channel, không phủ toolbar, composer, context panel hoặc voice state.
- Doodle đổi sắc theo dark/light và đủ nổi để thấy chi tiết nhưng không lấn message.
- Demo ON có timeline review:
  - grouped message;
  - compact message cùng tác giả;
  - reply connector;
  - unread divider;
  - reactions;
  - hover action toolbar.
- Demo OFF không render message mẫu.
- Channel context panel chỉ có demo members khi demo ON; OFF là empty state.
- DM không mở Profile panel vì Profile thuộc người khác.

## 5. Design system NexusCord Hybrid

Nguồn bắt buộc:

- nexus-fe/DESIGN-nexuscord-hybrid.md

Hướng thiết kế đã chốt:

- Dark mode: MongoDB deep teal, nền gần #001e2b.
- Light mode: Starbucks warm cream, nền gần #f2f0eb.
- Primary green là màu chủ đạo và chỉ nên dùng có ý nghĩa.
- Geometry thiên MongoDB: cấu trúc rõ, panel chắc, không rối.
- Button/badge có dạng pill khi phù hợp.
- Card thường dùng radius khoảng 12px.
- Font hiện dùng Manrope thay cho Euclid; Inter/Source Code Pro đã có trong dependencies khi cần đúng vai trò.
- Icon dùng Angular Material và Material Symbols từ package material-icons/Google Fonts đã có.
- Không thêm icon PNG/SVG rời nếu Material Symbols đã có biểu tượng phù hợp.
- Không gradient.
- Không glassmorphism, glow hoặc shadow nặng.
- Không dùng nhiều accent cạnh tranh.
- Không dùng trắng tinh/đen tinh làm canvas chính.
- Contrast, focus-visible, ARIA và touch target phải được giữ.

### Signature “Nexus Thread”

Tên NexusCord gợi “cord = kết nối”. Signature UI đã chọn là Nexus Thread:

- Một đường primary-green mảnh có nghĩa kết nối.
- Dùng có kiểm soát cho:
  - active server marker;
  - reply line;
  - unread divider;
  - toolbar/composer state;
  - trạng thái sống có ý nghĩa.
- Các vùng xung quanh phải yên, để Thread là một dấu hiệu nhận diện chứ không thành decoration.
- Không biến mọi component thành card và không tạo “component soup”.

Hướng thẩm mỹ tổng quát gọi là “Soft Structuralism”:

- Khung bố cục rõ nhưng mềm hơn Discord nguyên bản.
- Khoảng thở có chủ đích.
- Ít đường viền hơn nhưng hierarchy rõ hơn.
- Một signature nổi bật thay vì nhiều hiệu ứng.

## 6. Skill và nguồn thiết kế đã chọn

### Skill nội bộ bắt buộc

- nexus-fe/.claude/skills/implement-skill/SKILL.md
- Chỉ dùng reference Nexus; bỏ qua Fizzle.
- Mọi phase UI-1 đến UI-22 hiện đã APPROVED và đã có kết quả triển khai trong dashboard.PLAN.md.
- Nếu yêu cầu mới vượt phase hiện có, phải append phase rõ mục tiêu, file, acceptance criteria và verification theo skill; báo Tài trước khi triển khai nếu việc đó mở rộng scope.

### Skill thiết kế bổ trợ

Trên máy hiện tại đã từng dùng/đánh giá:

- frontend-design:
  C:\Users\nmt17\.codex\skills\frontend-design\SKILL.md
  Nguồn định hướng từ repo Anthropic skills.
- redesign-existing-projects:
  C:\Users\nmt17\.codex\skills\redesign-skill\SKILL.md
  Dùng để audit có chọn lọc dự án hiện hữu, nguồn Taste skill.
- high-end-visual-design:
  C:\Users\nmt17\.codex\skills\soft-skill\SKILL.md

Repo tham khảo:

- https://github.com/anthropics/skills.git
- https://github.com/Leonxlnx/taste-skill.git
- https://21st.dev chỉ dùng để tham khảo pattern, không copy mù component React vào Angular.

Quyết định sử dụng:

- frontend-design dẫn hướng concept, typography, hierarchy và signature Nexus Thread.
- redesign-existing-projects dùng để audit đúng chỗ, tránh redesign phá ownership/chức năng.
- high-end-visual-design chỉ bổ trợ spacing, density, motion và polish; không được ghi đè DESIGN hybrid.
- DESIGN-nexuscord-hybrid.md và luật ownership luôn thắng lời khuyên chung của skill.
- Không cài cả repo skill một cách mù quáng vào dự án.

Lưu ý chuyển tài khoản/máy:

- Nếu chỉ đổi tài khoản OpenAI trên cùng Windows user và cùng máy, các file skill local trong C:\Users\nmt17\.codex\skills có khả năng vẫn còn vì chúng nằm trên filesystem local; vẫn phải kiểm tra lại.
- Nếu đổi máy hoặc Windows user, phải cài/copy lại skill cần thiết.
- Skill không thay thế context dự án; rules bền phải nằm trong repo/handoff.

## 7. Các phase UI đã triển khai

### UI-1 — Friends Dashboard

- Dựng Friends content, toolbar, tabs Online/All/Pending/Add friend và activity panel.
- Dark/light theo Hybrid.
- Không gọi API thật.

### UI-2 — Doodle wallpaper

- Dùng public/assets/doodle.svg cho DM và text channel history.
- Không cản click, select hoặc scroll.

### UI-3 — New-user shell

- Dọn mock mặc định về mảng rỗng.
- Thêm server search control, group contract, user controls.
- New account không có server/friend/conversation giả.

### UI-4 — Scroll và contrast

- Chỉ scroll khi overflow.
- Custom scrollbar cho dark/light.
- Sửa contrast selected/hover/avatar/profile row.

### UI-5 — Context panel

- Logic panel phải cố định hoặc slide-in theo đúng context.
- Không tự mở cho mọi interaction.

### UI-6 — Color-state hierarchy

- Làm rõ selected, hover, focus, muted, disabled trên cả hai theme.
- Tránh text/icon chìm vào nền.

### UI-7 — Demo data toggle

- Runtime demo toggle trong ShellData.
- Default OFF, không phá unit tests.
- Nút demo bên trái nút theme.

### UI-8 — Doodle/server group/add-server/theme persistence

- Tăng độ rõ doodle.
- Cải thiện server group miniature.
- Có dialog UI thêm server.
- Sửa theme persistence.
- Popup Settings thử nghiệm đã được loại bỏ để tránh conflict ownership.

### UI-9 — Ownership cleanup và Soft Structuralism

- Loại bỏ phần Profile/Settings ngoài ownership.
- Định hình nền thẩm mỹ mềm, rõ cấu trúc.

### UI-10 — Shell/Friends/activity/chat polish

- Làm mềm panel, spacing, states và chat workspace.
- Giữ palette Hybrid và tránh hiệu ứng generic.

### UI-11 — Full-height layout và server drag-sort

- Sửa shell/content chiếm đúng chiều cao.
- Bỏ horizontal scrollbar.
- Cho kéo server ra khỏi group và reorder.
- Thêm drop-line indicator.

### UI-12 — Nexus Thread, chat preview và Command Center

- Thêm signature Nexus Thread.
- Demo timeline cho channel và DM.
- Command Center mở bằng nút search hoặc Ctrl/Cmd + K.
- Tìm server/channel/DM trong ShellData.
- Context members demo cho channel.
- Không thêm Profile/Settings.

### UI-13 — Server group container và drag intent

- Group mở có surface chung, caption folder, member count và connector Nexus Thread để nhận ra ngay phạm vi nhóm.
- Ba ý định kéo-thả được tách rõ: target phình nhẹ để gom nhóm, line ngang để reorder, drop zone “Ra ngoài” để ungroup.
- Có thể kéo server ra khỏi group; state drag được dọn sau drop/exit/end và không highlight chính server đang kéo.
- Không sửa ShellData vì logic group/ungroup hiện có đã đúng qua test.

### UI-14 — Product states có thể preview

- Có skeleton đúng hình dạng cho Friends/list và DM/Channel chat; không dùng spinner chung chung.
- Có UI riêng cho error, forbidden, missing; offline/reconnecting là banner không-blocking.
- Preview qua query `?ui-state=loading|error|offline|reconnecting|forbidden|missing` và xoá riêng query này khi retry/close.
- Không gọi API, không thêm mock mới và không thay demo toggle.

### UI-15 — Nexus Orbit Boot

- Loader thương hiệu cho F5, restore session và lần đi từ route ngoài vào Dashboard; đổi server/kênh/DM nội bộ không bật overlay.
- Monogram `N`, hai ellipse, bốn dot đồng bộ thành hai cặp đối xứng, vòng nền lớn căn đồng tâm và progress thread chuyển động.
- Reveal delay tránh flash, exit mềm, có reduced-motion; `?boot-preview=1` giữ loader đủ lâu để xem bằng DevTools.
- Callback đăng nhập Google dùng cùng ngôn ngữ loader thay vì chỉ hiện dòng “Đang hoàn tất đăng nhập...”; không sửa logic Auth/guard.

### UI-16 — Cân chỉnh user panel

- Profile row, avatar, tên/trạng thái và ba nút mic/deafen/settings được chia thành hai vùng có kích thước/gap đều.
- Icon mic và tai nghe được bù tâm thị giác; tooltip/ARIA/menu đăng xuất giữ nguyên.
- Settings vẫn là integration seam disabled, không dựng trang/popup Settings.

### UI-17 — Neo timeline chat lên đầu

- Channel và DM vẫn căn giữa ngang theo `max-w-4xl`, nhưng intro/timeline bắt đầu gần top thay vì nằm thấp theo chiều cao màn hình.
- Composer, vùng cuộn, doodle, demo toggle và context panel không đổi logic.

### UI-18 — Message actions và composer context

- Hover toolbar cho tin nhắn có reaction, reply, edit, forward và delete/retract ở mức UI contract.
- Reaction picker có năm emoji; reaction được chọn hiện chip và có thể toggle cục bộ.
- Reply/edit/forward/delete hiện context trong composer bằng Nexus Thread; edit tin người khác disabled.
- Không mở danh sách forward, không xoá mock, không báo gửi/xoá thành công giả và không persistence.

### UI-19 — Nexus Atmospheres

- Theme Studio nằm trong context panel bên phải, mở từ nút palette cạnh demo và light/dark.
- Có sáu palette: Hybrid, Sage café, Apricot dusk, Lilac circuit, Teal lagoon và Midnight ink.
- Mỗi palette có cặp light/dark và bốn lớp neutral cho rail/sidebar/workspace/context; xanh Nexus vẫn dành cho CTA/live state.
- Palette id được allow-list và persist qua localStorage; storage sai fallback Hybrid. Không sao chép Nitro/paywall của Discord.

### UI-20 — Menu ba chấm của bạn bè

- Material menu có header avatar/tên/trạng thái và nhãn “Bản xem trước · chờ kết nối”.
- Sáu lệnh: gọi thoại, gọi video, tắt thông báo, thêm biệt danh, xoá khỏi danh sách bạn và chặn.
- Tất cả sáu lệnh disabled thật; nút nhắn tin hiện có vẫn hoạt động.

### UI-21 — Hover/focus khối người dùng

- Identity block ở đáy sidebar có state rõ trong light/dark/Atmosphere: surface-feature pha primary, hairline xanh và shadow nhẹ.
- Tên, trạng thái và vòng avatar tăng tương phản; hover, keyboard focus và menu-open dùng cùng ngôn ngữ hình ảnh.
- Không đổi geometry, logic mic/deafen hoặc service Auth/Profile.

### UI-22 — Tách hai loại tìm kiếm

- Ô trên sidebar là “Tìm người hoặc cuộc trò chuyện”: chỉ lọc friend/DM hiện có theo tên hoặc status, không phân biệt hoa/thường và dấu tiếng Việt.
- Kết quả nằm ngay trong danh sách Tin nhắn trực tiếp dưới lối vào Bạn bè cố định; có count và empty state riêng.
- Kính lúp server rail là “Điều hướng toàn Nexus”, mở Command Center bằng click hoặc Ctrl/Cmd + K.
- Command Center tìm DM, server, text/voice channel; mặc định cân bằng tối đa 3 + 3 + 3 và rank exact → starts-with → contains → context → keyword.
- Không tìm người lạ hoặc nội dung message khi chưa có backend/API/permission/pagination. Content search sau này thuộc chat toolbar.

## 8. Trạng thái code tại thời điểm bàn giao

Nested frontend repo:

- Đường dẫn: D:\minhtai_22401270\y2\TTNN\nexuscord\nexus-fe
- Branch: page/tai
- Commit gần nhất: `ed0975f` — `commit ui19-22`.
- UI-19 đến UI-22, Theme Studio và Dashboard Appearance đã được Tài commit local ngày 09/08/2026.
- Working tree `nexus-fe` sạch tại lần kiểm tra cuối.
- Branch `page/tai` chưa tồn tại trên remote tại lần kiểm tra cuối; commit `ed0975f` hiện mới có trên máy local cho tới khi Tài chủ động push.
- Không reset, checkout, rebase hoặc làm mất snapshot này. Trước khi tích hợp code team, đọc `NEXUSCORD_MERGE_AUDIT.md` và dùng nhánh integration riêng.

Kết quả kiểm chứng gần nhất sau UI-22:

- Ba targeted spec cho hai search scope: `24/24` pass.
- Toàn bộ frontend: `40/40` test files, `203/203` unit/component tests pass.
- `npm run build`: pass browser/SSR/prerender; initial bundle `627.08 kB`, dưới warning budget `700 kB`; không có warning `anyComponentStyle`.
- Prettier và `git diff --check`: pass tại thời điểm hoàn thành UI-22.
- Dev app dùng `http://localhost:4200` hoặc `http://127.0.0.1:4200`; lần kiểm tra gần nhất trả HTTP 200.

Root workspace cũng là một Git repository chưa có commit riêng. Tại thời điểm bàn giao, `NEXUSCORD_HANDOFF.md` và `NEXUSCORD_MERGE_AUDIT.md` đang untracked ở root. Hai file vẫn còn khi đổi tài khoản trên cùng máy, nhưng sẽ không đi theo một lần clone/pull mới cho tới khi Tài chủ động lưu/commit/copy chúng. Không tự commit file hoặc frontend.

### Việc đang chờ tại đúng thời điểm chuyển tài khoản

- Không có yêu cầu code Dashboard nào đang dang dở trong chat. Yêu cầu gần nhất đã hoàn thành là UI-22 tách search sidebar và Command Center.
- Bước tiếp theo của Codex mới là chờ Tài đưa yêu cầu UI tiếp theo, hoặc chỉ review/diff khi Tài hỏi; không tự mở phase mới.
- Tài vẫn là người kiểm tra cảm giác giao diện, drag/drop và light/dark trực tiếp trên browser.
- Checklist chưa làm trong `plans/dashboard.PLAN.md` gồm accessibility/browser QA, keyboard server DnD, Add/Create/Join Server-Channel UI sau khi được duyệt folder, composer/attachment/optimistic states, notification/voice UI và cleanup kỹ thuật trước bàn giao.
- Các mục cần API, database, realtime, permission hoặc ownership của người khác phải chờ team/mentor chốt contract. Không cầm đèn chạy trước ô tô.

## 9. File/component quan trọng để định hướng

- Design:
  - nexus-fe/DESIGN-nexuscord-hybrid.md
- Plan:
  - nexus-fe/plans/dashboard.PLAN.md
- Dashboard routes:
  - nexus-fe/src/app/features/dashboard/dashboard.routes.ts
- Demo/shell data:
  - nexus-fe/src/app/core/api/shell-data.ts
- Theme:
  - nexus-fe/src/app/core/theme/theme.service.ts
  - nexus-fe/src/app/layouts/app-layout/app-layout.ts
- Nexus Atmospheres:
  - nexus-fe/src/app/features/dashboard/components/theme-studio/**
  - nexus-fe/src/app/features/dashboard/services/dashboard-appearance.ts
- Server rail và Command Center:
  - nexus-fe/src/app/layouts/app-layout/components/server-rail/**
- DM/Friends sidebar:
  - nexus-fe/src/app/layouts/app-layout/components/channel-sidebar/**
- User controls:
  - nexus-fe/src/app/layouts/app-layout/components/user-panel/**
- Friends:
  - nexus-fe/src/app/features/dashboard/friends/**
- Channel:
  - nexus-fe/src/app/features/dashboard/channel/**
- Conversation:
  - nexus-fe/src/app/features/dashboard/conversation/**
- Chat primitives:
  - nexus-fe/src/app/features/dashboard/components/chat-toolbar/**
  - nexus-fe/src/app/features/dashboard/components/message-composer/**
  - nexus-fe/src/app/features/dashboard/components/context-panel/**
  - nexus-fe/src/app/features/dashboard/components/message-actions/**
- Product state và boot:
  - nexus-fe/src/app/features/dashboard/components/dashboard-state/**
  - nexus-fe/src/app/features/dashboard/services/dashboard-ui-state.ts
  - nexus-fe/src/app/features/dashboard/components/nexus-boot/**
  - nexus-fe/src/app/features/dashboard/services/nexus-boot-state.ts
  - nexus-fe/src/app/app.ts
  - nexus-fe/src/index.html
- Global tokens/scoped shared timeline styles:
  - nexus-fe/src/styles.css
- Wallpaper:
  - nexus-fe/public/assets/doodle.svg

## 10. Những điều Codex mới không được hiểu sai

- “Discord clone” là tham chiếu workflow và information architecture, không phải yêu cầu sao chép pixel-perfect toàn bộ Discord.
- NexusCord phải có bản sắc riêng theo Hybrid và Nexus Thread.
- “Super Discord” về giao diện không có nghĩa nhồi thêm nhiều panel, card và animation.
- Chất lượng ưu tiên: hierarchy, spacing, contrast, states, scroll, density, chat readability và interaction feedback.
- Dữ liệu demo chỉ phục vụ review, không phải trạng thái người dùng thật.
- Empty state là logic sản phẩm bắt buộc, không phải thiếu dữ liệu cần “lấp đầy”.
- UI Dashboard có thể chuẩn bị contract/interaction cho backend tương lai, nhưng không tự triển khai backend.
- Settings/Profile từng được nhắc đến trong brainstorm nhưng đã quyết định bỏ qua/xóa UI placeholder vì người khác đang làm.
- Không đề xuất thêm folder chỉ vì “sạch hơn” rồi tự làm; phải nói Tài trước.
- Nếu có sáng kiến mới, trình bày impact, file dự kiến và rủi ro conflict trước.

## 11. Cách duy trì context từ bây giờ

Sau mỗi phase lớn, cập nhật file này với:

- quyết định mới;
- file đã sửa;
- trạng thái commit;
- test/build mới nhất;
- rule bị thay đổi hoặc được Tài duyệt;
- việc còn dang dở.

Không cần chép toàn bộ transcript. Chỉ giữ các quyết định có ảnh hưởng tới lần làm tiếp theo.

Khuyến nghị tốt nhất, nhưng chưa được tự ý thực hiện:

- Sau khi Tài duyệt, tạo một file nexus-fe/AGENTS.md ngắn chứa các luật bền:
  ownership, UI-only, đọc .claude/DESIGN/plan, không thêm folder/dependency và cách test.
- AGENTS.md giúp Codex tự đọc hướng dẫn trước mỗi task.
- File handoff này vẫn giữ lịch sử quyết định và trạng thái công việc biến động.
- Không nhét toàn bộ file handoff vào AGENTS.md vì instruction chain có giới hạn và sẽ làm context nặng.

## 12. Chuyển tài khoản Codex: điều gì thực tế xảy ra

Nguyên tắc an toàn tại thời điểm 09/08/2026:

- Không xem task/chat, memory, file upload hoặc setting của tài khoản cũ là dữ liệu chắc chắn được chuyển sang tài khoản mới. Hai tài khoản phải được coi là hai context độc lập.
- Codex mới vẫn đọc được code và Markdown local nếu đang dùng cùng Windows user, cùng máy và mở đúng workspace. Đây là lý do file handoff này nằm ngay ở root dự án.
- Các skill ở `C:\Users\nmt17\.codex\skills\...` là file local nên có khả năng vẫn còn trên cùng máy, nhưng Codex mới phải kiểm tra danh sách skill khả dụng; không được giả định mọi skill/plugin của phiên cũ tự kích hoạt.
- Nếu đổi máy hoặc Windows user, phải copy/clone repo, copy file handoff và cài/copy lại những skill thật sự cần.
- UI-19 đến UI-22 đã nằm trong commit local `ed0975f`, nhưng `page/tai` chưa được push tại lần kiểm tra cuối. Clone/pull từ remote đơn thuần vẫn chưa có commit này hoặc hai file Markdown root; muốn đổi máy phải push theo chủ ý của Tài hoặc copy chúng an toàn.
- Không có plugin bắt buộc cho Dashboard hiện tại. Đừng cài GitHub/Figma/Canva hay plugin khác chỉ vì thấy có trong catalog; chỉ đề xuất khi yêu cầu cụ thể thật sự cần và phải báo Tài trước.
- Cách ổn định nhất để tiếp tục trên tài khoản mới: mở đúng root, dán prompt ở mục 1, yêu cầu Codex đọc file này và kiểm tra `git status` trước mọi sửa đổi.

Nguồn chính thức đã dùng để kiểm chứng cách giữ hướng dẫn dự án bền trong workspace:

- https://learn.chatgpt.com/docs/projects
- https://learn.chatgpt.com/docs/agent-configuration/agents-md
- https://learn.chatgpt.com/docs/import
- https://learn.chatgpt.com/docs/build-skills

---

Kết luận cho Codex tiếp nhận: hãy tiếp tục như một cộng sự đã làm NexusCord từ đầu. Đừng thiết kế lại mù quáng, đừng lấp empty state bằng mock mặc định, đừng vượt ownership, và luôn kiểm tra diff hiện hữu trước khi chạm code.
