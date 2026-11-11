/*
 * Lightweight runtime i18n for Marvell Pes Club (bidirectional).
 * The source app mixes Vietnamese and English literals. At runtime the DOM is
 * walked (plus a MutationObserver for dynamic content, and patched
 * alert/confirm/prompt) and translated into the selected language:
 *   - 'en': VI -> EN using EXACT / PHRASES_RAW / EN_PATTERNS
 *   - 'vi': EN -> VI using VI_EXACT / VI_PHRASES_RAW / VI_PATTERNS / VI_SHORT
 * Elements with class `no-i18n` or attribute `data-i18n-skip` are left as-is
 * (use for user-generated content such as chat messages).
 *
 * Language is stored in localStorage under 'pesLang' ('en' | 'vi').
 * Default: 'en'. Toggling reloads the page so the original Vietnamese markup
 * can be re-rendered cleanly when switching back.
 *
 * To add/adjust translations, edit EXACT (whole strings) or PHRASES (fragments
 * used inside dynamically-built strings such as "Vòng 1", "... (Thắng)", etc.).
 */
(function () {
  'use strict';

  var LANG_KEY = 'pesLang';
  var lang = localStorage.getItem(LANG_KEY) === 'vi' ? 'vi' : 'en';

  // ---- Whole-string translations (matched against trimmed text) -------------
  var EXACT = {
    // Header menus
    '🏆 Mùa giải': '🏆 Seasons',
    // Double-elimination tree view
    '🌳 Sơ đồ nhánh': '🌳 Bracket tree',
    '📋 Danh sách trận': '📋 Match list',
    'Bấm vào trận để nhập tỉ số': 'Click a match to enter the score',
    'Bấm vào trận để xem chi tiết': 'Click a match for details',
    '👥 Đội & Logo': '👥 Teams & Logos',
    '💾 Dữ liệu': '💾 Data',
    '☁️ Cloud & Trang': '☁️ Cloud & Page',
    'Mùa mới': 'New Season',
    '⇅ Sắp xếp': '⇅ Reorder',
    'Đổi tên': 'Rename',
    'Xoá mùa': 'Delete Season',
    'Reset mùa': 'Reset Season',
    'Cài đặt': 'Settings',
    'Logo giải': 'League Logo',
    'Số đội': 'Team Count',
    '+Link': '+Link',
    '+Note': '+Note',
    'Admin': 'Admin',

    // Header titles (attributes)
    'Tạo file HTML hoàn chỉnh với dữ liệu đã chọn': 'Create a complete HTML file with the selected data',
    'Nhập dữ liệu từ file HTML đã xuất': 'Import data from an exported HTML file',
    'Tạo/khôi phục snapshot toàn bộ dữ liệu (tối đa 3 bản)': 'Create/restore a full-data snapshot (max 3)',
    'Cấu hình GitHub Cloud Sync': 'Configure GitHub Cloud Sync',
    'Bật/tắt tự động đồng bộ dữ liệu lên server': 'Toggle automatic data sync to the server',
    'Trạng thái đồng bộ': 'Sync status',
    'Chọn mùa': 'Select season',
    'Xoá kết quả mùa hiện tại': 'Clear results of the current season',

    // Cloud config dialog
    'Personal Access Token (PAT)': 'Personal Access Token (PAT)',
    'Xóa PAT': 'Clear PAT',
    'Hủy': 'Cancel',
    'Push ngay': 'Push now',
    'Lưu': 'Save',
    'Token chỉ lưu trong trình duyệt của bạn.': 'The token is stored only in your browser.',

    // Home link dialog
    'Đặt liên kết & tên nút Home': 'Set the Home link & button label',
    'Tên nút (VD: Trang chủ)': 'Button label (e.g., Home)',
    'Nhập URL (https://...)': 'Enter URL (https://...)',

    // Main toolbar / standings
    'Xem:': 'View:',
    'Tổng': 'Overall',
    'Sân nhà': 'Home',
    'Sân khách': 'Away',
    'Tìm đội...': 'Search team...',
    'Đội': 'Team',
    'Lịch thi đấu': 'Fixtures',
    'Tổng quan': 'Overview',
    'Bảng xếp hạng': 'Standings',
    'Nhánh đấu': 'Bracket',
    'Thống kê': 'Stats',
    'Đã kết thúc': 'Finished',
    'Đang diễn ra': 'In progress',
    'Tiến độ': 'Progress',
    'Dẫn đầu': 'Leader',
    'Trận tiếp theo': 'Next match',
    'Vòng:': 'Round:',
    'Chọn vòng ▼': 'Select round ▼',
    'Chọn vòng ▲': 'Select round ▲',
    'Chọn tất cả': 'Select all',
    'Bỏ chọn': 'Deselect',
    'Ngẫu nhiên': 'Random',
    'Xoá vòng': 'Clear round',
    'Điền ngẫu nhiên cho các vòng đã chọn': 'Randomize the selected rounds',
    'Xoá tỉ số các vòng đã chọn': 'Clear scores of the selected rounds',
    'Đã thi đấu': 'Played',
    'Chưa thi đấu': 'Not played',
    'Lọc theo đội:': 'Filter by team:',
    'Không có trận nào khớp bộ lọc.': 'No matches for this filter.',

    // Predictions / stats
    'Xác suất (Vô địch / Top4 / Rớt hạng)': 'Probability (Champion / Top4 / Relegation)',
    'Xác suất (Vô địch / Top 3 / Nửa trên)': 'Probability (Champion / Top 3 / Upper half)',
    'Dự đoán đội vô địch': 'Predict champion',
    'Thống kê mùa': 'Season stats',
    'Chỉ số tổng hợp': 'Aggregate insights',
    'Chưa có dữ liệu': 'No data yet',
    'Chưa đủ dữ liệu': 'Not enough data',
    'Chọn đội để xem biểu đồ xếp hạng': 'Select teams to view the ranking chart',

    // Team dialog
    'Live form': 'Live form',
    '10 trận gần nhất': 'Last 10 matches',
    'Đối đầu': 'Head-to-head',
    'Chọn đối thủ:': 'Select opponent:',
    'Thống kê nâng cao': 'Advanced stats',
    'Chuỗi form đầy đủ:': 'Full form sequence:',
    'Đóng': 'Close',

    // Create season dialog
    'Tạo mùa mới': 'Create new season',
    'Tên mùa (VD: 2025/26)': 'Season name (e.g., 2025/26)',
    'Knock-out': 'Knock-out',
    'Số bảng:': 'Number of groups:',
    'Số đội vào vòng loại trực tiếp:': 'Teams advancing to the knockout:',
    'Đấu 1 lượt': 'Single round',
    'Đấu 2 lượt': 'Double round',
    'Số vòng đấu:': 'Number of rounds:',
    'Nếu số đội lẻ sẽ tự thêm kỳ thủ ảo “BYE”.': 'If the number of players is odd, a virtual “BYE” player is added.',
    'Thêm trận tranh hạng 3': 'Add a 3rd place match',
    'Knock-out kiểu Serie A/B': 'Serie A/B knock-out',
    'Số đội vào Serie A:': 'Teams in Serie A:',
    'Serie A đá knock-out; đội thua vòng 1 xuống Serie B gặp các đội chờ sẵn.': 'Serie A plays knock-out; round-1 losers drop to Serie B to face the waiting teams.',
    'Tạo': 'Create',

    // Team count dialog
    'Đặt số đội': 'Set team count',
    'Áp dụng': 'Apply',

    // Settings dialog
    'Cài đặt giải': 'League settings',
    'Ưu tiên H2H:': 'Prioritize H2H:',

    // Reorder seasons dialog
    'Sắp xếp thứ tự mùa giải': 'Reorder seasons',
    'Kéo thả để sắp xếp lại thứ tự hiển thị trong danh sách': 'Drag and drop to reorder how seasons appear in the list',
    'Lưu thứ tự': 'Save order',

    // Admin login dialog
    'Đăng nhập quản trị': 'Admin login',
    'Nhập password quản trị': 'Enter admin password',
    'Sai password': 'Wrong password',
    'Đăng nhập': 'Log in',
    'Tên đăng nhập': 'Username',
    'Mật khẩu': 'Password',
    'Sai tên đăng nhập hoặc mật khẩu': 'Wrong username or password',
    'Đăng xuất': 'Log out',
    'Đã đăng xuất': 'Logged out',
    'Tài khoản không có quyền chỉnh sửa hệ thống này': 'This account cannot edit this system',
    'Trình duyệt không hỗ trợ mã hóa (cần HTTPS)': 'Browser does not support encryption (HTTPS required)',

    // Systems & users dialog
    '🗂️ Hệ thống & User': '🗂️ Systems & Users',
    'Quản lý hệ thống và tài khoản mod': 'Manage systems and mod accounts',
    'Hệ thống': 'System',
    '🗂️ Hệ thống': '🗂️ Systems',
    '👤 Người dùng': '👤 Users',
    'Mod chỉ chỉnh sửa được hệ thống được gán. Thay đổi chỉ áp dụng sau khi bấm Lưu (cần PAT).': 'Mods can only edit their assigned systems. Changes apply only after Save (PAT required).',
    'Tên hệ thống': 'System name',
    'Mã (ID)': 'ID',
    'Ẩn': 'Hidden',
    'Ẩn khỏi danh sách chọn hệ thống': 'Hide from the system selector',
    'Mở ↗': 'Open ↗',
    '(mới)': '(new)',
    '➕ Tạo hệ thống': '➕ Create system',
    '➕ Thêm mod': '➕ Add mod',
    'Mật khẩu mới': 'New password',
    'Đặt mật khẩu mới': 'Set new password',
    'Ghi cloud': 'Cloud write',
    'Có quyền ghi cloud': 'Has cloud write access',
    'Mã hóa PAT hiện tại bằng mật khẩu của user': 'Encrypt the current PAT with the user\'s password',
    'Xoá user': 'Delete user',
    '💾 Lưu thay đổi': '💾 Save changes',
    'Đang lưu...': 'Saving...',
    '✅ Đã lưu': '✅ Saved',
    'Có thay đổi chưa lưu': 'Unsaved changes',
    'Có thay đổi chưa lưu. Vẫn đóng?': 'There are unsaved changes. Close anyway?',
    'Nhập tên hệ thống': 'Enter a system name',
    'Mã (ID) chỉ gồm a-z, 0-9, dấu gạch ngang (2-31 ký tự)': 'ID may only contain a-z, 0-9 and hyphens (2-31 chars)',
    'Mã (ID) đã tồn tại': 'ID already exists',
    'Tên đăng nhập 3-24 ký tự: a-z, 0-9, . _ -': 'Username 3-24 chars: a-z, 0-9, . _ -',
    'Tên đăng nhập đã tồn tại': 'Username already exists',
    'Mật khẩu tối thiểu 8 ký tự': 'Password must be at least 8 characters',
    'Trình duyệt này chưa có PAT để cấp': 'This browser has no PAT to grant',
    'Nhập mật khẩu mới rồi bấm 🔑 để cấp quyền ghi cloud': 'Enter a new password then click 🔑 to grant cloud write',
    'Cần GitHub PAT để lưu (☁️ Cloud)': 'GitHub PAT required to save (☁️ Cloud)',
    'Chỉ admin được phép quản lý hệ thống': 'Only admin can manage systems',
    'Chưa có PAT: có thể xem nhưng không lưu được': 'No PAT: you can view but not save',

    // Empty-state hints
    '📋 Chưa chọn vòng nào': '📋 No round selected',
    'Nhấn nút "Chọn vòng" ở trên để chọn vòng đấu cần xem': 'Click the "Select round" button above to choose rounds to view',
    'Chưa có season logo nào. Upload mới hoặc push file': 'No season logos yet. Upload a new one or push a file',
    'trên repo.': 'to the repo.',
    'Chưa có bản backup nào.': 'No backups yet.',

    // Sync status labels
    '☁️ Sẵn sàng': '☁️ Ready',
    '☁️ Chưa có PAT': '☁️ No PAT',
    '✅ Đã sync': '✅ Synced',
    '⚠️ Chỉ lưu trên máy': '⚠️ Local only',
    'Thiết bị này chưa có quyền ghi cloud: thay đổi chỉ lưu trên máy, không đồng bộ lên server': 'This device has no cloud write access: changes are saved locally only, not synced to the server',
    '❌ Đồng bộ lên server thất bại': '❌ Sync to server failed',
    // Round export (Slack)
    'Export vòng đang chọn (text + ảnh) để gửi Slack': 'Export the selected round (text + image) for Slack',
    '📤 Export vòng đấu': '📤 Export round',
    'Chưa có trận nào để export': 'No matches to export',
    'Đang tạo ảnh...': 'Creating image...',
    '🖼️ Copy ảnh': '🖼️ Copy image',
    '⬇️ Tải ảnh': '⬇️ Download image',
    'Slack: copy text rồi dán vào ô tin nhắn, sau đó copy ảnh và dán tiếp vào cùng tin nhắn.': 'Slack: copy the text and paste it into the message box, then copy the image and paste it into the same message.',
    '✅ Đã copy text': '✅ Text copied',
    '❌ Không copy được text': '❌ Could not copy text',
    '✅ Đã copy ảnh': '✅ Image copied',
    'Trình duyệt không cho copy ảnh, đã tải ảnh xuống': 'The browser does not allow copying images, the image was downloaded instead',
    'Thiết bị này chưa có quyền ghi cloud: tỉ số nhập ở đây chỉ lưu trên máy, KHÔNG đồng bộ lên server.\n\nCách bật: trên máy tính đã có PAT, mở Hệ thống → tài khoản này → tick "Ghi cloud", nhập mật khẩu → Lưu. Sau đó đăng nhập lại trên thiết bị này.': 'This device has no cloud write access: scores entered here are saved locally only and NOT synced to the server.\n\nTo enable: on a computer that has the PAT, open Systems → this account → tick "Cloud write", enter the password → Save. Then log in again on this device.',

    // Dynamic messages (whole-string)
    'Chỉ admin được phép sửa': 'Only admins can edit',
    'Chỉ admin được phép đổi trạng thái sync': 'Only admins can change the sync state',
    'Chỉ admin được phép cấu hình cloud': 'Only admins can configure the cloud',
    'Không thể chọn cùng một đội cho cả hai bên': 'Cannot select the same team for both sides',
    'Chưa đặt liên kết Home': 'Home link not set',
    'Chưa đặt liên kết': 'Link not set',
    'Xoá ghi chú này?': 'Delete this note?',
    'Xoá nút Home?': 'Delete the Home button?',
    'Xoá liên kết này?': 'Delete this link?',
    '⚠️ Chưa có GitHub PAT — ảnh chỉ lưu local. Cấu hình PAT để đẩy lên repo.': '⚠️ No GitHub PAT — images are stored locally only. Configure a PAT to push to the repo.',
    'Random lại cả vòng sẽ tạo lại lịch các vòng sau. Tiếp tục?': 'Re-randomizing the whole round will regenerate later rounds. Continue?',
    'Sửa kết quả này sẽ tạo lại lịch các vòng sau. Tiếp tục?': 'Editing this result will regenerate later rounds. Continue?',
    'Chess-Swiss yêu cầu tối thiểu 2 đội.': 'Chess-Swiss requires at least 2 teams.',
    'Không thể tạo bracket CUP.': 'Could not create the CUP bracket.',
    'Không thể tạo Double Elimination bracket.': 'Could not create the Double Elimination bracket.',
    'Không thể tạo Swiss bracket.': 'Could not create the Swiss bracket.',
    'Không thể tạo lịch Chess-Swiss.': 'Could not create the Chess-Swiss schedule.',
    'Phải còn ít nhất 1 mùa.': 'At least 1 season must remain.',
    '✅ Đã lưu thứ tự mùa giải': '✅ Season order saved',
    'Đổi số đội sẽ xoá mọi kết quả. Tiếp tục?': 'Changing the team count will delete all results. Continue?',
    'Đã xoá logo giải': 'League logo removed',
    'Vui lòng chọn ít nhất một vòng để điền ngẫu nhiên.': 'Please select at least one round to randomize.',
    'Vui lòng chọn ít nhất một vòng để xóa.': 'Please select at least one round to clear.',
    '✅ Import thành công!\n\nTất cả dữ liệu đã được import và lưu.': '✅ Import successful!\n\nAll data has been imported and saved.',
    'Đã tạo backup': 'Backup created',
    '❌ Không đủ dung lượng trình duyệt để lưu backup. Hãy xoá bớt backup cũ.': '❌ Not enough browser storage to save the backup. Please delete some old backups.',
    '❌ Tạo backup thất bại.': '❌ Backup creation failed.',
    'Khôi phục bản backup này?\n\n⚠️ Toàn bộ dữ liệu hiện tại sẽ bị thay thế bằng dữ liệu trong backup (và đồng bộ lên cloud nếu đang bật). Không thể hoàn tác.': 'Restore this backup?\n\n⚠️ All current data will be replaced with the backup data (and synced to the cloud if enabled). This cannot be undone.',
    '✅ Khôi phục thành công!': '✅ Restore successful!',
    '❌ Khôi phục thất bại: không đọc được dữ liệu backup.': '❌ Restore failed: could not read the backup data.',
    'Xoá bản backup này? Không thể hoàn tác.': 'Delete this backup? This cannot be undone.',
    'Đã xoá backup': 'Backup deleted',
    'Xoá toàn bộ kết quả của mùa hiện tại?': 'Delete all results of the current season?',
    'Đã lưu PAT. Đang đồng bộ...': 'PAT saved. Syncing...',
    'Đã tìm thấy data trên cloud. Thay thế dữ liệu local hiện tại bằng dữ liệu cloud?': 'Data found in the cloud. Replace the current local data with the cloud data?',
    'Đã xóa PAT (chế độ chỉ local)': 'PAT removed (local-only mode)',
    'Xóa PAT khỏi trình duyệt? Bạn sẽ không sync lên cloud được nữa cho tới khi nhập lại.': 'Remove the PAT from this browser? You will not be able to sync to the cloud until you re-enter it.',
    'Đã xóa PAT': 'PAT removed',
    'Cần nhập PAT trước': 'Enter a PAT first',
    'Đang tắt sync. Bật Sync: ON để push.': 'Sync is off. Turn Sync: ON to push.',
    'Đang push lên GitHub...': 'Pushing to GitHub...',
    '✅ Push thành công': '✅ Push successful',
    '❌ Push thất bại - xem console': '❌ Push failed - see console',
    'Đã bật tự động đồng bộ lên server': 'Automatic sync to the server enabled',
    'Đã tắt tự động đồng bộ lên server': 'Automatic sync to the server disabled',
    'data.json chưa tồn tại trên GitHub - sẽ tạo khi admin lưu lần đầu': 'data.json does not exist on GitHub yet - it will be created when an admin first saves',

    // App: statuses, selects & misc
    '-- Chọn đội --': '-- Select team --',
    '— Tất cả —': '— All —',
    '⏸️ Sync tắt': '⏸️ Sync off',
    '⏫ Đang đồng bộ...': '⏫ Syncing...',
    '⏳ Đang quét...': '⏳ Scanning...',
    '⏳ Đang tải cloud...': '⏳ Loading cloud...',
    '⏳ Đang tạo...': '⏳ Creating...',
    '❌ Lỗi': '❌ Error',
    'Hạng (↓ tốt hơn)': 'Rank (↓ better)',
    'Nhập password quản trị:': 'Enter admin password:',
    'Tên ghi chú:': 'Note name:',
    'Tên mùa:': 'Season name:',
    'Tiếp tục Import?': 'Continue import?',
    'Tiếp tục?': 'Continue?',
    'Tự động đồng bộ đang bật. Nhấn để tắt.': 'Auto-sync is on. Click to turn it off.',
    'Tự động đồng bộ đang tắt. Nhấn để bật lại.': 'Auto-sync is off. Click to turn it on.',
    'Tự động scan từ logos/': 'Auto-scan from logos/',
    '🔄 Quét lại ngay': '🔄 Rescan now',
    '🔍 Tìm theo tên...': '🔍 Search by name...',
    'Không có kết quả': 'No results',
    'Xóa bằng cách remove file trong logos/ trên repo': 'Remove by deleting the file in logos/ on the repo',
    'Lưu base64 trong data.json (legacy, có thể xóa nếu file đã có trên repo)': 'Store base64 in data.json (legacy; can be removed once the file exists on the repo)',

    // index.html extras
    'Lượt đấu vòng bảng:': 'Group stage legs:',
    'Mùa mặc định': 'Default season',
    'Tạo PAT tại': 'Create a PAT at',
    'với quyền': 'with scope',

    // Teo Robot widget
    '(không có dữ liệu team)': '(no team data)',
    '✅ Đã copy vào clipboard': '✅ Copied to clipboard',
    '5 trận gần nhất': 'Last 5 matches',
    'Bàn thắng / Bàn thua': 'Goals for / against',
    'Bỏ tất cả': 'Deselect all',
    'Cần chọn ít nhất 1 team để hiển thị.': 'Select at least 1 team to display.',
    'Canvas không hợp lệ': 'Invalid canvas',
    'Chọn 1 team và bấm Xem thông tin team.': 'Select 1 team and click View team info.',
    'Chọn 2 team và bấm Kiểm tra đối đầu.': 'Select 2 teams and click Compare head-to-head.',
    'Chọn team hiển thị trong danh sách': 'Select teams to show in the list',
    'Chưa có danh hiệu nào.': 'No titles yet.',
    'Chưa có dữ liệu team.': 'No team data yet.',
    'Chưa có summary để chụp.': 'No summary to capture.',
    'Chức năng': 'Features',
    'Chụp summary thất bại.': 'Failed to capture the summary.',
    'Đã chọn tất cả team. Nhấn Lưu danh sách để áp dụng.': 'All teams selected. Click Save list to apply.',
    'Đã bỏ tất cả team. Nhấn Lưu danh sách để áp dụng.': 'All teams deselected. Click Save list to apply.',
    'Đã reset về mặc định (hiển thị tất cả team).': 'Reset to default (show all teams).',
    'Danh Hiệu': 'Titles',
    'Điểm (3-1-0)': 'Points (3-1-0)',
    'Đối đầu trực tiếp:': 'Head-to-head:',
    'Hiệu số': 'GD',
    'Hồ sơ cá nhân': 'Personal profile',
    'Hồ sơ team:': 'Team profile:',
    'Không có dữ liệu trận đấu': 'No match data',
    'Không đọc được dữ liệu mùa giải.': 'Could not read the season data.',
    'Không tạo được ảnh': 'Could not create the image',
    'Không tìm thấy trận đấu nào': 'No matches found',
    'Kiểm tra đối đầu': 'Compare head-to-head',
    'Lịch sử đối đầu': 'Head-to-head history',
    'Lưu danh sách': 'Save list',
    'Reset mặc định': 'Reset to default',
    'So sánh kết quả tất cả các trận giữa 2 team trong toàn bộ dữ liệu.': 'Compare the results of all matches between 2 teams across all data.',
    'Tên': 'Name',
    'Tổng hợp theo chế độ': 'Summary by mode',
    'Tổng hợp theo mùa': 'Summary by season',
    'Tổng hợp toàn bộ thành tích, thống kê theo mùa và chế độ thi đấu.': 'A full summary of achievements and stats by season and game mode.',
    'Tổng trận': 'Total matches',
    'Trình duyệt không hỗ trợ copy ảnh trực tiếp. Đã tải file PNG xuống máy.': 'Your browser does not support copying images directly. The PNG file has been downloaded.',
    'Tùy chỉnh Admin': 'Admin settings',
    'Vui lòng chọn 2 team khác nhau.': 'Please select 2 different teams.',
    'Vui lòng chọn đủ 2 team.': 'Please select 2 teams.',
    'Vui lòng chọn team.': 'Please select a team.',
    'Xem thông tin team': 'View team info',

    // Chat widget
    '— Chọn tên —': '— Choose name —',
    '⚽ Cùng chém gió bóng đá đi!': '⚽ Let\'s talk football!',
    '(chưa có dữ liệu Team list)': '(no Team list data)',
    '⚠️ Gửi thất bại:': '⚠️ Send failed:',
    '⚠️ Lỗi tải tin nhắn:': '⚠️ Error loading messages:',
    '⚠️ Chưa cấu hình đồng bộ (Firebase). Tin nhắn chưa gửi/nhận được — xem hướng dẫn trong chat-widget.js.': '⚠️ Sync not configured (Firebase). Messages cannot be sent/received — see the instructions in chat-widget.js.',
    'Chọn tên': 'Choose name',
    'Chưa bật đồng bộ.': 'Sync is not enabled.',
    'Chưa có tin nhắn. Hãy là người đầu tiên!': 'No messages yet. Be the first!',
    'Đang tải tin nhắn…': 'Loading messages…',
    'đổi tên': 'change name',
    'dùng toàn bộ team list.': 'using the full team list.',
    'Gửi': 'Send',
    'không rõ': 'unknown',
    'Nhập tên trước khi chat': 'Enter a name before chatting',
    'Nhập tin nhắn… (Enter để gửi)': 'Type a message… (Enter to send)',
    'Tên này không có trong Team list.': 'This name is not in the Team list.',
    'Vào phòng chat': 'Enter chat room',
    'Vui lòng chọn tên của bạn.': 'Please choose your name.',
    'đã xem': 'seen',
    '🎮 Khẩu chiến PES tại đây!': '🎮 PES showdown right here!',
    '🏆 Trash-talk trước trận nào!': '🏆 Trash-talk before the match!',
    '💬 Chat phòng chung': '💬 Group chat',
    '💬 Vào tám chuyện nào!': '💬 Come and chat!',
    '🔥 Có người đang chờ bạn chat!': '🔥 Someone is waiting to chat with you!',
    '😎 Đừng im lặng, vào chat thôi!': '😎 Don\'t stay quiet — come chat!',

    // Leftovers found in audit
    '. Token chỉ lưu trong trình duyệt của bạn.': '. The token is stored only in your browser.',
    'trên repo': 'on the repo',
    'ghp_xxx hoặc github_pat_xxx': 'ghp_xxx or github_pat_xxx',
    'Đổi cặp đấu thủ công': 'Swap pairing manually',
    '🔀 Đổi cặp đấu thủ công': '🔀 Swap pairing manually',
    'Đã đổi cặp đấu': 'Pairing swapped',
    'Không có đối thủ nào khác để đổi trong vòng này': 'No other opponents to swap in this round',
    'Trận này đã có kết quả — hãy xoá kết quả trước khi đổi cặp thủ công': 'This match already has a result — clear it before swapping manually',
    'Huỷ': 'Cancel',
    'Đang tắt tự động đồng bộ lên server': 'Automatic sync to the server is off',
    'Ghi chú': 'Note',
    'Ghi chú:': 'Note:',
    'Xoá ghi chú': 'Delete note',
    'Xoá liên kết': 'Delete link',
    'Xoá nút Home': 'Delete Home button',
    'Xoá logo': 'Remove logo',
    'Nội dung (có thể định dạng HTML):': 'Content (HTML formatting allowed):',
    'Không tìm thấy logo nào': 'No logos found',
    '🔄 Reset về mặc định': '🔄 Reset to default',
    'Upload mới...': 'Upload new...',
    'Chọn từ danh sách Season Logos hoặc upload file mới (sẽ được lưu vào': 'Choose from the Season Logos list or upload a new file (saved to',
    'với tiền tố': 'with the prefix',
    'vào': 'to',
    '💡 Cách thêm logo mới (khuyến nghị):': '💡 How to add a new logo (recommended):',
    'Push file ảnh vào thư mục': 'Push the image file to the',
    'trên GitHub repo. File có tên bắt đầu bằng': 'folder on the GitHub repo. Files whose names start with',
    'sẽ vào nhóm': 'go into',
    ', còn lại vào nhóm': ', the rest into',
    'Thắng': 'Won',
    'Vòng': 'Round',
    'đội': 'teams',
    'Đặt tên, màu, logo (PNG/JPG 1:1). Bấm [↓] để chọn từ danh sách đội.': 'Set name, color, logo (PNG/JPG 1:1). Click [↓] to pick from the Team List.',
    'Đã lưu ảnh BXH thành công!': 'Standings image saved successfully!',
    'Đang chụp...': 'Capturing...',
    'Không tìm thấy bảng xếp hạng': 'Standings table not found',
    'Lỗi khi chụp ảnh BXH': 'Failed to capture the standings image',
    '📸 Chụp BXH': '📸 Capture standings',
    '➕ Tạo backup mới': '➕ Create new backup',
    '⚠️ Hai đội đã từng gặp nhau trước đó': '⚠️ These two teams have already met',
    'Chọn đội muốn đổi vào vị trí này:': 'Choose the team to swap into this slot:',
    'Đội hiện tại:': 'Current team:',
    'Không tìm thấy đội nào': 'No teams found',
    'Logo giải đấu': 'League logo'
  };

  // ---- Fragment translations (substring replacement, longest first) ---------
  // Used for strings built dynamically with interpolation.
  var PHRASES_RAW = {
    // Systems dialog: cloud grant (dynamic user name)
    ' rồi bấm Lưu để cấp quyền ghi cloud': ' then click Save to grant cloud write',
    'Nhập mật khẩu (tối thiểu 8 ký tự) cho ': 'Enter a password (min 8 characters) for ',
    ' để cấp quyền ghi cloud': ' to grant cloud write',
    'Nhập mật khẩu cho ': 'Enter the password for ',
    // Round export errors
    'Không tạo được ảnh': 'Could not create image',
    'Không tải được thư viện chụp ảnh': 'Could not load the screenshot library',
    // Knockout / round labels
    'Vòng 1/16': 'Round of 32',
    'Vòng 1/8': 'Round of 16',
    'Tranh hạng 3': '3rd Place Match',
    'Chung kết': 'Final',
    'Bán kết': 'Semi-finals',
    'Tứ kết': 'Quarter-finals',
    'Vòng ': 'Round ',

    // Statuses
    'Chưa bắt đầu': 'Not started',
    'Vô địch': 'Champion',
    'Á quân': 'Runner-up',
    'Hạng 3': '3rd Place',
    'Hạng 4': '4th Place',
    'Nửa trên': 'Upper half',
    'Rớt hạng': 'Relegation',
    'rớt hạng': 'relegation',

    // Result markers
    '(Vô địch)': '(Champion)',
    '(Hạng 3)': '(3rd Place)',
    '(Thắng)': '(Won)',
    '(Hòa)': '(Draw)',
    '(chưa đá)': '(not played)',
    // Bracket placeholder labels: "Thắng WB 1-2" = winner of that match
    'Thắng ': 'Winner ',
    'Thua ': 'Loser ',
    // Cup / bracket standings status column
    'Tham gia': 'In progress',
    'Rớt Losers Bracket': 'Dropped to Losers Bracket',
    'Rớt từ ': 'Dropped from ',

    // Insights labels
    'Hàng công tốt nhất:': 'Best attack:',
    'Hiệu số tốt nhất:': 'Best goal difference:',
    'Thủ chắc nhất:': 'Best defense:',
    'Form tốt nhất 5 trận:': 'Best 5-match form:',
    'Chuỗi thắng dài nhất:': 'Longest win streak:',
    'Trận nhiều bàn nhất:': 'Highest-scoring match:',
    ' trận)': ' matches)',
    'Tổng:': 'Total:',

    // Standings settings dialog labels
    'Top xanh:': 'Blue top:',
    'Suất châu Âu:': 'European slots:',
    'Rớt hạng:': 'Relegation:',

    // Settings band legend prefix already handled by 'rớt hạng'

    // Interpolated confirm/toast/alert fragments
    'Tạo lại cặp đấu Vòng ': 'Regenerate pairings for Round ',
    'Kết quả vòng này và các vòng sau sẽ bị xoá.': 'Results of this and all later rounds will be deleted.',
    'Tạo lại cặp đấu vòng này (xoá kết quả vòng này và các vòng sau)': 'Regenerate this round\'s pairings (clears this and later rounds)',
    'Tạo lại các cặp đấu cho vòng này (sẽ xóa kết quả của vòng này và các vòng sau)': 'Regenerate pairings for this round (clears this and later rounds)',
    'Lưu ý: Kết quả của vòng này và TẤT CẢ các vòng sau (kể cả playoff) sẽ bị xóa.': 'Note: results of this round and ALL later rounds (including playoffs) will be deleted.',
    'Tạo lại nhánh knock-out theo thứ hạng Swiss hiện tại (sẽ xóa toàn bộ kết quả vòng knock-out)': 'Regenerate the knockout bracket from the current Swiss standings (clears all knockout results)',
    'Tạo lại nhánh knock-out theo thứ hạng Swiss hiện tại?': 'Regenerate the knockout bracket from the current Swiss standings?',
    'Lưu ý: TẤT CẢ kết quả của vòng knock-out sẽ bị xóa.': 'Note: ALL knockout-round results will be deleted.',
    '🎲 Random cả vòng': '🎲 Randomize round',
    'Random tỉ số cho tất cả các trận của vòng này': 'Randomize scores for all matches of this round',
    'Đã tải logo cho ': 'Uploaded logo for ',
    'Đã tải logo lên repo': 'Logo uploaded to the repo',
    'Upload ảnh thất bại: ': 'Image upload failed: ',
    'Upload thất bại: ': 'Upload failed: ',
    'Đã chọn logo ': 'Selected logo ',
    'Quét logos/ thất bại: ': 'Scanning logos/ failed: ',
    'Xoá mùa \'': 'Delete season \'',
    'Số mùa giải: ': 'Number of seasons: ',
    'Đã tải lại dữ liệu từ file thành công!': 'Successfully reloaded data from the file!',
    'Không thể tải dữ liệu từ file': 'Could not load data from the file',
    'Lỗi: ': 'Error: ',
    'Vui lòng kiểm tra:': 'Please check:',
    'File có chứa dữ liệu hợp lệ': 'The file contains valid data',
    'Trình duyệt đã tải hoàn chỉnh trang': 'The browser fully loaded the page',
    '❌ Import thất bại: ': '❌ Import failed: ',
    'Đã đạt tối đa ': 'Reached the maximum of ',
    ' bản backup. Hãy xoá một bản trước.': ' backups. Please delete one first.',
    ' bản. Hãy xoá một bản để tạo mới.': ' backups. Delete one to create a new one.',
    'Snapshot toàn bộ dữ liệu hệ thống (tối đa ': 'Full system-data snapshot (max ',
    'Đã dùng ': 'Used ',
    'Xóa tất cả thay đổi chưa được lưu': 'Discard all unsaved changes',

    // Cup / knockout statuses (interpolated)
    'Bị loại': 'Eliminated',
    'Loại tại ': 'Eliminated at ',
    ' mùa • ': ' seasons • ',
    ' bản). Đã dùng ': ' snapshots). Used ',
    ' đội': ' teams',

    // Cloud / sync interpolated messages
    'PAT không hợp lệ hoặc thiếu quyền (HTTP ': 'PAT is invalid or missing scope (HTTP ',

    // Import / refresh confirm dialogs (concatenated fragments)
    '⚠️ Hành động này sẽ:': '⚠️ This action will:',
    '• Ghi đè lên dữ liệu hiện tại trong trình duyệt': '• Overwrite the current data in the browser',
    '• Ghi đè toàn bộ dữ liệu hiện tại': '• Overwrite all current data',
    '• Không thể hoàn tác': '• Cannot be undone',
    '• Tải lại toàn bộ dữ liệu từ file': '• Reload all data from the file',
    '• Thay thế tất cả seasons, teams, logos, notes và links': '• Replace all seasons, teams, logos, notes and links',
    'Bạn có chắc chắn muốn Import dữ liệu?': 'Are you sure you want to import data?',
    'Bạn có chắc chắn muốn Refresh từ file?': 'Are you sure you want to refresh from the file?',

    // Teo Robot widget (interpolated)
    'Đang chọn ': 'Selecting ',
    ' team hiển thị.': ' teams shown.',
    '✅ Đã lưu & đồng bộ lên server: ': '✅ Saved & synced to the server: ',
    ' team. Mọi người sẽ thấy sau khi tải lại trang.': ' teams. Everyone will see them after reloading the page.',
    '⚠️ Đã lưu trên máy này (': '⚠️ Saved on this device (',
    ' team) nhưng CHƯA đồng bộ lên server — cần bật Cloud Sync (PAT admin) thì người khác mới thấy.': ' teams) but NOT yet synced to the server — enable Cloud Sync (admin PAT) for others to see them.',
    ' chưa gặp nhau trong dữ liệu hiện tại.': ' have not met in the current data.',
    'Chưa tìm thấy trận nào của ': 'No matches found for ',
    ' trong dữ liệu hiện tại.': ' in the current data.',
    ' và ': ' and ',

    // Chat widget (interpolated)
    'Tên phải có trong ': 'The name must be in ',
    '. Hãy chọn tên của bạn từ danh sách bên dưới.': '. Please choose your name from the list below.',

    // Leftovers found in audit
    '(Trận ': '(Match ',
    'Đội nhà': 'Home',
    'Đội khách': 'Away',
    'Lỗi khi lưu file: ': 'Error saving file: ',
    'Tạo lại các cặp đấu cho Swiss Round ': 'Regenerate pairings for Swiss Round '
  };

  // Regex rules (applied to the trimmed string, before PHRASES).
  var EN_PATTERNS = [
    [/\((\d+)đ\)/g, '($1 pts)']
  ];

  // ===========================================================================
  // EN -> VI: parts of the source app are written in English. In Vietnamese
  // mode these are translated so the UI never mixes the two languages.
  // ===========================================================================
  var VI_EXACT = {
    // Header / menus (index.html)
    'Team setup': 'Thiết lập đội',
    'Team setup (': 'Thiết lập đội (',
    'Team List': 'Danh sách đội',
    'Logo List': 'Danh sách logo',
    '💾 Backup': '💾 Sao lưu',
    '📤 Export Data': '📤 Xuất dữ liệu',
    '📥 Import Data': '📥 Nhập dữ liệu',
    '☁️ Cloud': '☁️ Đám mây',
    'Sync: ON': 'Đồng bộ: BẬT',
    'Sync: OFF': 'Đồng bộ: TẮT',
    'Admin': 'Quản trị',
    '+Link': '+Liên kết',
    '+Note': '+Ghi chú',
    'Theme': 'Giao diện',
    'Theme: Dark': 'Giao diện: Tối',
    'Theme: White': 'Giao diện: Sáng',
    'Theme: Blue': 'Giao diện: Xanh',
    '☁️ GitHub Cloud Sync': '☁️ Đồng bộ đám mây GitHub',
    'Repo:': 'Kho:',
    '· branch': '· nhánh',
    '· file': '· tệp',
    'Personal Access Token (PAT)': 'Mã truy cập cá nhân (PAT)',
    'Knock-out Stage': 'Vòng loại trực tiếp',
    'Double Elimination Bracket': 'Sơ đồ loại kép',
    'Live form': 'Phong độ gần đây',
    'Playoff:': 'Suất play-off:',
    'Enable Re-gen:': 'Cho phép tạo lại cặp đấu:',

    // Game modes (create-season options, season list, export list)
    'League': 'Vòng tròn tính điểm',
    'Knock-out': 'Loại trực tiếp',
    'Double Elimination': 'Loại kép',
    'Tournament': 'Vòng bảng + Loại trực tiếp',
    'Swiss System': 'Hệ Thụy Sĩ',
    'Chess-Swiss': 'Thụy Sĩ (kiểu cờ vua)',
    'Legend': 'Huyền thoại',
    'Ranking': 'Bảng xếp hạng',
    'Cup': 'Cúp',
    'Swiss': 'Thụy Sĩ',
    'DE': 'Loại kép',

    // Table headers / stats
    'Team': 'Đội',
    'Name': 'Tên',
    'Pts': 'Điểm',
    'GF': 'BT',
    'GA': 'BB',
    'GD': 'HS',
    'Form': 'Phong độ',
    'Trend': 'Xu hướng',
    'Record': 'Thành tích',
    'Stage': 'Giai đoạn',
    'Status': 'Trạng thái',
    'Champion': 'Vô địch',
    'Total': 'Tổng',
    'Top4': 'Top 4',
    'GF/GA': 'BT/BB',
    'GF/GA/GD': 'BT/BB/HS',
    'W-D-L': 'T-H-B',
    'WR': '% thắng',
    'Win Rate': 'Tỉ lệ thắng',
    '• GF/GA:': '• BT/BB:',

    // Stages / statuses
    'Winner': 'Vô địch',
    'Runner-up': 'Á quân',
    'Serie B Winner': 'Vô địch Serie B',
    'Serie B Runner-up': 'Á quân Serie B',
    '3rd Place': 'Hạng 3',
    '4th Place': 'Hạng 4',
    'Final': 'Chung kết',
    '3rd Place Match': 'Tranh hạng 3',
    'Semi-finals': 'Bán kết',
    'Quarter-finals': 'Tứ kết',
    'Group Stage': 'Vòng bảng',
    'Qualified': 'Đi tiếp',
    'Eliminated': 'Bị loại',
    'Decider Match': 'Trận quyết định',
    'One Win Away': 'Còn 1 trận thắng',
    'One Loss Away': 'Còn 1 trận thua',
    'Active': 'Đang thi đấu',
    '🏆 Winner': '🏆 Vô địch',
    '🥈 Runner-up': '🥈 Á quân',
    '🥉 3rd Place': '🥉 Hạng 3',
    '✓ Qualified': '✓ Đi tiếp',
    '✗ Eliminated': '✗ Bị loại',
    '2-2 Decider': 'Quyết định 2-2',
    '1 Win To Qualify': 'Thắng 1 trận để đi tiếp',
    '1 Loss To Eliminate': 'Thua 1 trận là bị loại',
    'TBD': 'Chưa xác định',
    'Unknown Team': 'Đội không xác định',

    // Brackets
    '🏆 Winners Bracket': '🏆 Nhánh thắng',
    '💀 Losers Bracket': '💀 Nhánh thua',
    '👑 Grand Final': '👑 Chung kết tổng',
    '👑 Grand Finals': '👑 Chung kết tổng',
    'Grand Finals': 'Chung kết tổng',
    'Playoff Round': 'Vòng sơ loại',
    '⚡ Playoff Round': '⚡ Vòng sơ loại',
    'Playoff': 'Sơ loại',
    '🎯 Swiss System Rounds': '🎯 Các vòng hệ Thụy Sĩ',
    '⚡ Pre-Swiss Playoff': '⚡ Vòng sơ loại trước hệ Thụy Sĩ',
    '🏆 Knock-out stage': '🏆 Vòng loại trực tiếp',
    '🔄 Regenerate': '🔄 Tạo lại',
    'Random Result': 'Tỉ số ngẫu nhiên',
    'Group Stage Tables': 'Bảng xếp hạng vòng bảng',
    '⏳ Complete all group stage matches to advance to knockout stage': '⏳ Hoàn thành tất cả trận vòng bảng để vào vòng loại trực tiếp',
    '⏳ Complete all group stage matches to unlock knockout bracket': '⏳ Hoàn thành tất cả trận vòng bảng để mở nhánh loại trực tiếp',
    '🏆 Knockout stage has begun! Check the bracket below for knockout matches.': '🏆 Vòng loại trực tiếp đã bắt đầu! Xem sơ đồ nhánh bên dưới.',
    'This match is locked because dependent matches have results. Changing this will clear those matches. Continue?': 'Trận này đang bị khoá vì các trận phụ thuộc đã có kết quả. Thay đổi sẽ xoá kết quả các trận đó. Tiếp tục?',
    'This round is locked because subsequent rounds have results. Changing this will clear dependent matches. Continue?': 'Vòng này đang bị khoá vì các vòng sau đã có kết quả. Thay đổi sẽ xoá kết quả các trận phụ thuộc. Tiếp tục?',
    'This round is locked because subsequent rounds have been generated. Changing this result will clear all subsequent rounds. Continue?': 'Vòng này đang bị khoá vì các vòng sau đã được tạo. Thay đổi kết quả này sẽ xoá tất cả các vòng sau. Tiếp tục?',

    // Season creation validation
    'Double Elimination requires minimum 3 teams': 'Thể thức loại kép cần tối thiểu 3 đội',
    'Double Elimination requires minimum 4 teams': 'Thể thức loại kép cần tối thiểu 4 đội',
    'Cup mode requires at least 2 teams.': 'Thể thức loại trực tiếp cần ít nhất 2 đội.',
    'Swiss System requires at least 8 teams': 'Hệ Thụy Sĩ cần ít nhất 8 đội',

    // Legend / Ranking modes
    '📊 Statistics': '📊 Thống kê',
    '🏅 All-Time Champions': '🏅 Các nhà vô địch mọi thời đại',
    '🏅 Ranking': '🏅 Bảng xếp hạng',
    'Total Years': 'Tổng số năm',
    'Total Events': 'Tổng số giải',
    'Gold Medals': 'Huy chương vàng',
    'Silver Medals': 'Huy chương bạc',
    'Bronze Medals': 'Huy chương đồng',
    '🏆 Hall of Champions': '🏆 Đại sảnh vô địch',
    '🏆 Year': '🏆 Năm',
    '📅 Add Timeline': '📅 Thêm mốc thời gian',
    '➕ Add Event': '➕ Thêm giải',
    '🗑️ Delete Year': '🗑️ Xoá năm',
    '📸 Photo Gallery': '📸 Thư viện ảnh',
    '➕ Add Photo': '➕ Thêm ảnh',
    'Enter year:': 'Nhập năm:',
    'Rename timeline:': 'Đổi tên mốc thời gian:',
    'Delete this photo?': 'Xoá ảnh này?',
    'Enter event name:': 'Nhập tên giải:',
    'Rename event:': 'Đổi tên giải:',
    'Enter number of rows in ranking table:': 'Nhập số dòng của bảng xếp hạng:',
    'Number of rows must be between 1 and 100': 'Số dòng phải từ 1 đến 100',
    'Enter default rate for all rows:': 'Nhập hệ số mặc định cho tất cả các dòng:',
    'Enter name': 'Nhập tên',
    'Team name...': 'Tên đội...',
    'Team List is empty. Add teams to Team List first.': 'Danh sách đội đang trống. Hãy thêm đội vào danh sách trước.',
    'No participants in the latest timeline yet.': 'Mốc thời gian mới nhất chưa có người tham gia.',
    'Unchecked teams are hidden from the Ranking table. Event data in Year is kept.': 'Đội bỏ chọn sẽ bị ẩn khỏi bảng xếp hạng. Dữ liệu giải trong năm vẫn được giữ nguyên.',
    '👥 Select teams': '👥 Chọn đội',
    '👥 Select teams shown in Ranking': '👥 Chọn đội hiển thị trong bảng xếp hạng',
    'Tick which teams are shown in the Ranking table': 'Đánh dấu các đội hiển thị trong bảng xếp hạng',

    // Generic dialog buttons
    'Cancel': 'Huỷ',
    'Close': 'Đóng',
    'Add': 'Thêm',
    'Delete': 'Xoá',
    '🗑️ Delete': '🗑️ Xoá',
    'None': 'Không có',

    // Team setup / team & logo lists
    'Select Team': 'Chọn đội',
    'Select Team from Master List': 'Chọn đội từ danh sách tổng',
    'Select Team Logo': 'Chọn logo đội',
    'Select from Team List': 'Chọn từ danh sách đội',
    'Select from Team Logo List': 'Chọn từ danh sách logo đội',
    'Reset to Default Logo': 'Đặt lại logo mặc định',
    'Team Logo List is empty. Add logos to Logo List first.': 'Danh sách logo đội đang trống. Hãy thêm logo vào danh sách trước.',
    'Click to rename': 'Bấm để đổi tên',
    'Enter team name...': 'Nhập tên đội...',
    'Season logo': 'Logo mùa giải',
    'No teams added yet': 'Chưa có đội nào',
    'Team already exists!': 'Đội đã tồn tại!',
    'No logos in this group': 'Không có logo nào trong nhóm này',
    'auto': 'tự động',
    'manual': 'thủ công',
    'Upload to logos/': 'Tải lên logos/',
    'Please select a logo file first.': 'Vui lòng chọn file logo trước.',
    'Please select an image file.': 'Vui lòng chọn file ảnh.',
    '⏳ Uploading...': '⏳ Đang tải lên...',
    '➕ Add Separator Line': '➕ Thêm dòng phân cách',

    // Export / import / refresh / backup
    'Select All Seasons': 'Chọn tất cả mùa giải',
    'Include Pictures': 'Bao gồm hình ảnh',
    'Uncheck to reduce export file size': 'Bỏ chọn để giảm dung lượng file xuất',
    '────── separator ──────': '────── phân cách ──────',
    'Select seasons to include in export': 'Chọn các mùa giải cần xuất',
    'Export Selected': 'Xuất mục đã chọn',
    'Please select at least one season to export.': 'Vui lòng chọn ít nhất một mùa giải để xuất.',
    '✅ Exported successfully!': '✅ Xuất thành công!',
    '✅ File exported to Downloads folder!': '✅ Đã xuất file vào thư mục Downloads!',
    '✓ File location saved for next export': '✓ Đã lưu vị trí file cho lần xuất sau',
    '📥 Import Data from File': '📥 Nhập dữ liệu từ file',
    'Select an exported HTML file to import all data': 'Chọn file HTML đã xuất để nhập toàn bộ dữ liệu',
    '📁 Drop HTML file here or click to browse': '📁 Thả file HTML vào đây hoặc bấm để chọn',
    'Browse Files': 'Chọn file',
    'Import Preview:': 'Xem trước dữ liệu nhập:',
    'Import Data': 'Nhập dữ liệu',
    'File:': 'Tệp:',
    'Seasons:': 'Số mùa giải:',
    'Team Master List:': 'Danh sách đội tổng:',
    'Logo Master List:': 'Danh sách logo tổng:',
    'Notes:': 'Ghi chú:',
    'Custom Links:': 'Liên kết tùy chỉnh:',
    'Home Link:': 'Liên kết Home:',
    'Please select a valid HTML file': 'Vui lòng chọn file HTML hợp lệ',
    'No embedded data found in this file. Please select a valid exported HTML file.': 'Không tìm thấy dữ liệu trong file này. Vui lòng chọn file HTML đã xuất hợp lệ.',
    'Refresh from File - Admin Mode': 'Làm mới từ file - Chế độ quản trị',
    '📊 Current State Information': '📊 Thông tin trạng thái hiện tại',
    'Total Seasons:': 'Tổng số mùa giải:',
    'Current Season:': 'Mùa giải hiện tại:',
    'Teams in Current Season:': 'Số đội mùa hiện tại:',
    'Data Source:': 'Nguồn dữ liệu:',
    'Last Action:': 'Thao tác gần nhất:',
    'Browser Storage + File': 'Bộ nhớ trình duyệt + File',
    'File Only': 'Chỉ file',
    '⚠️ Warning': '⚠️ Cảnh báo',
    'Confirm Refresh': 'Xác nhận làm mới',
    '💾 Backup Data': '💾 Sao lưu dữ liệu',
    '↩️ Restore': '↩️ Khôi phục',
    '⚠️ Offline': '⚠️ Ngoại tuyến',

    // Teo Robot widget
    '(Unnamed)': '(Chưa đặt tên)',
    'Team A': 'Đội A',
    'Team B': 'Đội B',
    '📸 Capture': '📸 Chụp ảnh'
  };

  var VI_PHRASES_RAW = {
    'Grand Finals': 'Chung kết tổng',
    'Grand Final': 'Chung kết tổng',
    'Rớt Losers Bracket': 'Rớt xuống nhánh thua',
    'Losers Bracket': 'Nhánh thua',
    'Winners Bracket': 'Nhánh thắng',
    'WB Vòng ': 'Nhánh thắng - Vòng ',
    'LB Vòng ': 'Nhánh thua - Vòng ',
    'Thua WB ': 'Thua nhánh thắng ',
    'Rớt từ WB ': 'Rớt từ nhánh thắng ',
    'Season Logos': 'Logo mùa giải',
    'Team Logos': 'Logo đội',
    'Team Master List': 'danh sách đội tổng',
    'Logo Master List': 'danh sách logo tổng',
    'Team List': 'danh sách đội',
    'Team list': 'danh sách đội',
    'Export failed: ': 'Xuất thất bại: ',
    'Error saving file: ': 'Lỗi khi lưu file: ',
    'Error reading file: ': 'Lỗi khi đọc file: ',
    ' team • ': ' đội • ',
    'Playoff (': 'Play-off (',
    'Sync: ON': 'Đồng bộ: BẬT',
    'Sync: OFF': 'Đồng bộ: TẮT',
    'Cloud sync: ': 'Đồng bộ đám mây: ',
    'This action cannot be undone.': 'Không thể hoàn tác.',

    // English loanwords inside Vietnamese source strings
    'Chưa có bản backup nào.': 'Chưa có bản sao lưu nào.',
    'bản backup': 'bản sao lưu',
    'dữ liệu backup': 'dữ liệu sao lưu',
    'để lưu backup': 'để lưu bản sao lưu',
    'bớt backup cũ': 'bớt bản sao lưu cũ',
    'trong backup': 'trong bản sao lưu',
    'Tạo backup': 'Tạo bản sao lưu',
    'Đã tạo backup': 'Đã tạo bản sao lưu',
    'Đã xoá backup': 'Đã xoá bản sao lưu',
    'Chọn team': 'Chọn đội',
    'Chọn 1 team': 'Chọn 1 đội',
    'Chọn 2 team': 'Chọn 2 đội',
    'giữa 2 team': 'giữa 2 đội',
    '2 team khác nhau': '2 đội khác nhau',
    'đủ 2 team': 'đủ 2 đội',
    'chọn team.': 'chọn đội.',
    'ít nhất 1 team': 'ít nhất 1 đội',
    'tất cả team': 'tất cả đội',
    ' team hiển thị': ' đội hiển thị',
    ' team) nhưng': ' đội) nhưng',
    ' team. Mọi người': ' đội. Mọi người',
    'dữ liệu team': 'dữ liệu đội',
    'Hồ sơ team': 'Hồ sơ đội',
    'thông tin team': 'thông tin đội',
    'Cloud Sync (PAT admin)': 'đồng bộ đám mây (PAT quản trị)',
    '⏸️ Sync tắt': '⏸️ Đồng bộ tắt',
    'Đang tắt sync.': 'Đang tắt đồng bộ.',
    ' để push.': ' để đẩy dữ liệu lên.',
    'lên server': 'lên máy chủ',
    'lên cloud': 'lên đám mây',
    'Đã reset về mặc định': 'Đã đặt lại về mặc định',
    'Reset về mặc định': 'Đặt lại về mặc định',
    'Reset mặc định': 'Đặt lại mặc định',
    'Reset mùa': 'Đặt lại mùa',
    'Upload mới hoặc push file': 'Tải lên mới hoặc đẩy file',
    'Chưa có season logo nào.': 'Chưa có logo mùa giải nào.',
    'Upload mới...': 'Tải lên mới...',
    'Upload ảnh thất bại: ': 'Tải ảnh lên thất bại: ',
    'Upload thất bại: ': 'Tải lên thất bại: ',
    'Push file ảnh': 'Đẩy file ảnh',
    '✅ Import thành công!': '✅ Nhập dữ liệu thành công!',
    'đã được import và lưu': 'đã được nhập và lưu',
    '❌ Import thất bại: ': '❌ Nhập dữ liệu thất bại: ',
    'muốn Import dữ liệu?': 'muốn nhập dữ liệu?',
    'Tiếp tục Import?': 'Tiếp tục nhập dữ liệu?',
    'Chess-Swiss yêu cầu': 'Thụy Sĩ (kiểu cờ vua) yêu cầu',
    'lịch Chess-Swiss': 'lịch Thụy Sĩ (kiểu cờ vua)',
    'Swiss bracket': 'nhánh Thụy Sĩ',
    'cho Swiss Round ': 'cho vòng Thụy Sĩ ',
    'thứ hạng Swiss': 'thứ hạng Thụy Sĩ',
    'nhánh knock-out': 'nhánh loại trực tiếp',
    'vòng knock-out': 'vòng loại trực tiếp',
    '(kể cả playoff)': '(kể cả play-off)',
    'Random lại cả vòng': 'Ngẫu nhiên lại cả vòng',
    'Random tỉ số': 'Tạo tỉ số ngẫu nhiên',
    'Random cả vòng': 'Ngẫu nhiên cả vòng',
    'Snapshot toàn bộ dữ liệu': 'Ảnh chụp toàn bộ dữ liệu'
  };

  var VI_MODE_TAG = {
    'LEAGUE': 'VÒNG TRÒN', 'CUP': 'LOẠI TRỰC TIẾP', 'DOUBLE ELIMINATION': 'LOẠI KÉP',
    'TOURNAMENT': 'VÒNG BẢNG', 'SWISS SYSTEM': 'HỆ THỤY SĨ', 'CHESS-SWISS': 'THỤY SĨ CỜ VUA',
    'LEGEND': 'HUYỀN THOẠI', 'RANKING': 'XẾP HẠNG'
  };
  var VI_RESULT = { W: 'T', D: 'H', L: 'B' };

  var VI_PATTERNS = [
    [/^Team (\d+)$/, 'Đội $1'],
    [/^Round (\d+)$/, 'Vòng $1'],
    [/^Knockout Round (\d+)$/, 'Vòng loại trực tiếp $1'],
    [/^Group Stage - Round (\d+)$/, 'Vòng bảng - Lượt $1'],
    [/^Group ([A-Z]) - Round (\d+)$/, 'Bảng $1 - Lượt $2'],
    [/^Group ([A-Z])$/, 'Bảng $1'],
    [/^Group ([A-Z]) #(\d+)$/, 'Hạng $2 bảng $1'],
    [/^Winner of R(\d+)M(\d+)$/, 'Thắng V$1-T$2'],
    [/^Loser of R(\d+)M(\d+)$/, 'Thua V$1-T$2'],
    [/^Winner of ([AB])-R(\d+)M(\d+)$/, 'Thắng $1 V$2-T$3'],
    [/^Loser of ([AB])-R(\d+)M(\d+)$/, 'Thua $1 V$2-T$3'],
    [/^(\d+) teams$/, '$1 đội'],
    [/^(\d+) logos$/, '$1 logo'],
    [/^Win Rate \(([\s\S]+)\)$/, 'Tỉ lệ thắng ($1)'],
    [/^Team Master List \((\d+) teams\)$/, 'Danh sách đội tổng ($1 đội)'],
    [/^Logo Master List \((\d+) logos\)$/, 'Danh sách logo tổng ($1 logo)'],
    [/^Export Seasons \((\d+) total\)$/, 'Xuất mùa giải (tổng $1)'],
    [/^Export (\d+) Seasons?(?: \+ (\d+) Separators?)?$/, function (m, a, b) {
      return 'Xuất ' + a + ' mùa giải' + (b ? ' + ' + b + ' dòng phân cách' : '');
    }],
    [/^(\d+) teams • ([\s\S]+)$/, function (m, n, mode) {
      return n + ' đội • ' + (VI_EXACT[mode] || mode);
    }],
    [/^Ranking: (\d+) \/ (\d+) teams shown$/, 'Bảng xếp hạng: hiển thị $1 / $2 đội'],
    [/^👥 Select teams \((\d+) hidden\)$/, '👥 Chọn đội ($1 bị ẩn)'],
    [/^Delete timeline for ([\s\S]+)\?$/, 'Xoá mốc thời gian $1?'],
    [/^Delete event "([\s\S]+)"\?$/, 'Xoá giải "$1"?'],
    [/^Tournament with (\d+) groups requires minimum (\d+) teams$/, 'Thể thức vòng bảng với $1 bảng cần tối thiểu $2 đội'],
    [/^Tournament mode with (\d+) groups requires at least (\d+) teams\.$/, 'Thể thức vòng bảng với $1 bảng cần ít nhất $2 đội.'],
    [/^With (\d+) groups, maximum knockout teams is (\d+)\.$/, 'Với $1 bảng, số đội vào vòng loại trực tiếp tối đa là $2.'],
    [/^Are you sure you want to delete "([\s\S]+)" from the Team Master List\?\s+This action cannot be undone\.$/, 'Bạn có chắc muốn xoá "$1" khỏi danh sách đội tổng?\n\nKhông thể hoàn tác.'],
    [/^Are you sure you want to delete logo "([\s\S]+)" from the Logo Master List\?\s+This action cannot be undone\.$/, 'Bạn có chắc muốn xoá logo "$1" khỏi danh sách logo tổng?\n\nKhông thể hoàn tác.'],
    [/^Selected logo "([\s\S]+)" for ([\s\S]+)$/, 'Đã chọn logo "$1" cho $2'],
    [/^Reset logo to default for ([\s\S]+)$/, 'Đã đặt lại logo mặc định cho $1'],
    // Fragments inside longer strings (Teo Robot history, season titles)
    [/\bDE Winners R(\d+)/g, 'Loại kép - Nhánh thắng V$1'],
    [/\bDE Losers R(\d+)/g, 'Loại kép - Nhánh thua V$1'],
    [/\bDE Playoff\b/g, 'Loại kép - Sơ loại'],
    [/\bDE Grand Final\b/g, 'Loại kép - Chung kết tổng'],
    [/\bSwiss Playoff Round (\d+)/g, 'Play-off Thụy Sĩ - Vòng $1'],
    [/\bSwiss Round (\d+)/g, 'Vòng Thụy Sĩ $1'],
    [/\bKnockout R(\d+)/g, 'Loại trực tiếp - Vòng $1'],
    [/\bLeague Round (\d+)/g, 'Vòng $1'],
    [/\bCup Round (\d+)/g, 'Cúp - Vòng $1'],
    [/\bGroup ([A-Z]) R(\d+)/g, 'Bảng $1 - Lượt $2'],
    [/\| (W|D|L)\]/g, function (m, r) { return '| ' + VI_RESULT[r] + ']'; }],
    [/\((LEAGUE|CUP|DOUBLE ELIMINATION|TOURNAMENT|SWISS SYSTEM|CHESS-SWISS|LEGEND|RANKING)\)/g, function (m, k) { return '(' + VI_MODE_TAG[k] + ')'; }]
  ];

  // Single-letter column headers / form badges (only inside <th> or .formBox).
  var VI_SHORT = { P: 'Tr', W: 'T', D: 'H', L: 'B' };

  function sortPhrases(raw) {
    return Object.keys(raw)
      .map(function (k) { return [k, raw[k]]; })
      .sort(function (a, b) { return b[0].length - a[0].length; });
  }

  var DICTS = {
    en: { exact: EXACT, phrases: sortPhrases(PHRASES_RAW), patterns: EN_PATTERNS, short: null },
    vi: { exact: VI_EXACT, phrases: sortPhrases(VI_PHRASES_RAW), patterns: VI_PATTERNS, short: VI_SHORT }
  };
  var D = DICTS[lang] || DICTS.en;

  function translateExact(str) {
    var key = str.trim();
    if (Object.prototype.hasOwnProperty.call(D.exact, key)) {
      // Preserve surrounding whitespace of the original text node.
      return str.replace(key, D.exact[key]);
    }
    return null;
  }

  function translatePatterns(str) {
    var key = str.trim();
    if (!key) return str;
    var out = key;
    for (var i = 0; i < D.patterns.length; i++) {
      out = out.replace(D.patterns[i][0], D.patterns[i][1]);
    }
    return out === key ? str : str.replace(key, function () { return out; });
  }

  function translatePhrases(str) {
    var out = str;
    for (var i = 0; i < D.phrases.length; i++) {
      var src = D.phrases[i][0];
      if (out.indexOf(src) !== -1) {
        out = out.split(src).join(D.phrases[i][1]);
      }
    }
    return out;
  }

  function tr(str) {
    if (!str) return str;
    var e = translateExact(str);
    if (e !== null) return e;
    return translatePhrases(translatePatterns(str));
  }

  function isShortContext(el) {
    return !!(el && el.nodeType === 1 &&
      (el.tagName === 'TH' || (el.classList && el.classList.contains('formBox'))));
  }

  // ---- DOM translation ------------------------------------------------------
  var SKIP_TAGS = { SCRIPT: 1, STYLE: 1, CODE: 1, TEXTAREA: 1, CANVAS: 1, PRE: 1 };

  function shouldSkip(node) {
    while (node) {
      if (node.nodeType === 1) {
        if (SKIP_TAGS[node.tagName]) return true;
        if (node.classList && node.classList.contains('no-i18n')) return true;
        if (node.hasAttribute && node.hasAttribute('data-i18n-skip')) return true;
      }
      node = node.parentNode;
    }
    return false;
  }

  function translateTextNode(tn) {
    var val = tn.nodeValue;
    if (!val || !val.trim()) return;
    if (shouldSkip(tn.parentNode)) return;
    if (D.short && isShortContext(tn.parentNode)) {
      var k = val.trim();
      if (Object.prototype.hasOwnProperty.call(D.short, k)) {
        tn.nodeValue = val.replace(k, D.short[k]);
        return;
      }
    }
    var t = tr(val);
    if (t !== val) tn.nodeValue = t;
  }

  function translateAttrs(el) {
    if (el.nodeType !== 1 || shouldSkip(el)) return;
    ['title', 'placeholder'].forEach(function (attr) {
      if (el.hasAttribute && el.hasAttribute(attr)) {
        var v = el.getAttribute(attr);
        if (v && v.trim()) {
          var t = tr(v);
          if (t !== v) el.setAttribute(attr, t);
        }
      }
    });
  }

  function translateSubtree(root) {
    if (!root) return;
    if (root.nodeType === 3) { translateTextNode(root); return; }
    if (root.nodeType !== 1) return;

    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    var nodes = [];
    var n;
    while ((n = walker.nextNode())) nodes.push(n);
    nodes.forEach(translateTextNode);

    translateAttrs(root);
    var els = root.querySelectorAll('[title],[placeholder]');
    Array.prototype.forEach.call(els, translateAttrs);
  }

  var busy = false;
  function guarded(fn) {
    if (busy) return;
    busy = true;
    try { fn(); } finally { busy = false; }
  }

  var observer = new MutationObserver(function (mutations) {
    guarded(function () {
      mutations.forEach(function (m) {
        if (m.type === 'childList') {
          Array.prototype.forEach.call(m.addedNodes, function (node) {
            translateSubtree(node);
          });
        } else if (m.type === 'characterData') {
          translateTextNode(m.target);
        } else if (m.type === 'attributes') {
          translateAttrs(m.target);
        }
      });
    });
  });

  // ---- alert / confirm / prompt patching ------------------------------------
  function patchDialogs() {
    var _alert = window.alert.bind(window);
    var _confirm = window.confirm.bind(window);
    var _prompt = window.prompt.bind(window);
    window.alert = function (msg) {
      return _alert(typeof msg === 'string' ? tr(msg) : msg);
    };
    window.confirm = function (msg) {
      return _confirm(typeof msg === 'string' ? tr(msg) : msg);
    };
    window.prompt = function (msg, def) {
      return _prompt(typeof msg === 'string' ? tr(msg) : msg, def);
    };
  }

  // ---- Language toggle button -----------------------------------------------
  function injectLangButton() {
    var btn = document.getElementById('btnLang');
    if (!btn) {
      btn = document.createElement('button');
      btn.id = 'btnLang';
      btn.className = 'ghost no-i18n';
      var themeSel = document.getElementById('themeSel');
      if (themeSel && themeSel.parentNode) {
        themeSel.parentNode.insertBefore(btn, themeSel);
      } else {
        var right = document.querySelector('header .right');
        if (right) right.appendChild(btn);
        else document.body.appendChild(btn);
      }
    }
    btn.classList.add('no-i18n');
    btn.title = lang === 'en' ? 'Chuyển sang Tiếng Việt' : 'Switch to English';
    btn.textContent = lang === 'en' ? '🌐 EN' : '🌐 VI';
    if (!btn.getAttribute('data-i18n-wired')) {
      btn.setAttribute('data-i18n-wired', '1');
      btn.addEventListener('click', function () {
        var next = lang === 'en' ? 'vi' : 'en';
        try { localStorage.setItem(LANG_KEY, next); } catch (e) {}
        location.reload();
      });
    }
  }

  function start() {
    injectLangButton();
    patchDialogs();
    document.documentElement.lang = lang === 'en' ? 'en' : 'vi';
    guarded(function () { translateSubtree(document.body); });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['title', 'placeholder']
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
