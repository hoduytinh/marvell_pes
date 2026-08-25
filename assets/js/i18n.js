/*
 * Lightweight runtime i18n for Marvell Pes Club.
 * The source app is written in Vietnamese. This module translates the UI to
 * English at runtime (VI -> EN) by walking the DOM, watching for dynamically
 * rendered content, and patching alert/confirm/prompt messages.
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
  var lang = localStorage.getItem(LANG_KEY) || 'en';

  // ---- Whole-string translations (matched against trimmed text) -------------
  var EXACT = {
    // Header menus
    '🏆 Mùa giải': '🏆 Seasons',
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
    'Rớt Losers Bracket': 'Dropped to Losers Bracket',
    'Tên ghi chú:': 'Note name:',
    'Tên mùa:': 'Season name:',
    'Tiếp tục Import?': 'Continue import?',
    'Tiếp tục?': 'Continue?',
    'Tự động đồng bộ đang bật. Nhấn để tắt.': 'Auto-sync is on. Click to turn it off.',
    'Tự động đồng bộ đang tắt. Nhấn để bật lại.': 'Auto-sync is off. Click to turn it on.',
    'Tự động scan từ logos/': 'Auto-scan from logos/',
    '🔄 Quét lại ngay': '🔄 Rescan now',
    '🔍 Tìm theo tên...': '🔍 Search by name...',
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
    '😎 Đừng im lặng, vào chat thôi!': '😎 Don\'t stay quiet — come chat!'
  };

  // ---- Fragment translations (substring replacement, longest first) ---------
  // Used for strings built dynamically with interpolation.
  var PHRASES_RAW = {
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
    'Thắng ': 'Win ',
    'Thua ': 'Loss ',

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
    '. Hãy chọn tên của bạn từ danh sách bên dưới.': '. Please choose your name from the list below.'
  };

  var PHRASES = Object.keys(PHRASES_RAW)
    .map(function (k) { return [k, PHRASES_RAW[k]]; })
    .sort(function (a, b) { return b[0].length - a[0].length; });

  function translateExact(str) {
    var key = str.trim();
    if (Object.prototype.hasOwnProperty.call(EXACT, key)) {
      // Preserve surrounding whitespace of the original text node.
      return str.replace(key, EXACT[key]);
    }
    return null;
  }

  function translatePhrases(str) {
    var out = str;
    for (var i = 0; i < PHRASES.length; i++) {
      var vi = PHRASES[i][0];
      if (out.indexOf(vi) !== -1) {
        out = out.split(vi).join(PHRASES[i][1]);
      }
    }
    return out;
  }

  function tr(str) {
    if (lang !== 'en' || !str) return str;
    var e = translateExact(str);
    if (e !== null) return e;
    return translatePhrases(str);
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
    if (lang !== 'en' || !root) return;
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
    if (lang !== 'en') return;
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
    if (lang === 'en') {
      guarded(function () { translateSubtree(document.body); });
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: ['title', 'placeholder']
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
