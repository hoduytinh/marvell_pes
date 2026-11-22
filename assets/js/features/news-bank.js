// Marvell PES Club - features/news-bank.js
// The one shared sentence bank. The season newspaper (season-news.js), the match commentary
// (career.js careerCommentary) and Teo Robot's speech bubble all draw their lines from here.
// The newspaper is called PesNews; sentences speak in its voice.
//   SN_BANK[id] = { tag, vi: [...], en: [...] }  - tag is the default newspaper label (SN_TAGS).
//   {placeholders} are filled by careerFill; values may be HTML (newspaper) or plain text (commentary),
//   so templates themselves never contain markup.
//   snLine(id, vars, rng) picks one variant in the current language.

var SN_BANK = {
  // ================= Finished season =================
  champ: { tag: 'hot', vi: [
    "🏆 {c} chính thức lên ngôi vô địch {s}! PesNews xin cúi đầu bái phục.",
    "👑 Ngai vàng {s} đã có chủ: {c}. Các đội còn lại hẹn mùa sau nhé!",
    "🏆 {c} vô địch {s}! Champagne đâu, mở ra cho PesNews một chai.",
    "🎉 Pháo hoa đã nổ: {c} là nhà vô địch {s}. Cả làng PES đứng dậy vỗ tay!",
    "📜 Lịch sử ghi tên {c}: nhà vô địch {s}. Phần còn lại chỉ là chú thích.",
    "🥇 {c} đứng trên đỉnh {s}. Bao nhiêu mồ hôi, nước mắt và tay cầm hỏng đã được đền đáp."
  ], en: [
    "🏆 {c} are officially the {s} champions! PesNews takes a bow.",
    "👑 The {s} throne has an owner: {c}. Everyone else, see you next season!",
    "🏆 {c} win {s}! Pop the champagne — and save a glass for PesNews.",
    "🎉 Fireworks: {c} are the {s} champions. The whole PES village is on its feet!",
    "📜 History writes {c} in ink: {s} champions. Everyone else is a footnote.",
    "🥇 {c} stand on top of {s}. All the sweat, tears and broken controllers paid off."
  ] },
  runnerUp: { tag: 'troll', vi: [
    "🥈 {r} về nhì. Huy chương bạc cũng đẹp mà... đúng không? 🥲",
    "🥈 {r} á quân — gần lắm rồi mà vẫn xa. PesNews hiểu cảm giác đó.",
    "🥈 {r} dừng bước ở vị trí thứ 2. Lịch sử thường chỉ nhớ người thắng, nhưng PesNews vẫn nhớ {r}.",
    "🥈 Chỉ thiếu đúng một bước, {r} ôm huy chương bạc về nhà ngắm cho đỡ buồn.",
    "🥈 {r} là kẻ thua cuộc vĩ đại nhất mùa. Nghe vẫn hay hơn “á quân”, phải không?"
  ], en: [
    "🥈 {r} finish second. Silver is pretty too... right? 🥲",
    "🥈 Runners-up {r} — so close, yet so far. PesNews knows the feeling.",
    "🥈 {r} stop at number 2. History remembers winners, but PesNews remembers {r}.",
    "🥈 One step short, {r} take the silver medal home to stare at.",
    "🥈 {r} are the greatest losers of the season. Sounds better than “runners-up”, doesn't it?"
  ] },
  bronze: { tag: 'stats', vi: [
    "🥉 {b} giành huy chương đồng. Không vàng, không bạc, nhưng vẫn có mặt trong ảnh podium!",
    "🥉 {b} đứng thứ 3 — vừa đủ để khoe với bạn bè mà không bị hỏi “sao không vô địch?”.",
    "🥉 Đồng là của {b}. Mùa sau đổi màu huy chương nhé!"
  ], en: [
    "🥉 {b} take bronze. No gold, no silver, but still in the podium photo!",
    "🥉 {b} finish third — enough to brag without being asked “why didn't you win?”.",
    "🥉 Bronze goes to {b}. Change the colour next season!"
  ] },
  champRecord: { tag: 'stats', vi: [
    "📋 Thành tích của nhà vô địch {c}: {w} thắng – {d} hòa – {l} thua, Elo {e} sau mùa giải.",
    "📋 Hồ sơ lên ngôi của {c}: {w}T-{d}H-{l}B, và {e} Elo bỏ túi.",
    "📋 Con số không biết nói dối: {c} vô địch với {w} trận thắng, {l} trận thua, Elo {e}."
  ], en: [
    "📋 Champions {c}: {w} wins – {d} draws – {l} losses, {e} Elo over the season.",
    "📋 {c}'s title run: {w}W-{d}D-{l}L and {e} Elo in the pocket.",
    "📋 Numbers don't lie: {c} won it with {w} wins, {l} losses and {e} Elo."
  ] },
  champFirst: { tag: 'hist', vi: [
    "🌟 Lần đầu tiên trong sự nghiệp, {c} chạm tay vào cúp vàng! Tủ kính cuối cùng cũng có đồ.",
    "🌟 Chức vô địch đầu tiên của {c}! Ai từng cười {c} thì giờ im lặng đi.",
    "🌟 {c} phá dớp: danh hiệu vàng đầu tiên trong đời. Tối nay chắc không ai ngủ được."
  ], en: [
    "🌟 For the first time in their career, {c} lift a gold trophy! The cabinet finally has something in it.",
    "🌟 First-ever title for {c}! Anyone who laughed at {c} can be quiet now.",
    "🌟 {c} break the curse: the first gold of their life. Nobody is sleeping tonight."
  ] },
  champDynasty: { tag: 'hist', vi: [
    "🏰 Danh hiệu vàng thứ {k} của {c}. Đây không còn là đội bóng, đây là một đế chế.",
    "🏰 {c} lại vô địch — lần thứ {k}. Các đội khác bắt đầu thấy chán rồi đấy.",
    "🏰 {k} chiếc cúp vàng! {c} cần mua thêm tủ kính gấp."
  ], en: [
    "🏰 Gold number {k} for {c}. This is not a team any more, it is an empire.",
    "🏰 {c} win again — title number {k}. The others are starting to get bored.",
    "🏰 {k} gold trophies! {c} urgently need a bigger cabinet."
  ] },
  champDefend: { tag: 'hist', vi: [
    "🔁 {c} bảo vệ thành công ngôi vương {s}. Đương kim vẫn là đương kim!",
    "🔁 Hai lần liên tiếp, một cái tên: {c}. Ai đó làm ơn ngăn họ lại.",
    "🔁 {c} giữ cúp {s} ở lại nhà thêm một năm. Chẳng ai mượn được."
  ], en: [
    "🔁 {c} successfully defend the {s} crown. The holders are still the holders!",
    "🔁 Two editions in a row, one name: {c}. Someone please stop them.",
    "🔁 {c} keep the {s} trophy at home for another year. Nobody gets to borrow it."
  ] },
  champUnbeaten: { tag: 'mile', vi: [
    "🛡️ {c} vô địch mà không thua một trận nào! Bất khả chiến bại đúng nghĩa đen.",
    "🛡️ Cả mùa không biết mùi thất bại — {c} xứng đáng được dựng tượng.",
    "🛡️ {c} đi qua cả giải như đi dạo công viên: vô địch, bất bại."
  ], en: [
    "🛡️ {c} win the title without losing a single match! Invincible, literally.",
    "🛡️ A whole season without tasting defeat — {c} deserve a statue.",
    "🛡️ {c} strolled through the competition like a walk in the park: champions, unbeaten."
  ] },
  champSeriesKing: { tag: 'hist', vi: [
    "👑 {c} đã vô địch giải này tổng cộng {k} lần. Đây là “sân nhà” của họ.",
    "👑 Lần thứ {k} {c} lên ngôi ở giải đấu này. Giải nên đổi tên theo họ luôn đi."
  ], en: [
    "👑 {c} have now won this competition {k} times. It is their home turf.",
    "👑 Title number {k} in this competition for {c}. Maybe name the trophy after them."
  ] },
  champYearDouble: { tag: 'mile', vi: [
    "🎯 {c} đã có {k} danh hiệu trong năm nay. Năm của {c}, không bàn cãi!",
    "🎯 Cú ăn {k} trong năm cho {c}! Các đội khác chỉ còn biết đứng nhìn.",
    "🎯 {k} cúp trong một năm — {c} đang càn quét như cơn bão."
  ], en: [
    "🎯 {c} now have {k} titles this year. It is {c}'s year, no debate!",
    "🎯 A {k}-title year for {c}! Everyone else can only watch.",
    "🎯 {k} trophies in one year — {c} are sweeping through like a storm."
  ] },
  relegated: { tag: 'rel', vi: [
    "⬇️ {t} chính thức xuống hạng. Hẹn gặp lại... hoặc không.",
    "⬇️ {t} rớt hạng. Mùa sau nhớ mang theo bản đồ đường về.",
    "⬇️ Vé xuống hạng đã in tên {t}. Tàu chạy rồi, không đổi vé được.",
    "⬇️ {t} nói lời tạm biệt với giải đấu này. PesNews sẽ nhớ... một chút."
  ], en: [
    "⬇️ {t} are relegated. See you again... maybe.",
    "⬇️ {t} go down. Remember the way back next season.",
    "⬇️ The relegation ticket has {t}'s name on it. The train has left, no refunds.",
    "⬇️ {t} say goodbye to this competition. PesNews will miss them... a little."
  ] },
  woodenSpoon: { tag: 'troll', vi: [
    "🥄 Chiếc thìa gỗ thuộc về {t}: bét bảng với {p} điểm.",
    "🥄 {t} đứng cuối cùng với {p} điểm. Ít nhất thì cũng là một vị trí độc nhất.",
    "🥄 Đáy bảng có chủ: {t} ({p} điểm). Từ đây chỉ có thể đi lên!",
    "🥄 {t} kết thúc mùa ở vị trí cuối. PesNews kê đơn: một kỳ nghỉ dài và một tay cầm mới."
  ], en: [
    "🥄 The wooden spoon goes to {t}: bottom with {p} points.",
    "🥄 {t} finish last on {p} points. At least it is a unique position.",
    "🥄 The bottom spot has an owner: {t} ({p} pts). The only way is up!",
    "🥄 {t} end the season in last place. PesNews prescribes a long holiday and a new controller."
  ] },
  eloFlop: { tag: 'troll', vi: [
    "🎭 {f} có Elo cao nhất giải nhưng chiếc cúp lại về tay {c}. Elo chỉ là con số!",
    "🎭 Ứng viên số 1 {f} trắng tay, còn {c} thì ôm cúp. Giấy tờ chẳng nói lên điều gì.",
    "🎭 {f} mạnh nhất trên giấy, {c} mạnh nhất trên sân. Đoán xem ai được nhớ tới?"
  ], en: [
    "🎭 {f} had the highest Elo in the field, but the trophy went to {c}. Elo is just a number!",
    "🎭 Favourites {f} go home empty-handed while {c} lift the cup. Paper means nothing.",
    "🎭 {f} were strongest on paper, {c} strongest on the pitch. Guess who gets remembered?"
  ] },
  silverCurse: { tag: 'troll', vi: [
    "🥈 Lại về nhì ({k} lần) và vẫn chưa có cúp vàng nào cho {r}. Lời nguyền bạc là có thật.",
    "🥈 {r} sưu tầm huy chương bạc như sưu tầm tem: {k} chiếc, 0 vàng.",
    "🥈 {k} lần á quân. {r} ơi, chỉ cần một bước nữa thôi mà!"
  ], en: [
    "🥈 Runner-up again ({k} silvers) and still no gold for {r}. The silver curse is real.",
    "🥈 {r} collect silver medals like stamps: {k} of them, 0 gold.",
    "🥈 {k} times runner-up. Come on {r}, it is just one more step!"
  ] },

  // ================= Not started =================
  kickoff: { tag: 'hot', vi: [
    "📣 {s} sắp khởi tranh với {n} đội. Ứng viên số 1 trên giấy tờ: {f} (Elo {e}).",
    "📣 Tiếng còi khai cuộc {s} sắp vang lên! {n} đội, 1 chiếc cúp, và {f} là cái tên được đánh giá cao nhất.",
    "📣 {n} đội đã sẵn sàng cho {s}. PesNews đã mài bút, {f} (Elo {e}) là đội bị soi đầu tiên.",
    "📣 Mọi thứ bắt đầu lại từ con số 0 ở {s}. Nhưng {f} với Elo {e} thì bắt đầu từ... hơi cao hơn."
  ], en: [
    "📣 {s} is about to kick off with {n} teams. Favourite on paper: {f} (Elo {e}).",
    "📣 {s} is about to start! {n} teams, 1 trophy, and {f} are the name to beat.",
    "📣 {n} teams are ready for {s}. the PesNews pen is sharpened, and {f} (Elo {e}) are first under the microscope.",
    "📣 Everyone starts from zero in {s}. Well, {f} with {e} Elo start from... slightly higher."
  ] },
  weakest: { tag: 'troll', vi: [
    "🐣 {t} vào giải với Elo thấp nhất ({e}). Mục tiêu: không thua quá đậm?",
    "🐣 {t} là đội yếu nhất trên giấy tờ. Nhưng giấy thì... dễ rách lắm.",
    "🐣 Elo {e}, thấp nhất giải: {t} được kỳ vọng thấp nhất — nghĩa là chẳng có gì để mất!"
  ], en: [
    "🐣 {t} enter with the lowest Elo ({e}). Target: avoid a thrashing?",
    "🐣 {t} are the weakest on paper. But paper tears easily.",
    "🐣 Lowest Elo in the field ({e}): {t} have the lowest expectations — which means nothing to lose!"
  ] },
  defending: { tag: 'hist', vi: [
    "🛡️ Đương kim vô địch {t} trở lại {s}. Giữ cúp khó hơn giành cúp đấy!",
    "🛡️ {t} bước vào giải với tư cách nhà vô địch lần trước. Mọi đội đều muốn hạ họ.",
    "🛡️ Cúp lần trước vẫn đang nằm ở nhà {t}. Ai đủ sức tới lấy về?"
  ], en: [
    "🛡️ Holders {t} return to {s}. Keeping a trophy is harder than winning it!",
    "🛡️ {t} enter as last edition's champions. Everyone wants to take them down.",
    "🛡️ Last edition's trophy is still at {t}'s place. Who is strong enough to come and take it?"
  ] },
  debutant: { tag: 'profile', vi: [
    "🆕 {t} lần đầu xuất hiện trong dữ liệu của PesNews. Chào mừng tới câu lạc bộ!",
    "🆕 Gương mặt mới {t}: chưa có Elo, chưa có lịch sử, chỉ có tham vọng.",
    "🆕 {t} ra mắt. PesNews chưa có gì để chọc... tạm thời."
  ], en: [
    "🆕 {t} appear in the PesNews records for the first time. Welcome to the club!",
    "🆕 New face {t}: no Elo, no history, only ambition.",
    "🆕 {t} make their debut. PesNews has nothing to tease them about... yet."
  ] },
  preVeteran: { tag: 'profile', vi: [
    "🎖️ {t} là lão làng của giải với {k} trận sự nghiệp. Kinh nghiệm có thắng được sức trẻ?",
    "🎖️ {k} trận sự nghiệp — {t} đã thấy mọi thứ. Mọi thứ trừ... à mà thôi."
  ], en: [
    "🎖️ {t} are the veterans of the field with {k} career matches. Can experience beat youth?",
    "🎖️ {k} career matches — {t} have seen it all. Well, almost all."
  ] },
  preGap: { tag: 'pred', vi: [
    "⚖️ {f} và {t2} chỉ cách nhau {g} điểm Elo. Cuộc đua song mã đã được báo trước.",
    "⚖️ Elo của {f} và {t2} gần như ngang nhau (chênh {g}). PesNews đã chuẩn bị bỏng ngô."
  ], en: [
    "⚖️ {f} and {t2} are separated by just {g} Elo. A two-horse race is on the cards.",
    "⚖️ {f} and {t2} are almost level on Elo ({g} apart). PesNews has the popcorn ready."
  ] },

  // ================= Title race =================
  runaway: { tag: 'race', vi: [
    "🚀 {l} bỏ xa {s2} tới {g} điểm. Cuộc đua vô địch sắp thành cuộc dạo chơi?",
    "🏃 {l} đang chạy một mình: hơn đội nhì {s2} {g} điểm. Ai đó gọi họ quay lại đi!",
    "🚀 {g} điểm cách biệt! {s2} giờ chỉ còn nhìn thấy gót giày của {l}."
  ], en: [
    "🚀 {l} are {g} points clear of {s2}. Is the title race turning into a stroll?",
    "🏃 {l} are running alone: {g} points ahead of {s2}. Someone call them back!",
    "🚀 A {g}-point gap! {s2} can only see the heels of {l} now."
  ] },
  level: { tag: 'race', vi: [
    "🔥 {l} và {s2} đang bằng điểm nhau ({p} điểm). Ngôi đầu chỉ còn tính bằng hiệu số!",
    "⚔️ Hai con hổ chung một núi: {l} và {s2} cùng có {p} điểm.",
    "🔥 {p} điểm – {p} điểm. {l} và {s2} đang soi nhau qua kính lúp."
  ], en: [
    "🔥 {l} and {s2} are level on {p} points. The top spot comes down to goal difference!",
    "⚔️ Two tigers, one mountain: {l} and {s2} both have {p} points.",
    "🔥 {p} points each. {l} and {s2} are eyeing each other through a magnifying glass."
  ] },
  tight: { tag: 'race', vi: [
    "🔥 Cuộc đua nghẹt thở: {l} và {s2} chỉ cách nhau {g} điểm!",
    "⚔️ Ngôi đầu đang bị đe dọa: {s2} bám sát {l} chỉ {g} điểm.",
    "😰 {l} dẫn đầu nhưng nghe rõ tiếng thở của {s2} sau gáy — chỉ {g} điểm."
  ], en: [
    "🔥 Breathless race: {l} and {s2} are separated by {g} point(s)!",
    "⚔️ The top spot is under threat: {s2} sit just {g} point(s) behind {l}.",
    "😰 {l} lead, but can hear {s2} breathing down their neck — only {g} point(s)."
  ] },
  lead: { tag: 'race', vi: [
    "📊 {l} tạm dẫn đầu với {p} điểm, hơn {s2} {g} điểm.",
    "📊 {l} đang ngồi trên đỉnh ({p} điểm). {s2} đứng thứ 2, kém {g} điểm.",
    "📊 Bảng xếp hạng hôm nay: {l} số 1 ({p} điểm), {s2} theo sau {g} điểm. Chưa có gì là chắc."
  ], en: [
    "📊 {l} lead with {p} points, {g} ahead of {s2}.",
    "📊 {l} sit on top ({p} pts). {s2} are second, {g} behind.",
    "📊 Today's table: {l} first ({p} pts), {s2} {g} behind. Nothing is settled."
  ] },
  under: { tag: 'troll', vi: [
    "🎭 {t} có Elo cao thứ {e} giải nhưng đang đứng thứ {p}. Hữu danh vô thực?",
    "🫠 {t}: Elo xếp thứ {e}, bảng xếp hạng thứ {p}. Có ai thấy phong độ của {t} đâu không?",
    "🎭 Hàng hiệu mà đá như hàng chợ: {t} (Elo thứ {e}) đang lẹt đẹt ở vị trí {p}."
  ], en: [
    "🎭 {t} have the #{e} Elo but sit #{p}. All name, no game?",
    "🫠 {t}: #{e} by Elo, #{p} in the table. Has anyone seen their form?",
    "🎭 Designer label, market-stall football: {t} (#{e} by Elo) are stuck at #{p}."
  ] },
  over: { tag: 'form', vi: [
    "🌟 {t} đứng thứ {p} dù Elo chỉ xếp thứ {e}. Vượt xa kỳ vọng!",
    "🌟 Hiện tượng của mùa: {t} (Elo thứ {e}) đang chễm chệ vị trí thứ {p}.",
    "🌟 Không ai mời {t} lên bàn tiệc, nhưng họ vẫn ngồi ở ghế thứ {p} (Elo chỉ thứ {e})."
  ], en: [
    "🌟 {t} are #{p} despite being #{e} by Elo. Way above expectations!",
    "🌟 Surprise package: {t} (#{e} by Elo) are sitting #{p}.",
    "🌟 Nobody invited {t} to the party, yet there they are in seat #{p} (only #{e} by Elo)."
  ] },
  leaderSlip: { tag: 'shock', vi: [
    "🍌 Đội đầu bảng {l} vừa trượt vỏ chuối trước {o} ({sc}). Các đội bám đuổi mừng thầm.",
    "🍌 {l} thua {o} {sc}. Ngôi đầu bắt đầu lung lay!",
    "🍌 Cú vấp của {l}: thua {o} {sc}. PesNews nghe thấy tiếng ngai vàng kêu cót két."
  ], en: [
    "🍌 Leaders {l} just slipped on a banana skin against {o} ({sc}). The chasers are quietly smiling.",
    "🍌 {l} lose {sc} to {o}. The top spot is starting to wobble!",
    "🍌 {l} stumble: {sc} defeat to {o}. PesNews can hear the throne creaking."
  ] },
  bottom: { tag: 'troll', vi: [
    "🪫 {t} đang đứng cuối bảng với {p} điểm. Pin yếu, cần sạc gấp.",
    "🪫 Đáy bảng hiện tại: {t} ({p} điểm). Còn thời gian, nhưng không nhiều.",
    "🪫 {t} ở vị trí cuối cùng. Nhìn từ dưới lên, bảng xếp hạng trông thật cao."
  ], en: [
    "🪫 {t} are bottom of the table on {p} points. Battery low, charge urgently.",
    "🪫 Current bottom: {t} ({p} pts). There is time, but not much.",
    "🪫 {t} sit in last place. From down there, the table looks very tall."
  ] },
  topSpots: { tag: 'race', vi: [
    "🎟️ Cuộc chiến giành {n} vị trí dẫn đầu: {list} đang chen chúc nhau.",
    "🎟️ {n} suất tốp đầu, quá nhiều ứng viên: {list}. Sẽ có người phải khóc."
  ], en: [
    "🎟️ The battle for the top {n} spots: {list} are elbowing each other.",
    "🎟️ {n} top spots, too many candidates: {list}. Someone will cry."
  ] },
  clinch: { tag: 'hot', vi: [
    "🔒 Toán học đã lên tiếng: {l} chắc chắn vô địch dù các trận còn lại có ra sao!",
    "🔒 Không ai còn đuổi kịp {l} nữa. Phần còn lại của mùa giải chỉ là thủ tục.",
    "🔒 {l} khóa chức vô địch trước khi giải kết thúc. Mở champagne sớm được rồi!"
  ], en: [
    "🔒 Maths has spoken: {l} are champions whatever happens in the remaining games!",
    "🔒 Nobody can catch {l} any more. The rest of the season is a formality.",
    "🔒 {l} have wrapped up the title early. The champagne can come out now!"
  ] },

  // ================= Predictions =================
  titleOdds: { tag: 'pred', vi: [
    "🔮 Máy tính của PesNews ({h}): {t} vô địch với xác suất {p}.",
    "🔮 PesNews đặt cửa {t} lên ngôi ({p}, {h}). Ai không đồng ý thì ra sân chứng minh!",
    "🔮 Nếu phải đặt cược, PesNews chọn {t}: {p} cơ hội vô địch ({h}).",
    "🔮 Quả cầu pha lê của PesNews hiện lên một cái tên: {t} ({p}, {h}).",
    "🔮 Dữ liệu đã nói: {t} là ứng viên số 1 với {p} cơ hội vô địch ({h})."
  ], en: [
    "🔮 The PesNews computer ({h}): {t} win the title with {p} probability.",
    "🔮 PesNews backs {t} to lift the trophy ({p}, {h}). Disagree? Prove it on the pitch!",
    "🔮 If PesNews had to bet, it would be on {t}: {p} title chance ({h}).",
    "🔮 The PesNews crystal ball shows one name: {t} ({p}, {h}).",
    "🔮 The data has spoken: {t} are favourites with a {p} title chance ({h})."
  ] },
  shared: { tag: 'pred', vi: [
    "🎲 Chưa ai chắc suất: {t} ({p}) và {t2} ({p2}) đang chia nhau cơ hội vô địch.",
    "🎲 Cuộc đua mở toang: {t} {p}, {t2} {p2}. PesNews không dám chắc điều gì.",
    "🎲 {t} ({p}) hay {t2} ({p2})? Tung đồng xu có khi còn chính xác hơn máy tính của PesNews."
  ], en: [
    "🎲 Nothing is settled: {t} ({p}) and {t2} ({p2}) share the title chances.",
    "🎲 Wide open: {t} {p}, {t2} {p2}. PesNews is sure of nothing.",
    "🎲 {t} ({p}) or {t2} ({p2})? A coin toss might beat the PesNews computer."
  ] },
  darkHorse: { tag: 'pred', vi: [
    "🐴 Ngựa ô: {t} có {p} cơ hội vô địch dù Elo chỉ {e}.",
    "🐴 Đừng ngạc nhiên nếu {t} gây sốc — PesNews cho họ {p} cơ hội.",
    "🐴 Elo {e} thôi, nhưng {t} vẫn có {p} cơ hội. Ngựa ô thích chạy đường vòng."
  ], en: [
    "🐴 Dark horse: {t} have a {p} title chance despite an Elo of just {e}.",
    "🐴 Don't be shocked if {t} cause an upset — PesNews gives them {p}.",
    "🐴 Only {e} Elo, yet {t} still have a {p} chance. Dark horses love the long way round."
  ] },
  trustOther: { tag: 'pred', vi: [
    "🤔 {l} đang đứng đầu nhưng PesNews vẫn tin {t} hơn ({p} vs {p2}). Lịch đấu còn dài!",
    "🤔 Bảng xếp hạng nói {l}, máy tính nói {t} ({p} vs {p2}). Ai đúng? Chờ xem."
  ], en: [
    "🤔 {l} lead the table, but PesNews still trusts {t} more ({p} vs {p2}). Plenty of games left!",
    "🤔 The table says {l}, the computer says {t} ({p} vs {p2}). Who is right? Wait and see."
  ] },
  nearlyDone: { tag: 'pred', vi: [
    "🏁 {t} đã đặt một tay lên chiếc cúp: {p} cơ hội vô địch.",
    "🏁 Với {p} cơ hội, {t} chỉ còn cách ngôi vương vài bước chân.",
    "🏁 {p}! Trừ khi có phép màu, chức vô địch sẽ về tay {t}."
  ], en: [
    "🏁 {t} have one hand on the trophy: a {p} title chance.",
    "🏁 With a {p} chance, {t} are a few steps from the crown.",
    "🏁 {p}! Barring a miracle, the title is going to {t}."
  ] },
  bigOut: { tag: 'troll', vi: [
    "💤 {t} có Elo {e} nhưng đã hết cơ hội vô địch. Mùa sau nhé, ông lớn.",
    "💤 Máy tính của PesNews đã gạch tên {t} khỏi cuộc đua vô địch. Elo cao cũng không cứu được."
  ], en: [
    "💤 {t} have {e} Elo but no title chance left. Next season, big guy.",
    "💤 The PesNews computer has crossed {t} off the title race. High Elo could not save them."
  ] },
  topN: { tag: 'pred', vi: [
    "🎯 {t} có {p} cơ hội lọt vào tốp {n}. Nửa ly đầy, nửa ly vơi.",
    "🎯 Tốp {n} trong tầm với của {t}: {p}. Mỗi điểm số từ giờ đều đáng giá vàng."
  ], en: [
    "🎯 {t} have a {p} chance of a top-{n} finish. Glass half full, glass half empty.",
    "🎯 Top {n} is within reach for {t}: {p}. Every point is gold from now on."
  ] },
  relSure: { tag: 'rel', vi: [
    "⚰️ {t} gần như chắc chắn xuống hạng ({p}). Đặt vé tàu chưa?",
    "⚰️ Phép màu cũng khó cứu {t}: {p} khả năng rớt hạng.",
    "⚰️ {t} đã đặt một chân xuống hạng dưới ({p}). Chân còn lại cũng sắp theo."
  ], en: [
    "⚰️ {t} are all but relegated ({p}). Train tickets booked yet?",
    "⚰️ Only a miracle saves {t}: {p} relegation chance.",
    "⚰️ {t} have one foot in the division below ({p}). The other one is following."
  ] },
  relDanger: { tag: 'rel', vi: [
    "⚠️ {t} đang đứng trước nguy cơ rớt hạng: {p}.",
    "🚨 Báo động đỏ cho {t}: {p} khả năng phải xuống chơi giải dưới.",
    "🚨 {t} đang đứng trên miệng hố ({p}). Một cú trượt chân là xong."
  ], en: [
    "⚠️ {t} are in relegation danger: {p}.",
    "🚨 Red alert for {t}: {p} chance of going down.",
    "🚨 {t} are standing at the edge of the pit ({p}). One slip and it is over."
  ] },
  relSecond: { tag: 'rel', vi: [
    "😰 {t} vẫn chưa an toàn ({p} nguy cơ rớt hạng). Đừng vội ăn mừng!",
    "😰 {t} đang nín thở: {p} nguy cơ rớt hạng. Vùng nguy hiểm vẫn còn đó."
  ], en: [
    "😰 {t} are not safe yet ({p} relegation risk). No celebrating yet!",
    "😰 {t} are holding their breath: {p} relegation risk. The danger zone is still there."
  ] },
  yearHunt: { tag: 'pred', vi: [
    "🎯 {t} đã có {k} danh hiệu trong năm nay và đang săn thêm ({p} cơ hội). Tham thế!",
    "🎯 Đã {k} cúp trong năm, {t} vẫn chưa no: {p} cơ hội ăn thêm chiếc nữa."
  ], en: [
    "🎯 {t} already have {k} title(s) this year and are hunting more ({p} chance). Greedy!",
    "🎯 {k} trophies this year and {t} are still hungry: {p} chance of another."
  ] },

  // ================= Knock-out =================
  alive: { tag: 'ko', vi: [
    "🎯 Còn {n} đội trên đường đua: {list}.",
    "🎯 Cuộc chơi thu hẹp lại còn {n} đội: {list}. Ai sẽ là người cuối cùng?",
    "🎯 {n} đội sống sót: {list}. Phần còn lại đã về nhà xem tivi."
  ], en: [
    "🎯 {n} teams left standing: {list}.",
    "🎯 Down to {n}: {list}. Who will be the last one standing?",
    "🎯 {n} survivors: {list}. Everyone else has gone home to watch TV."
  ] },
  fallen: { tag: 'shock', vi: [
    "💔 Cú sốc: {t} — Elo cao thứ {k} giải — đã bị loại{by}!",
    "😵 Ứng viên {t} (Elo thứ {k}) đã phải dừng bước{by}. Ai đoán được chứ?",
    "💔 {t} (Elo thứ {k}) xách vali về sớm{by}. Sân bay hôm nay đông lắm."
  ], en: [
    "💔 Shock: {t} — #{k} by Elo — are out{by}!",
    "😵 Contenders {t} (#{k} by Elo) have been knocked out{by}. Who saw that coming?",
    "💔 {t} (#{k} by Elo) pack their bags early{by}. The airport is busy today."
  ] },
  swissTickets: { tag: 'ko', vi: [
    "🎟️ {n} đội đã có vé playoff: {list}.",
    "🎟️ Vé playoff đã nằm trong túi {n} đội: {list}. Những đội còn lại hãy nhanh tay!"
  ], en: [
    "🎟️ {n} teams have booked a playoff ticket: {list}.",
    "🎟️ {n} teams have a playoff ticket in their pocket: {list}. The rest, hurry up!"
  ] },
  underdogAlive: { tag: 'ko', vi: [
    "🐭 {t} (Elo {e}) là đội yếu nhất còn trụ lại. Chú chuột nhắt vẫn chưa bị bắt!",
    "🐭 Không ai nghĩ {t} đi xa đến thế với Elo {e}. Cổ tích có thật?",
    "🐭 {t} vẫn còn sống với Elo chỉ {e}. Các ông lớn hãy coi chừng!"
  ], en: [
    "🐭 {t} (Elo {e}) are the weakest team still standing. The little mouse has not been caught!",
    "🐭 Nobody expected {t} to go this far with {e} Elo. Do fairy tales exist?",
    "🐭 {t} are still alive with only {e} Elo. Big teams, beware!"
  ] },
  finalPair: { tag: 'hot', vi: [
    "🏟️ Chung kết đã xác định: {a} vs {b}. Một trận, một chiếc cúp, một người hùng.",
    "🏟️ {a} đối đầu {b} ở trận cuối cùng. PesNews đã đặt chỗ ngồi hàng đầu.",
    "🏟️ Hai đội cuối cùng: {a} và {b}. Mọi thứ sẽ được định đoạt ở đây."
  ], en: [
    "🏟️ The final is set: {a} vs {b}. One match, one trophy, one hero.",
    "🏟️ {a} take on {b} in the last match. PesNews has a front-row seat.",
    "🏟️ The last two: {a} and {b}. Everything will be decided here."
  ] },
  deSurvivor: { tag: 'ko', vi: [
    "🧟 {t} đã thua một lần nhưng vẫn sống sót ở nhánh thua. Zombie khó giết lắm!",
    "🧟 Rơi xuống nhánh thua chưa phải là hết: {t} vẫn đang bò lên từng bậc.",
    "🧟 {t} — đội “hồi sinh” của giải. Một mạng đã mất, mạng còn lại cực kỳ lì lợm."
  ], en: [
    "🧟 {t} have lost once but are still alive in the losers' bracket. Zombies are hard to kill!",
    "🧟 Dropping to the losers' bracket is not the end: {t} are still climbing step by step.",
    "🧟 {t} — the comeback kids of the competition. One life gone, the other one is very stubborn."
  ] },
  defendingOut: { tag: 'shock', vi: [
    "👋 Đương kim vô địch {t} đã bị loại! Ngai vàng đang chờ chủ mới.",
    "👋 {t} không thể bảo vệ ngôi vương. Cúp sẽ đổi chủ lần này.",
    "👋 Chấn động: nhà vô địch lần trước {t} đã phải dừng bước."
  ], en: [
    "👋 Holders {t} have been knocked out! The throne awaits a new owner.",
    "👋 {t} cannot defend their crown. The trophy changes hands this time.",
    "👋 Bombshell: last edition's champions {t} are out."
  ] },

  // ================= Match commentary (plain text: careerCommentary) =================
  r_shock: { tag: 'result', vi: [
    "😱 ĐỊA CHẤN! {W} (Elo {eW}) quật ngã {L} (Elo {eL})!",
    "🤯 Không ai tin nổi: {W} hạ {L} dù kém tới {d} điểm Elo!",
    "😱 David hạ Goliath: {W} kém {d} Elo vẫn đánh bại {L}!",
    "🌋 Núi lửa phun trào! {W} khiến {L} (Elo {eL}) bẽ mặt."
  ], en: [
    "😱 SHOCKER! {W} (Elo {eW}) topple {L} (Elo {eL})!",
    "🤯 Unbelievable: {W} beat {L} despite being {d} Elo points behind!",
    "😱 David beats Goliath: {W}, {d} Elo behind, take down {L}!",
    "🌋 Volcano erupts! {W} embarrass {L} (Elo {eL})."
  ] },
  r_sweep: { tag: 'result', vi: [
    "🧹 {W} thắng trắng {L} {s} ở {st}, không cho đối thủ một ván nào!",
    "💪 {W} đánh bại {L} {s} gọn gàng ở {st}.",
    "🧹 {s} tròn trĩnh: {W} tiễn {L} khỏi {st} mà không đổ một giọt mồ hôi."
  ], en: [
    "🧹 {W} sweep {L} {s} in {st} without dropping a single game!",
    "💪 {W} dispatch {L} {s} cleanly in {st}.",
    "🧹 A clean {s}: {W} send {L} out of {st} without breaking a sweat."
  ] },
  r_decider: { tag: 'result', vi: [
    "😮‍💨 {W} vượt qua {L} {s} ở {st} sau ván quyết định!",
    "⚔️ Phải kéo tới ván cuối, {W} mới hạ được {L} {s} ở {st}.",
    "💓 Tim đập chân run: {W} thắng {L} {s} ở {st} sau trận cân não tới phút chót."
  ], en: [
    "😮‍💨 {W} edge past {L} {s} in {st} after a decider!",
    "⚔️ It went the distance before {W} beat {L} {s} in {st}.",
    "💓 Hearts racing: {W} beat {L} {s} in {st} after a battle to the very end."
  ] },
  r_demol: { tag: 'result', vi: [
    "💥 Hủy diệt! {W} vùi dập {L} cách biệt {gd} bàn.",
    "🧹 {W} quét sạch {L} như dọn nhà ngày Tết.",
    "🔨 {W} đè bẹp {L} với cách biệt {gd} bàn. Có ai gọi cứu hộ chưa?",
    "💥 {L} vừa trải qua cơn ác mộng: thua {W} cách biệt {gd} bàn."
  ], en: [
    "💥 Demolition! {W} crush {L} by {gd} goals.",
    "🧹 {W} wipe the floor with {L}.",
    "🔨 {W} flatten {L} by {gd} goals. Has anyone called a tow truck?",
    "💥 {L} just lived a nightmare: beaten by {gd} goals by {W}."
  ] },
  r_fest: { tag: 'result', vi: [
    "🎆 Mưa bàn thắng: {tot} bàn trong một trận!",
    "🍿 {tot} bàn thắng — khán giả được bữa no nê!",
    "🎆 {tot} bàn! Thủ môn hai đội chắc đang đi tìm việc mới."
  ], en: [
    "🎆 Goal fest: {tot} goals in one match!",
    "🍿 {tot} goals — the crowd got their money's worth!",
    "🎆 {tot} goals! Both goalkeepers are probably updating their CVs."
  ] },
  r_wstreak: { tag: 'result', vi: [
    "🔥 {W} đã thắng {n} trận liên tiếp — ai cản nổi?",
    "🚀 {n} trận thắng liền mạch cho {W}!",
    "🔥 {W} đang nóng rực: {n} trận thắng liên tiếp."
  ], en: [
    "🔥 {W} have won {n} in a row — who can stop them?",
    "🚀 {n} straight wins for {W}!",
    "🔥 {W} are on fire: {n} wins in a row."
  ] },
  r_winlessEnd: { tag: 'result', vi: [
    "🌅 {W} cuối cùng cũng biết thắng sau {n} trận!",
    "🌅 Sau {n} trận chờ đợi, {W} lại được nếm vị chiến thắng.",
    "🎈 {W} chấm dứt chuỗi {n} trận không thắng. Mở tiệc được rồi!"
  ], en: [
    "🌅 {W} finally win again after {n} matches!",
    "🌅 After {n} matches of waiting, {W} taste victory again.",
    "🎈 {W} end a {n}-match winless run. Party time!"
  ] },
  r_unbeatenEnd: { tag: 'result', vi: [
    "🛑 {L} chấm dứt chuỗi {n} trận bất bại.",
    "🛑 Chuỗi {n} trận bất bại của {L} đã vỡ vụn.",
    "🛑 Cuộc vui nào cũng có lúc tàn: {L} thua sau {n} trận bất bại."
  ], en: [
    "🛑 {L} see their {n}-match unbeaten run come to an end.",
    "🛑 {L}'s {n}-match unbeaten run is shattered.",
    "🛑 All good things end: {L} lose after {n} unbeaten matches."
  ] },
  r_lstreak: { tag: 'result', vi: [
    "😬 {L} đã thua {n} trận liên tiếp. PesNews đề nghị nghỉ ngơi!",
    "🚑 {L} thua {n} trận liền, gọi xe cấp cứu chưa?",
    "📉 {n} thất bại liên tiếp cho {L}. Đáy vẫn còn sâu hơn?",
    "🧯 {L} thua {n} trận liền — cháy nhà rồi, ai dập lửa đây?"
  ], en: [
    "😬 {L} have lost {n} in a row. PesNews suggests a break!",
    "🚑 {n} straight defeats for {L} — call an ambulance?",
    "📉 {n} defeats in a row for {L}. Is there an even lower floor?",
    "🧯 {L} have lost {n} straight — the house is on fire, who has an extinguisher?"
  ] },
  r_draw: { tag: 'result', vi: [
    "🤝 {H} và {A} bất phân thắng bại.",
    "😐 Hòa! Chia điểm đều nhau, không ai vui hẳn.",
    "🤝 {H} – {A}: hòa cả làng, ai về nhà nấy.",
    "⚖️ {H} và {A} cân bằng tuyệt đối. Cái cân của PesNews không lệch tí nào."
  ], en: [
    "🤝 {H} and {A} cannot be separated.",
    "😐 A draw! Points shared, nobody is really happy.",
    "🤝 {H} – {A}: honours even, everyone goes home.",
    "⚖️ {H} and {A} perfectly balanced. The PesNews scales did not move an inch."
  ] },
  r_nil: { tag: 'result', vi: [
    "😴 0 – 0 giữa {H} và {A}. PesNews ngủ gật hai lần.",
    "😴 {H} và {A} tặng khán giả một trận 0 – 0. Ai hoàn tiền vé đây?",
    "🧱 Hai bức tường {H} và {A} va nhau: 0 – 0."
  ], en: [
    "😴 0 – 0 between {H} and {A}. PesNews dozed off twice.",
    "😴 {H} and {A} treat the crowd to a 0 – 0. Who is refunding the tickets?",
    "🧱 Two walls collide, {H} and {A}: 0 – 0."
  ] },
  r_convincing: { tag: 'result', vi: [
    "👏 {W} thắng thuyết phục trước {L}.",
    "💪 {W} chơi áp đảo, {L} không có cửa.",
    "👏 Chiến thắng không cần bàn cãi của {W} trước {L}."
  ], en: [
    "👏 A convincing win for {W} over {L}.",
    "💪 {W} dominate, {L} had no answer.",
    "👏 An undisputed win for {W} over {L}."
  ] },
  r_narrow: { tag: 'result', vi: [
    "✅ {W} giành chiến thắng sát nút trước {L}.",
    "😅 {W} thắng nghẹt thở, {L} tiếc nuối.",
    "✅ Một bàn là đủ: {W} vượt qua {L}."
  ], en: [
    "✅ {W} edge {L} in a tight one.",
    "😅 {W} win a nail-biter, {L} left ruing their chances.",
    "✅ One goal is enough: {W} get past {L}."
  ] },
  r_revenge: { tag: 'result', vi: [
    "🔁 Báo thù thành công! {W} trả món nợ lần gặp trước với {L}.",
    "🔁 {W} chưa quên trận thua lần trước — và {L} vừa phải trả giá.",
    "🗡️ Ăn miếng trả miếng: {W} phục thù {L}."
  ], en: [
    "🔁 Revenge served! {W} pay {L} back for last time.",
    "🔁 {W} had not forgotten the last defeat — and {L} just paid for it.",
    "🗡️ Tit for tat: {W} get their revenge on {L}."
  ] },
  r_firstWin: { tag: 'result', vi: [
    "🎊 Lần đầu tiên sau {n} lần gặp, {W} mới thắng được {L}!",
    "🎊 Lời nguyền đã bị phá: {W} hạ {L} lần đầu tiên trong lịch sử ({n} lần gặp trước đó).",
    "🎊 Chờ đợi {n} trận, {W} cuối cùng cũng biết cảm giác thắng {L}."
  ], en: [
    "🎊 For the first time in {n} meetings, {W} beat {L}!",
    "🎊 Curse broken: {W} beat {L} for the first time ever ({n} previous meetings).",
    "🎊 {n} meetings of waiting — {W} finally know what beating {L} feels like."
  ] },
  r_peak: { tag: 'result', vi: [
    "🏔️ {W} chạm đỉnh Elo mới của sự nghiệp: {e}!",
    "🏔️ Kỷ lục cá nhân: Elo của {W} lên {e}, cao nhất từ trước tới nay."
  ], en: [
    "🏔️ {W} reach a new career-high Elo: {e}!",
    "🏔️ Personal best: {W}'s Elo climbs to {e}, the highest ever."
  ] },
  r_swing: { tag: 'result', vi: [
    "🎢 Trận đấu rung chuyển bảng Elo: {W} +{x}, {L} −{x}.",
    "🎢 {x} điểm Elo đổi chủ chỉ trong một trận: từ {L} sang {W}."
  ], en: [
    "🎢 An Elo earthquake: {W} +{x}, {L} −{x}.",
    "🎢 {x} Elo points changed hands in one match: from {L} to {W}."
  ] },

  // ================= Season-wide =================
  upset: { tag: 'shock', vi: [
    "😱 Địa chấn của mùa: {w} (Elo {ew}) hạ {l} (Elo {el}) {sc} ở {st}.",
    "🤯 Không ai tin nổi: {w} kém {d} Elo vẫn quật ngã {l} {sc} ({st}).",
    "🌋 Trận động đất lớn nhất mùa: {w} khiến {l} bẽ mặt {sc} ({st}), chênh lệch {d} Elo."
  ], en: [
    "😱 Upset of the season: {w} (Elo {ew}) beat {l} (Elo {el}) {sc} in {st}.",
    "🤯 Nobody believed it: {w}, {d} Elo behind, toppled {l} {sc} ({st}).",
    "🌋 The biggest earthquake of the season: {w} humbled {l} {sc} ({st}) across a {d} Elo gap."
  ] },
  hot: { tag: 'form', vi: [
    "🔥 {t} đã thắng {k} trận liên tiếp. Ai sẽ là người chặn đứng?",
    "🚀 {t} đang bay cao với {k} chiến thắng liền mạch.",
    "🔥 {k} trận thắng liền cho {t}. Nóng như chảo dầu!",
    "🚂 Đoàn tàu {t} không phanh: {k} trận thắng liên tiếp."
  ], en: [
    "🔥 {t} have won {k} in a row. Who will stop them?",
    "🚀 {t} are flying with {k} straight wins.",
    "🔥 {k} wins on the bounce for {t}. Red hot!",
    "🚂 The {t} train has no brakes: {k} straight wins."
  ] },
  bestForm: { tag: 'form', vi: [
    "📈 {t} có phong độ tốt nhất giải: {p}/15 điểm trong 5 trận gần nhất.",
    "📈 5 trận gần nhất, {t} gom {p}/15 điểm. Đang vào guồng!"
  ], en: [
    "📈 {t} are in the best form: {p}/15 points from their last 5.",
    "📈 {p}/15 points from the last 5 for {t}. They are in the groove!"
  ] },
  coldLose: { tag: 'troll', vi: [
    "🚑 {t} thua {k} trận liền. PesNews đề nghị kiểm tra lại tay cầm.",
    "📉 {t} đã thua {k} trận liên tiếp. Có cần gọi bác sĩ tâm lý không?",
    "🧯 {t} thua {k} trận liền — cháy nhà rồi, ai dập lửa đây?",
    "🕳️ {t} rơi tự do: {k} thất bại liên tiếp và chưa thấy đáy."
  ], en: [
    "🚑 {t} have lost {k} in a row. PesNews suggests checking the controller.",
    "📉 {k} straight defeats for {t}. Time to call a sports psychologist?",
    "🧯 {t} have lost {k} straight — the house is on fire!",
    "🕳️ {t} in free fall: {k} straight defeats and no bottom in sight."
  ] },
  coldWinless: { tag: 'troll', vi: [
    "🥶 {t} đã {k} trận không biết thắng. Có ai mang bùa may mắn cho họ không?",
    "🍋 {k} trận chưa biết mùi chiến thắng — {t} chua như chanh.",
    "🥶 {t}: {k} trận, 0 chiến thắng. Mùa đông kéo dài quá."
  ], en: [
    "🥶 {t} are {k} games without a win. Someone bring them a lucky charm?",
    "🍋 {k} games without a win — sour times for {t}.",
    "🥶 {t}: {k} games, 0 wins. A very long winter."
  ] },
  unbeaten: { tag: 'form', vi: [
    "🛡️ {t} bất bại {k} trận liên tiếp. Muốn hạ họ phải có kế hoạch đặc biệt.",
    "🛡️ {k} trận không thua — {t} cứng như bê tông.",
    "🛡️ Lần cuối {t} thua là cách đây {k} trận. Ai còn nhớ không?"
  ], en: [
    "🛡️ {t} are unbeaten in {k}. Beating them takes a special plan.",
    "🛡️ {k} matches without defeat — {t} are solid as concrete.",
    "🛡️ The last time {t} lost was {k} matches ago. Does anyone remember?"
  ] },
  zigzag: { tag: 'form', vi: [
    "🎢 Phong độ của {t} như tàu lượn: {f}. Đoán trận tới? Chịu!",
    "🎢 {t} thắng – thua xen kẽ ({f}). Ổn định trong sự bất ổn."
  ], en: [
    "🎢 {t}'s form is a rollercoaster: {f}. Guess the next one? No idea!",
    "🎢 {t} alternate wins and losses ({f}). Consistently inconsistent."
  ] },
  drawRun: { tag: 'troll', vi: [
    "🤝 {t} hòa {k} trận liên tiếp. Sứ giả hòa bình chính hiệu.",
    "🤝 {k} trận hòa liền cho {t}. Không thắng, không thua, không ai nhớ."
  ], en: [
    "🤝 {t} have drawn {k} in a row. True peace ambassadors.",
    "🤝 {k} straight draws for {t}. No wins, no losses, no memories."
  ] },
  attack: { tag: 'stats', vi: [
    "⚽ Hàng công {t} đã nổ {gf} bàn sau {p} trận ({a}/trận). Thủ môn các đội khác hãy cẩn thận!",
    "⚽ {t} là cỗ máy ghi bàn của mùa: {a} bàn mỗi trận.",
    "⚽ {gf} bàn sau {p} trận — {t} sút như không có ngày mai."
  ], en: [
    "⚽ {t} have scored {gf} in {p} games ({a}/match). Goalkeepers, beware!",
    "⚽ {t} are the goal machine of the season: {a} per match.",
    "⚽ {gf} goals in {p} games — {t} shoot like there is no tomorrow."
  ] },
  leak: { tag: 'troll', vi: [
    "🥅 {t} thủng lưới {ga} bàn sau {p} trận. Lưới khung thành hay lưới đánh cá?",
    "🧀 Hàng thủ {t} như miếng phô mai Thụy Sĩ: {a} bàn thua mỗi trận.",
    "🚪 Cửa nhà {t} mở toang: {a} bàn thua/trận. Ai đó lắp giùm cái khóa!",
    "🕳️ {ga} bàn thua sau {p} trận. Thủ môn {t} có lẽ đang bận chơi điện thoại."
  ], en: [
    "🥅 {t} have conceded {ga} in {p} games. Goal net or fishing net?",
    "🧀 The {t} defence is Swiss cheese: {a} conceded per match.",
    "🚪 The {t} door is wide open: {a} conceded per match. Someone fit a lock!",
    "🕳️ {ga} conceded in {p} games. The {t} keeper is probably busy on his phone."
  ] },
  wall: { tag: 'stats', vi: [
    "🧱 {t} mới để thủng lưới {ga} bàn sau {p} trận — bức tường thực sự.",
    "🧱 Muốn ghi bàn vào lưới {t}? Chúc may mắn: {ga} bàn thua sau {p} trận.",
    "🧱 Hàng thủ thép của {t}: chỉ {ga} bàn thua trong {p} trận."
  ], en: [
    "🧱 {t} have let in only {ga} in {p} games — a real wall.",
    "🧱 Want to score against {t}? Good luck: {ga} conceded in {p} games.",
    "🧱 The steel defence of {t}: only {ga} conceded in {p} games."
  ] },
  blank: { tag: 'troll', vi: [
    "🔇 {t} đã {k} trận tịt ngòi. Tiền đạo đi nghỉ mát rồi à?",
    "🔇 {k} trận không ghi nổi bàn nào — {t} cần gấp một tiền đạo.",
    "🔇 {t} đã quên đường tới khung thành đối phương trong {k} trận."
  ], en: [
    "🔇 {t} have drawn a blank {k} times. Are the strikers on holiday?",
    "🔇 {k} games without a goal — {t} urgently need a striker.",
    "🔇 {t} forgot the way to the opponent's goal in {k} games."
  ] },
  cleanSheets: { tag: 'stats', vi: [
    "🧤 {t} giữ sạch lưới {k} trận — thủ môn xứng đáng được tăng lương.",
    "🧤 {k} trận sạch lưới. Găng tay của thủ môn {t} có bôi keo à?"
  ], en: [
    "🧤 {t} have kept {k} clean sheets — give the keeper a raise.",
    "🧤 {k} clean sheets. Are the {t} keeper's gloves glued?"
  ] },
  drawKing: { tag: 'troll', vi: [
    "🤝 {t} là “vua hòa” với {k} trận hòa. Chia điểm là đam mê.",
    "🤝 {k} trận hòa — {t} đúng là sứ giả hòa bình của giải.",
    "🤝 {t} hòa {k} trận. Không muốn làm ai buồn cả."
  ], en: [
    "🤝 {t} are the draw kings with {k} draws. Sharing is caring.",
    "🤝 {k} draws — {t} are the competition's peace ambassadors.",
    "🤝 {t} have drawn {k} times. They just do not want to upset anyone."
  ] },
  bigWin: { tag: 'stats', vi: [
    "💥 Trận thắng đậm nhất mùa: {h} {sc} {a} ({st}).",
    "💥 Tỉ số khó quên nhất mùa: {h} {sc} {a} ({st}). Có người vẫn chưa ngủ được."
  ], en: [
    "💥 Biggest win of the season: {h} {sc} {a} ({st}).",
    "💥 The most unforgettable score of the season: {h} {sc} {a} ({st}). Someone still cannot sleep."
  ] },
  fest: { tag: 'stats', vi: [
    "🎆 Mưa bàn thắng: {h} {sc} {a} là trận nhiều bàn nhất mùa.",
    "🎆 {h} {sc} {a} — trận cầu mà các thủ môn muốn quên nhất."
  ], en: [
    "🎆 Goal fest: {h} {sc} {a} is the highest-scoring match of the season.",
    "🎆 {h} {sc} {a} — the match goalkeepers most want to forget."
  ] },
  avgGoals: { tag: 'stats', vi: [
    "📊 Mùa này: {g} bàn sau {m} trận, trung bình {a} bàn/trận. {c}",
    "📊 {g} bàn thắng, {m} trận, {a} bàn mỗi trận. {c}"
  ], en: [
    "📊 This season: {g} goals in {m} games, {a} per match. {c}",
    "📊 {g} goals, {m} games, {a} per match. {c}"
  ] },
  avgHi: { tag: 'stats', vi: [
    "Hàng thủ các đội đi đâu hết rồi?",
    "Thủ môn nên đòi tăng lương."
  ], en: [
    "Where did all the defenders go?",
    "Goalkeepers should ask for a raise."
  ] },
  avgLo: { tag: 'stats', vi: [
    "Hơi buồn ngủ một chút...",
    "Trận đấu cần thêm chút muối."
  ], en: [
    "A bit sleepy...",
    "The matches need a pinch of salt."
  ] },
  avgMid: { tag: 'stats', vi: [
    "Vừa đủ để khán giả không ngủ gật.",
    "Mức bàn thắng lý tưởng, PesNews hài lòng."
  ], en: [
    "Just enough to keep the crowd awake.",
    "A healthy goal rate, PesNews approves."
  ] },
  drawShare: { tag: 'troll', vi: [
    "😴 {p} số trận kết thúc hòa — giải đấu của những người yêu hòa bình.",
    "😴 {p} số trận hòa. Ai đó cần dạy các đội cách giành chiến thắng."
  ], en: [
    "😴 {p} of matches ended level — a competition for peace lovers.",
    "😴 {p} of games drawn. Someone needs to teach these teams how to win."
  ] },
  commonScore: { tag: 'stats', vi: [
    "🔢 Tỉ số hay gặp nhất mùa: {sc} ({k} lần). Có vẻ các đội rất thích con số này.",
    "🔢 {sc} xuất hiện {k} lần — tỉ số “quốc dân” của mùa giải."
  ], en: [
    "🔢 Most common score this season: {sc} ({k} times). The teams seem to love it.",
    "🔢 {sc} has happened {k} times — the season's signature scoreline."
  ] },

  // ================= Elo =================
  eloGain: { tag: 'elo', vi: [
    "📈 {t} là đội hưởng lợi nhiều nhất mùa này: {d} Elo.",
    "💰 Cổ phiếu {t} đang tăng trần: {d} Elo chỉ trong mùa này.",
    "📈 {t} bỏ túi {d} Elo. Ngân hàng Elo phải mở thêm két."
  ], en: [
    "📈 {t} are the biggest winners this season: {d} Elo.",
    "💰 {t} stock is soaring: {d} Elo this season alone.",
    "📈 {t} pocket {d} Elo. The Elo bank needs a new vault."
  ] },
  eloDrop: { tag: 'elo', vi: [
    "📉 {t} đã rơi {d} Elo mùa này. Chứng khoán còn đỡ hơn.",
    "📉 {t} mất {d} Elo — PesNews khuyên bán gấp trước khi quá muộn.",
    "📉 Ví Elo của {t} thủng một lỗ to: {d} trong mùa."
  ], en: [
    "📉 {t} have shed {d} Elo this season. Even the stock market is kinder.",
    "📉 {t} are down {d} Elo — PesNews says sell before it is too late.",
    "📉 {t}'s Elo wallet has a big hole: {d} this season."
  ] },
  eloKing: { tag: 'elo', vi: [
    "👑 {t} đang là số 1 bảng Elo toàn thời gian ({e}). Mọi đội đều muốn hạ bệ họ.",
    "👑 Vua Elo {t} ({e}) có mặt ở giải này. Ngai vàng nào cũng lung lay, cẩn thận nhé!",
    "👑 Ai thắng được {t} ({e} Elo) ở giải này sẽ được bơm Elo cực mạnh."
  ], en: [
    "👑 {t} are number 1 on the all-time Elo table ({e}). Everyone wants to dethrone them.",
    "👑 Elo king {t} ({e}) are in this field. Every throne wobbles — careful!",
    "👑 Whoever beats {t} ({e} Elo) here gets a huge Elo boost."
  ] },
  eloBelowBase: { tag: 'elo', vi: [
    "🧊 Elo của {t} chỉ còn {e}, dưới cả mức khởi điểm 1500.",
    "🧊 {t} ({e} Elo) đang sống dưới “mức nghèo Elo”. Cần gấp một chuỗi thắng."
  ], en: [
    "🧊 {t}'s Elo is down to {e}, below the 1500 starting point.",
    "🧊 {t} ({e} Elo) are below the Elo poverty line. A winning run is needed."
  ] },
  eloGapField: { tag: 'elo', vi: [
    "📏 Chênh lệch Elo giữa đội mạnh nhất {a} và yếu nhất {b} là {g}. Cá lớn nuốt cá bé?",
    "📏 Từ {a} tới {b}: khoảng cách {g} điểm Elo. Giải đấu của hai thế giới."
  ], en: [
    "📏 The Elo gap between the strongest {a} and the weakest {b} is {g}. Big fish eat small fish?",
    "📏 From {a} to {b}: {g} Elo apart. A competition of two worlds."
  ] },

  // ================= Previews =================
  bigMatch: { tag: 'preview', vi: [
    "⚔️ Đại chiến {st}: {h} vs {a}. PesNews nghiêng về {f} ({p}), {pk}.{hh}",
    "🍿 Tâm điểm {st}: {h} đụng độ {a}. {f} được đánh giá cao hơn ({p}), {pk}.{hh}",
    "🔭 Trận cầu được chờ đợi nhất {st}: {h} – {a}. Cửa trên: {f} ({p}), {pk}.{hh}",
    "🎬 Bom tấn {st}: {h} gặp {a}. Kịch bản của PesNews: {f} thắng ({p}), {pk}.{hh}"
  ], en: [
    "⚔️ Big match, {st}: {h} vs {a}. PesNews leans towards {f} ({p}), {pk}.{hh}",
    "🍿 Spotlight on {st}: {h} take on {a}. {f} are favourites ({p}), {pk}.{hh}",
    "🔭 The most awaited match of {st}: {h} – {a}. Favourites: {f} ({p}), {pk}.{hh}",
    "🎬 Blockbuster, {st}: {h} meet {a}. The PesNews script: {f} win ({p}), {pk}.{hh}"
  ] },
  curse: { tag: 'preview', vi: [
    "🧿 {d} kém Elo nhưng lại đang thắng {f} {w}-{l} trong đối đầu. Lời nguyền có tiếp diễn?",
    "🧿 {f} mạnh hơn trên giấy, nhưng {d} là “khắc tinh” ({w}-{l}). Cẩn thận!"
  ], en: [
    "🧿 {d} trail on Elo but lead {f} {w}-{l} head-to-head. Will the curse continue?",
    "🧿 {f} are stronger on paper, but {d} are their bogey team ({w}-{l}). Careful!"
  ] },
  oneSided: { tag: 'troll', vi: [
    "🐟 {d} gặp {f}: PesNews cho {d} {p} cơ hội. Mang theo áo mưa nhé!",
    "🙏 {d} chạm trán {f}. PesNews chỉ biết chúc {d} may mắn ({p}).",
    "🐟 Cá con {d} bơi vào bể cá mập {f}. Cơ hội sống sót: {p}."
  ], en: [
    "🐟 {d} face {f}: PesNews gives {d} a {p} chance. Bring a raincoat!",
    "🙏 {d} meet {f}. All PesNews can say is good luck, {d} ({p}).",
    "🐟 Little fish {d} swim into the {f} shark tank. Survival chance: {p}."
  ] },
  coinFlip: { tag: 'preview', vi: [
    "🎲 {h} vs {a} là kèo 50-50 đúng nghĩa. PesNews... xin phép không đoán!",
    "⚖️ {h} – {a}: hai bên ngang tài ngang sức, {pk}.",
    "🎲 {h} hay {a}? Máy tính của PesNews vừa bốc khói khi tính trận này."
  ], en: [
    "🎲 {h} vs {a} is a true coin flip. PesNews... would rather not guess!",
    "⚖️ {h} – {a}: evenly matched, {pk}.",
    "🎲 {h} or {a}? The PesNews computer started smoking on this one."
  ] },
  firstMeet: { tag: 'preview', vi: [
    "🆕 {h} và {a} chưa từng gặp nhau. Lần đầu tiên luôn đáng nhớ!",
    "🆕 Cuộc chạm trán lịch sử: {h} lần đầu đối đầu {a}.",
    "🆕 Không có dữ liệu đối đầu giữa {h} và {a}. PesNews sẽ viết trang đầu tiên."
  ], en: [
    "🆕 {h} and {a} have never met. The first time is always memorable!",
    "🆕 A historic first: {h} face {a} for the first time.",
    "🆕 No head-to-head data between {h} and {a}. PesNews will write page one."
  ] },
  classic: { tag: 'h2h', vi: [
    "🏛️ Kinh điển trở lại: {h} vs {a} sau {n} lần gặp (đối đầu {w}-{d}-{l}).",
    "🏛️ {n} lần gặp nhau, {w}-{d}-{l}. {h} và {a} lại sắp viết thêm chương mới.",
    "🏛️ Cặp đấu lâu đời: {h} – {a} ({n} trận, {w}-{d}-{l}). Không ai muốn thua trận này."
  ], en: [
    "🏛️ The classic is back: {h} vs {a} after {n} meetings (head-to-head {w}-{d}-{l}).",
    "🏛️ {n} meetings, {w}-{d}-{l}. {h} and {a} are about to write a new chapter.",
    "🏛️ An old rivalry: {h} – {a} ({n} games, {w}-{d}-{l}). Nobody wants to lose this one."
  ] },
  streakLine: { tag: 'preview', vi: [
    "🔥 {t} mang chuỗi {k} trận thắng vào trận gặp {o}. Chuỗi sẽ dài thêm hay đứt?",
    "🔥 {o} có nhiệm vụ chặn đứng chuỗi {k} trận thắng của {t}.",
    "🔥 Chuỗi {k} trận thắng của {t} sắp bị {o} thử thách."
  ], en: [
    "🔥 {t} bring a {k}-match winning run into the game against {o}. Longer or broken?",
    "🔥 {o} are tasked with stopping {t}'s {k}-match winning run.",
    "🔥 {t}'s {k}-match winning run is about to be tested by {o}."
  ] },
  revengeChance: { tag: 'preview', vi: [
    "🗡️ Lần trước {t} thua {o} {sc}. Lần này có phục thù không?",
    "🗡️ {t} chưa quên trận thua {sc} trước {o}. Cơ hội trả nợ đã tới.",
    "🗡️ Món nợ {sc} với {o} — {t} sắp được đi đòi."
  ], en: [
    "🗡️ Last time {t} lost {sc} to {o}. Revenge this time?",
    "🗡️ {t} have not forgotten the {sc} defeat to {o}. Payback time is here.",
    "🗡️ The {sc} debt to {o} — {t} are about to collect."
  ] },

  // ================= Milestones =================
  mileMatches: { tag: 'mile', vi: [
    "🎖️ {t} chỉ còn {k} trận nữa là cán mốc {m} trận sự nghiệp.",
    "🎖️ Sắp tới mốc {m} trận: {t} còn thiếu {k}. Bánh kem đã đặt chưa?"
  ], en: [
    "🎖️ {t} are {k} match(es) away from {m} career games.",
    "🎖️ {m} games coming up: {t} need {k} more. Cake ordered?"
  ] },
  milePeak: { tag: 'mile', vi: [
    "🏔️ {t} đang ở đỉnh cao Elo sự nghiệp ({e}). Đừng nhìn xuống!",
    "🏔️ Chưa bao giờ {t} mạnh như lúc này: Elo {e}, cao nhất sự nghiệp."
  ], en: [
    "🏔️ {t} are at their career-high Elo ({e}). Don't look down!",
    "🏔️ {t} have never been stronger: {e} Elo, a career high."
  ] },
  mileWins: { tag: 'mile', vi: [
    "🏅 {t} còn {k} trận thắng nữa là chạm mốc {m} chiến thắng sự nghiệp.",
    "🏅 Mốc {m} trận thắng đang chờ {t} — chỉ còn {k}."
  ], en: [
    "🏅 {t} are {k} win(s) away from {m} career wins.",
    "🏅 The {m}-win milestone awaits {t} — just {k} to go."
  ] },
  mileGoals: { tag: 'mile', vi: [
    "⚽ {t} còn {k} bàn nữa là cán mốc {m} bàn thắng sự nghiệp.",
    "⚽ Bàn thắng thứ {m} của {t} đang tới gần: còn thiếu {k}."
  ], en: [
    "⚽ {t} are {k} goal(s) away from {m} career goals.",
    "⚽ {t}'s goal number {m} is coming: {k} to go."
  ] },
  mileSeasons: { tag: 'mile', vi: [
    "🗓️ Đây là giải đấu thứ {k} của {t}. Lão làng thứ thiệt!",
    "🗓️ {t} đã góp mặt ở {k} giải đấu. Câu lạc bộ không thể thiếu họ."
  ], en: [
    "🗓️ This is competition number {k} for {t}. A true veteran!",
    "🗓️ {t} have played in {k} competitions. The club would not be the same without them."
  ] },

  // ================= Career spotlight (each team's whole history) =================
  pNemesis: { tag: 'profile', vi: [
    "😈 {x} chính là “khắc tinh” của {n}: thua {xl} trận, chỉ thắng {xw}.",
    "😈 Cứ gặp {x} là {n} run tay: {xw} thắng – {xl} thua.",
    "😈 Ác mộng của {n} có tên {x}: {xl} thất bại trong đối đầu."
  ], en: [
    "😈 {x} are the nemesis of {n}: {xl} losses, only {xw} wins.",
    "😈 {n}'s hands shake against {x}: {xw} wins – {xl} losses.",
    "😈 {n}'s nightmare is called {x}: {xl} head-to-head defeats."
  ] },
  pNeverBeat: { tag: 'profile', vi: [
    "🙈 {n} chưa từng thắng {x} sau {xp} lần gặp nhau.",
    "🙈 {xp} lần gặp {x}, 0 chiến thắng. {n} ơi, bao giờ mới phá dớp?",
    "🙈 Với {n}, {x} là bức tường không thể vượt qua: {xp} trận, chưa thắng lần nào."
  ], en: [
    "🙈 {n} have never beaten {x} in {xp} meetings.",
    "🙈 {xp} meetings with {x}, 0 wins. When will {n} break the spell?",
    "🙈 For {n}, {x} are an unclimbable wall: {xp} games, never a win."
  ] },
  pWorstLoss: { tag: 'profile', vi: [
    "💀 Ký ức kinh hoàng: {n} thua {x} {sc} ở {s} ({st}).",
    "💀 {n} vẫn gặp ác mộng về trận thua {sc} trước {x} ({s}).",
    "💀 Trang đen tối nhất lịch sử {n}: {sc} trước {x} ở {s}."
  ], en: [
    "💀 Nightmare memory: {n} lost {sc} to {x} in {s} ({st}).",
    "💀 {n} still have nightmares about the {sc} defeat to {x} ({s}).",
    "💀 The darkest page in {n}'s history: {sc} against {x} in {s}."
  ] },
  pBestWin: { tag: 'profile', vi: [
    "🌈 Đêm đẹp nhất của {n}: thắng {x} {sc} ở {s}.",
    "🌈 {n} vẫn hay kể về trận thắng {x} {sc} ({s}). Kể mãi không chán."
  ], en: [
    "🌈 {n}'s finest night: beating {x} {sc} in {s}.",
    "🌈 {n} still love telling the story of beating {x} {sc} ({s}). Never gets old."
  ] },
  pPeakDrop: { tag: 'profile', vi: [
    "📉 {n} đã tụt {k} điểm Elo so với đỉnh cao {pk}.",
    "📉 Thời hoàng kim của {n} là Elo {pk}; giờ đã kém {k} điểm.",
    "📉 {n} đang trượt dốc: −{k} Elo so với đỉnh {pk}. Hoàng hôn của một ngôi sao?"
  ], en: [
    "📉 {n} have dropped {k} Elo points from their peak of {pk}.",
    "📉 {n}'s golden days were {pk} Elo; now {k} points lower.",
    "📉 {n} are sliding: −{k} Elo from a peak of {pk}. The sunset of a star?"
  ] },
  pLowWin: { tag: 'profile', vi: [
    "🪙 Tỉ lệ thắng của {n} chỉ {k}% — tung đồng xu còn tốt hơn.",
    "🪙 {k}% số trận thắng. {n} thua nhiều tới mức PesNews hết từ để chọc.",
    "🪙 {n} thắng {k}% số trận. Mục tiêu năm nay: chạm mốc 50%?"
  ], en: [
    "🪙 {n} win only {k}% of their matches — a coin toss would do better.",
    "🪙 A {k}% win rate. {n} lose so often that PesNews is running out of jokes.",
    "🪙 {n} win {k}% of their matches. This year's target: 50%?"
  ] },
  pWinRateHigh: { tag: 'profile', vi: [
    "📈 {n} thắng {k}% số trận trong sự nghiệp. Đẳng cấp là mãi mãi.",
    "📈 Tỉ lệ thắng {k}% — {n} là nỗi sợ của mọi đối thủ."
  ], en: [
    "📈 {n} win {k}% of their career matches. Class is permanent.",
    "📈 A {k}% win rate — {n} are every opponent's fear."
  ] },
  pLeaky: { tag: 'profile', vi: [
    "🥅 Hàng thủ {n} thủng trung bình {k} bàn/trận trong sự nghiệp — lưới khung thành hay lưới đánh cá?",
    "🥅 {k} bàn thua mỗi trận là “đặc sản” của {n} qua nhiều mùa.",
    "🥅 Cả sự nghiệp {n} để thủng {k} bàn/trận. Hậu vệ chắc chỉ để trang trí."
  ], en: [
    "🥅 The {n} defence leaks {k} goals per match over their career — goal net or fishing net?",
    "🥅 {k} conceded per match is {n}'s speciality across seasons.",
    "🥅 {n} concede {k} per match over their career. The defenders are decorative."
  ] },
  pKoChoke: { tag: 'profile', vi: [
    "🫣 {n} chỉ thắng {k} loạt đấu loại trực tiếp. Cứ trận quyết định là run tay?",
    "🫣 Vòng bảng là hổ, loại trực tiếp là mèo: {n} thắng {k} loạt knock-out.",
    "🫣 {k} loạt knock-out thắng. Áp lực là kẻ thù số 1 của {n}."
  ], en: [
    "🫣 {n} have won only {k} knock-out ties. Shaky hands when it matters?",
    "🫣 Tiger in the groups, kitten in the knock-outs: {n} have won {k} ties.",
    "🫣 {k} knock-out ties won. Pressure is {n}'s number 1 enemy."
  ] },
  pKoKing: { tag: 'profile', vi: [
    "🎯 {n} là chuyên gia knock-out: thắng {k} loạt loại trực tiếp.",
    "🎯 Trận càng lớn {n} càng hay: {k} loạt knock-out thắng."
  ], en: [
    "🎯 {n} are knock-out specialists: {k} ties won.",
    "🎯 The bigger the match, the better {n} get: {k} knock-out ties won."
  ] },
  pNoGold: { tag: 'profile', vi: [
    "🏆❌ {k} trận mà chưa có nổi một chiếc cúp vàng. Tủ kính vẫn đang chờ, {n} ơi!",
    "🏆❌ {n} đã đá {k} trận, số cúp vàng: 0. Tủ kính phủ bụi rồi.",
    "🏆❌ {k} trận, bao mồ hôi, chưa một danh hiệu vàng. {n} vẫn kiên nhẫn chờ."
  ], en: [
    "🏆❌ {k} matches and still no gold trophy. The cabinet is still waiting, {n}!",
    "🏆❌ {n} have played {k} matches, gold trophies: 0. The cabinet is gathering dust.",
    "🏆❌ {k} matches, lots of sweat, not one gold. {n} keep waiting patiently."
  ] },
  pThrone: { tag: 'profile', vi: [
    "👑 {n} đang số 1 Elo. Ngai vàng nào cũng lung lay, cẩn thận nhé!",
    "👑 Đỉnh bảng Elo hiện thuộc về {n}. Ai sẽ là người kéo họ xuống?",
    "👑 {n} ngồi trên ngai Elo số 1 — và cả câu lạc bộ đang nhắm vào họ."
  ], en: [
    "👑 {n} are Elo number 1. Every throne wobbles — careful!",
    "👑 The top of the Elo table belongs to {n}. Who will pull them down?",
    "👑 {n} sit on the Elo throne — and the whole club is aiming at them."
  ] },
  pVictim: { tag: 'profile', vi: [
    "🎯 {x} là “con mồi” quen thuộc của {n}: {k} lần bị hạ.",
    "🎯 Gặp {x} là {n} lại có điểm: {k} chiến thắng trong đối đầu.",
    "🎯 {n} “bắt nạt” {x} với {k} trận thắng. {x} chắc không muốn nghe tên {n}."
  ], en: [
    "🎯 {x} are {n}'s favourite prey: beaten {k} times.",
    "🎯 Meeting {x} means points for {n}: {k} head-to-head wins.",
    "🎯 {n} own {x} with {k} wins. {x} probably hate hearing {n}'s name."
  ] },
  pCabinet: { tag: 'profile', vi: [
    "🏆 Tủ kính của {n}: {g} vàng, {s} bạc, {b} đồng. Đáng nể!",
    "🏆 {n} mang theo bộ sưu tập {g}🥇 {s}🥈 {b}🥉 vào giải. Kinh nghiệm là có thật.",
    "🏆 Với {g} cúp vàng, {n} biết rõ cảm giác đứng trên đỉnh."
  ], en: [
    "🏆 {n}'s cabinet: {g} gold, {s} silver, {b} bronze. Impressive!",
    "🏆 {n} bring a {g}🥇 {s}🥈 {b}🥉 collection into this competition. Experience is real.",
    "🏆 With {g} gold trophies, {n} know exactly how the top feels."
  ] },
  pBestStreak: { tag: 'profile', vi: [
    "📜 Kỷ lục của {n}: từng thắng {k} trận liên tiếp. Liệu có lặp lại?",
    "📜 Chuỗi thắng dài nhất sự nghiệp {n} là {k} trận. Ký ức đẹp."
  ], en: [
    "📜 {n}'s record: {k} wins in a row. Can they do it again?",
    "📜 {n}'s longest career winning run is {k} matches. Good memories."
  ] },
  pVeteran: { tag: 'profile', vi: [
    "🎖️ {n} đã đá {k} trận trong sự nghiệp. Có gì trên đời mà họ chưa thấy?",
    "🎖️ {k} trận sự nghiệp — {n} là một phần lịch sử của câu lạc bộ."
  ], en: [
    "🎖️ {n} have played {k} career matches. Is there anything they have not seen?",
    "🎖️ {k} career matches — {n} are part of the club's history."
  ] },
  pRookie: { tag: 'profile', vi: [
    "🐣 {n} mới có {k} trận trong sự nghiệp. Tân binh cần thời gian.",
    "🐣 {k} trận sự nghiệp thôi — {n} vẫn đang học việc."
  ], en: [
    "🐣 {n} have only {k} career matches. Rookies need time.",
    "🐣 Just {k} career matches — {n} are still learning the trade."
  ] },
  pLastSeason: { tag: 'profile', vi: [
    "🔙 Ở {s}, {n} kết thúc với thành tích: {pl}.",
    "🔙 Lần gần nhất, ở {s}, {n} đạt {pl}. Lần này sẽ tốt hơn hay tệ hơn?",
    "🔙 {n} bước vào giải với ký ức từ {s}: {pl}."
  ], en: [
    "🔙 In {s}, {n} finished: {pl}.",
    "🔙 Last time out, in {s}, {n} reached {pl}. Better or worse this time?",
    "🔙 {n} come in with memories of {s}: {pl}."
  ] },

  // ================= Rivalries inside this season's field =================
  hRivalry: { tag: 'h2h', vi: [
    "⚔️ Cặp đấu nhiều duyên nợ nhất giải: {a} vs {b}, {n} lần gặp ({w}-{d}-{l}).",
    "⚔️ {a} và {b} đã gặp nhau {n} lần. Ai cũng thuộc lòng lối chơi của nhau.",
    "⚔️ Kình địch truyền kiếp {a} – {b}: {n} trận, {w}-{d}-{l}."
  ], en: [
    "⚔️ The rivalry with the most history: {a} vs {b}, {n} meetings ({w}-{d}-{l}).",
    "⚔️ {a} and {b} have met {n} times. They know each other by heart.",
    "⚔️ Eternal rivals {a} – {b}: {n} games, {w}-{d}-{l}."
  ] },
  hLopsided: { tag: 'h2h', vi: [
    "📊 Đối đầu một chiều: {a} thắng {b} {w} lần, chỉ thua {l}.",
    "📊 {b} gặp {a} là gặp hạn: {l} thắng – {w} thua.",
    "📊 {a} vs {b} chẳng khác gì mèo vờn chuột: {w}-{l}."
  ], en: [
    "📊 One-way traffic: {a} have beaten {b} {w} times and lost only {l}.",
    "📊 Meeting {a} is bad luck for {b}: {l} wins – {w} losses.",
    "📊 {a} vs {b} is cat and mouse: {w}-{l}."
  ] },
  hEven: { tag: 'h2h', vi: [
    "⚖️ {a} và {b} bằng nhau về số trận thắng sau {n} lần gặp. Kỳ phùng địch thủ!",
    "⚖️ {n} lần gặp, cân bằng tuyệt đối: {a} – {b} vẫn chưa phân thắng bại."
  ], en: [
    "⚖️ {a} and {b} are level on wins after {n} meetings. Perfectly matched!",
    "⚖️ {n} meetings, perfectly balanced: {a} – {b} still undecided."
  ] },

  // ================= History of this competition (same name, other years) =================
  hsEditions: { tag: 'hist', vi: [
    "📚 {s} là lần tổ chức thứ {k} của giải đấu này.",
    "📚 Giải đấu này đã bước sang lần thứ {k}. Truyền thống đang được viết tiếp."
  ], en: [
    "📚 {s} is edition number {k} of this competition.",
    "📚 This competition reaches edition number {k}. The tradition continues."
  ] },
  hsFirst: { tag: 'hist', vi: [
    "🆕 {s} là lần đầu tiên giải đấu này được tổ chức. Nhà vô địch sẽ đi vào lịch sử!",
    "🆕 Lần đầu tiên! Ai thắng {s} sẽ là cái tên đầu tiên trên bảng vàng."
  ], en: [
    "🆕 {s} is the first edition of this competition. The champion makes history!",
    "🆕 A first! Whoever wins {s} is the first name on the honours board."
  ] },
  hsKing: { tag: 'hist', vi: [
    "📚 {t} là đội vô địch giải này nhiều nhất: {k} lần.",
    "📚 Lịch sử đứng về phía {t}: {k} lần vô địch giải đấu này.",
    "📚 {k} danh hiệu ở giải này — {t} là ông vua không ngai... à không, có ngai hẳn hoi."
  ], en: [
    "📚 {t} have won this competition the most: {k} times.",
    "📚 History is on {t}'s side: {k} titles in this competition.",
    "📚 {k} titles in this competition — {t} are the uncrowned... no, very much crowned kings."
  ] },
  hsAbsent: { tag: 'hist', vi: [
    "👻 Nhà vô địch lần trước {t} vắng mặt lần này. Ngai vàng bỏ trống!",
    "👻 Không có {t} — đương kim vô địch — ở giải năm nay. Cơ hội cho tất cả."
  ], en: [
    "👻 Last edition's champions {t} are absent. The throne is vacant!",
    "👻 No {t} — the holders — this time. A chance for everyone."
  ] },
  hsNoRepeat: { tag: 'hist', vi: [
    "🎲 Sau {k} lần tổ chức, chưa đội nào vô địch giải này hai lần. Lời nguyền có tiếp diễn?",
    "🎲 {k} lần tổ chức, {k} nhà vô địch khác nhau. Giải đấu không có chủ."
  ], en: [
    "🎲 After {k} editions, no team has won this competition twice. Will the curse go on?",
    "🎲 {k} editions, {k} different champions. A competition with no master."
  ] },

  // ================= Outlook =================
  fRemaining: { tag: 'future', vi: [
    "⏳ Còn {k} trận nữa là hạ màn. Mọi thứ vẫn có thể xảy ra.",
    "⏳ {k} trận còn lại — đủ để làm nên lịch sử hoặc thảm họa."
  ], en: [
    "⏳ {k} matches left before the curtain falls. Anything can still happen.",
    "⏳ {k} matches left — enough for history or disaster."
  ] },
  fClinchNext: { tag: 'future', vi: [
    "🔓 {l} có thể khóa chức vô địch ngay trận tới nếu thắng.",
    "🔓 Một chiến thắng nữa thôi là {l} được nâng cúp. Chuẩn bị pháo hoa!"
  ], en: [
    "🔓 {l} could wrap up the title with a win in their next match.",
    "🔓 One more win and {l} lift the trophy. Get the fireworks ready!"
  ] },
  fFinalGuess: { tag: 'future', vi: [
    "🔮 Chung kết trong mơ theo máy tính của PesNews: {a} vs {b}.",
    "🔮 PesNews đoán trận cuối sẽ là {a} – {b}. Ai muốn cá không?",
    "🔮 Nếu Elo nói đúng, {a} và {b} sẽ gặp nhau ở trận cuối cùng."
  ], en: [
    "🔮 The PesNews computer's dream final: {a} vs {b}.",
    "🔮 PesNews predicts the last match will be {a} – {b}. Anyone want to bet?",
    "🔮 If Elo is right, {a} and {b} will meet in the final match."
  ] },

  // ================= Club sidelines =================
  clubMatches: { tag: 'fun', vi: [
    "🗂️ Kho lưu trữ của PesNews đã ghi lại {k} trận đấu trong lịch sử câu lạc bộ.",
    "🗂️ {k} trận đấu và vẫn đang đếm. PesNews cần ổ cứng lớn hơn."
  ], en: [
    "🗂️ The PesNews archive has recorded {k} matches in club history.",
    "🗂️ {k} matches and counting. PesNews needs a bigger hard drive."
  ] },
  clubGoals: { tag: 'fun', vi: [
    "⚽ Tổng cộng {k} bàn thắng đã được ghi trong lịch sử câu lạc bộ. Thủ môn nào cũng có phần.",
    "⚽ {k} bàn thắng toàn thời gian — đủ để thả bóng bay kín một sân vận động."
  ], en: [
    "⚽ A total of {k} goals have been scored in club history. Every goalkeeper has a share.",
    "⚽ {k} all-time goals — enough to fill a stadium with balloons."
  ] },
  fieldAvg: { tag: 'fun', vi: [
    "🏋️ Elo trung bình hiện tại của các đội ở giải này là {e}, xếp thứ {r}/{n} trong các giải của câu lạc bộ.",
    "🏋️ Xét theo Elo hiện tại, đây là giải mạnh thứ {r}/{n} của câu lạc bộ (trung bình {e})."
  ], en: [
    "🏋️ The current average Elo of this field is {e}, #{r} of {n} competitions in the club.",
    "🏋️ By current Elo, this is the club's #{r} strongest competition out of {n} (average {e})."
  ] },

  // ================= Rumours & quotes =================
  rumor: { tag: 'rumor', vi: [
    "🤫 Nguồn tin giấu tên: {t} đã luyện tập lén suốt 3 đêm liền.",
    "👀 Có người thấy {t} xem lại băng hình đối thủ tới 2 giờ sáng.",
    "☕ {t} được cho là đã đổi sang tay cầm mới. Có phải vì phong độ gần đây?",
    "🍀 Tin đồn: {t} mang bùa may mắn vào phòng thi đấu.",
    "📱 {t} đang “thả thính” chiến thuật mới trên nhóm chat. Đối thủ hãy cẩn thận!",
    "🕵️ PesNews nghe phong thanh {t} đang bí mật học chiến thuật mới trên YouTube.",
    "😴 Rộ tin {t} thức khuya chơi game khác trước ngày thi đấu. Huấn luyện viên đâu?",
    "🍜 Nguồn tin giấu tên: {t} ăn mì tôm cả tuần để dồn tiền mua tay cầm mới.",
    "🧦 {t} được cho là đi đôi tất may mắn suốt mùa giải — chưa giặt lần nào.",
    "📞 Có tin {t} gọi điện cho thầy phong thủy để xoay lại hướng ghế ngồi.",
    "🎧 {t} luyện tập bằng nhạc thiền và tiếng mưa rơi. Hiệu quả? Bảng xếp hạng sẽ trả lời.",
    "🐓 Tin đồn: {t} dậy từ 5 giờ sáng để nghiên cứu đối thủ.",
    "🎮 Nghe nói {t} đã thay 3 tay cầm trong mùa này. Tay cầm không có lỗi!",
    "🕯️ {t} bị bắt gặp thắp nến cầu may trước trận đấu lớn."
  ], en: [
    "🤫 Anonymous source: {t} have been training in secret for 3 nights straight.",
    "👀 {t} were spotted watching opponent footage until 2 a.m.",
    "☕ Word is {t} switched to a new controller. Is that why their form changed?",
    "🍀 Rumour: {t} bring a lucky charm into the match room.",
    "📱 {t} are teasing a new tactic in the group chat. Opponents, beware!",
    "🕵️ PesNews hears {t} are secretly learning new tactics on YouTube.",
    "😴 Reports say {t} stayed up late playing other games before match day. Where is the coach?",
    "🍜 Anonymous source: {t} ate instant noodles all week to afford a new controller.",
    "🧦 {t} reportedly wear the same lucky socks all season — never washed.",
    "📞 Word is {t} called a feng shui master to rotate their chair.",
    "🎧 {t} train to meditation music and rain sounds. Effective? The table will tell.",
    "🐓 Rumour: {t} wake up at 5 a.m. to study their opponents.",
    "🎮 Apparently {t} have gone through 3 controllers this season. It is not the controller's fault!",
    "🕯️ {t} were spotted lighting a lucky candle before a big match."
  ] },
  qLeader: { tag: 'quote', vi: [
    "🎤 {t}: “Chúng tôi chỉ tập trung từng trận một.” (Câu nói kinh điển của mọi đội dẫn đầu.)",
    "🎤 {t} trả lời phỏng vấn: “Áp lực ư? Áp lực là của các đội phía sau.”",
    "🎤 {t}: “Cúp đã được đặt chỗ, chỉ chờ khắc tên.” Tự tin hay tự mãn?",
    "🎤 {t} tuyên bố: “Mục tiêu duy nhất là vô địch.” PesNews đã ghi âm làm bằng chứng."
  ], en: [
    "🎤 {t}: “We are just taking it one game at a time.” (The classic line of every leader.)",
    "🎤 {t} tell reporters: “Pressure? Pressure belongs to the teams behind us.”",
    "🎤 {t}: “The trophy is reserved, it just needs engraving.” Confident or complacent?",
    "🎤 {t} declare: “The only goal is the title.” PesNews has it on tape."
  ] },
  qStruggler: { tag: 'quote', vi: [
    "🎤 {t}: “Chúng tôi thiếu may mắn, thiếu trọng tài, và... tay cầm hôm nay hơi lag.”",
    "🎤 {t} họp báo: “Mùa giải còn dài.” (Câu nói quen thuộc của những đội đang khủng hoảng.)",
    "🎤 {t}: “Chúng tôi chơi hay hơn đối thủ, chỉ là họ ghi nhiều bàn hơn.”",
    "🎤 {t} hứa hẹn: “Trận tới sẽ khác.” PesNews đã nghe câu này vài lần rồi."
  ], en: [
    "🎤 {t}: “We lacked luck, a fair referee and... the controller was laggy today.”",
    "🎤 {t} at the press conference: “The season is long.” (The favourite line of teams in crisis.)",
    "🎤 {t}: “We played better than them, they just scored more goals.”",
    "🎤 {t} promise: “The next match will be different.” PesNews has heard that a few times."
  ] },
  qTeo: { tag: 'quote', vi: [
    "📰 PesNews tự nhủ: “Dữ liệu không biết nói dối, nhưng bóng đá thì có.”",
    "📰 Lời khuyên của PesNews: thắng trận thì khoe, thua trận thì đổ cho tay cầm.",
    "📰 PesNews đã chạy hàng trăm kịch bản mô phỏng. Kết luận: bóng tròn, ai cũng có cơ hội."
  ], en: [
    "📰 PesNews muses: “Data never lies, but football does.”",
    "📰 PesNews advice: brag after wins, blame the controller after losses.",
    "📰 PesNews ran hundreds of simulations. Conclusion: the ball is round, everyone has a chance."
  ] }
};

// One sentence of situation `id` in the current language, placeholders filled from v.
function snLine(id, v, rng) {
  var b = SN_BANK[id];
  if (!b) return '';
  var arr = CR_EN ? b.en : b.vi;
  return careerFill(arr[Math.floor((rng ? rng() : Math.random()) * arr.length)], v || {});
}
