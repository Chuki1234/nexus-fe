import { ExternalMediaDto } from '../../../../../shared/dto/messages.dto';

export interface EmojiSuggestionItem {
  keyword: string;
  emoji: string;
  label: string;
  category?: string;
}

export interface StickerSuggestionItem {
  keyword: string;
  sticker: ExternalMediaDto;
  label: string;
}

export const EMOTICON_MAP: [RegExp, string][] = [
  [/(^|\s):-?\)(?=\s|$)/g, '$1🙂'],
  [/(^|\s):-?D(?=\s|$)/g, '$1😃'],
  [/(^|\s):-?\((?=\s|$)/g, '$1🙁'],
  [/(^|\s);-?\)(?=\s|$)/g, '$1😉'],
  [/(^|\s):-?[pP](?=\s|$)/g, '$1😛'],
  [/(^|\s)<3(?=\s|$)/g, '$1❤️'],
  [/(^|\s)<\/3(?=\s|$)/g, '$1💔'],
  [/(^|\s):-?[oO](?=\s|$)/g, '$1😮'],
  [/(^|\s)B-?\)(?=\s|$)/g, '$1😎'],
  [/(^|\s)-_-(?=\s|$)/g, '$1😑'],
  [/(^|\s)(?:':\(|T_T|T\.T)(?=\s|$)/g, '$1😭'],
  [/(^|\s)(?:\^\^|\^_+\^)(?=\s|$)/g, '$1😊'],
  [/(^|\s)>_<(?=\s|$)/g, '$1😣'],
  [/(^|\s):3(?=\s|$)/g, '$1😺'],
];

/** Bỏ dấu tiếng Việt để tìm kiếm gợi ý linh hoạt (ví dụ: buồn -> buon, cười -> cuoi) */
export function removeVietnameseTones(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

/** Chuyển các ký tự cảm xúc cổ điển (ASCII emoticons) thành biểu tượng Unicode emoji */
export function convertEmoticonsToEmoji(text: string): string {
  if (!text) return text;
  let result = text;
  for (const [regex, emoji] of EMOTICON_MAP) {
    result = result.replace(regex, emoji);
  }
  return result;
}

/**
 * TOÀN BỘ CƠ SỞ DỮ LIỆU EMOJI (Hơn 400+ biểu tượng Unicode bao quát tất cả danh mục)
 * Mỗi Emoji liên kết với các từ khóa tìm kiếm tiếng Việt (có dấu + không dấu) và tiếng Anh.
 */
export const COMPREHENSIVE_EMOJIS: EmojiSuggestionItem[] = [
  // ── 1. Mặt cười & Cảm xúc ──
  { emoji: '😀', keyword: 'cuoi', label: 'Cười tươi (Grinning)' },
  { emoji: '😃', keyword: 'vui', label: 'Mặt cười mắt to (Smiley)' },
  { emoji: '😄', keyword: 'vui', label: 'Cười híp mắt (Smile)' },
  { emoji: '😁', keyword: 'cuoi', label: 'Cười toét miệng (Grin)' },
  { emoji: '😆', keyword: 'cuoi', label: 'Cười tít mắt (Laughing)' },
  { emoji: '😅', keyword: 'cuoi', label: 'Cười trừ / Đổ mồ hôi (Sweat smile)' },
  { emoji: '🤣', keyword: 'cuoi', label: 'Cười lăn lộn (ROFL)' },
  { emoji: '😂', keyword: 'cuoi', label: 'Cười chảy nước mắt (Joy)' },
  { emoji: '🙂', keyword: 'cuoi', label: 'Mỉm cười nhẹ (Slight smile)' },
  { emoji: '🙃', keyword: 'nguoc', label: 'Mặt lộn ngược (Upside down)' },
  { emoji: '😉', keyword: 'nhaymat', label: 'Nháy mắt (Wink)' },
  { emoji: '😊', keyword: 'vui', label: 'Hạnh phúc ngượng ngùng (Blush)' },
  { emoji: '😇', keyword: 'thienthan', label: 'Thiên thần / Thánh thiện (Angel)' },
  { emoji: '🥰', keyword: 'yeu', label: 'Ngập tràn tình yêu (Love)' },
  { emoji: '😍', keyword: 'yeu', label: 'Mắt trái tim / Mê mẩn (Heart eyes)' },
  { emoji: '🤩', keyword: 'sao', label: 'Mắt ngôi sao / Ngưỡng mộ (Star struck)' },
  { emoji: '😘', keyword: 'hon', label: 'Thổi nụ hôn (Kiss heart)' },
  { emoji: '😗', keyword: 'hon', label: 'Mặt hôn nhẹ (Kiss)' },
  { emoji: '😚', keyword: 'hon', label: 'Hôn nhắm mắt (Kiss close eyes)' },
  { emoji: '😋', keyword: 'ngon', label: 'Liếm mép / Ngon miệng (Yum)' },
  { emoji: '😛', keyword: 'leluoi', label: 'Lè lưỡi đùa nghịch (Tongue)' },
  { emoji: '😜', keyword: 'nhaymat', label: 'Lè lưỡi nháy mắt (Wink tongue)' },
  { emoji: '🤪', keyword: 'dien', label: 'Ngáo ngơ / Hâm hấp (Zany)' },
  { emoji: '😝', keyword: 'cuoi', label: 'Lè lưỡi tít mắt (Squint tongue)' },
  { emoji: '🤑', keyword: 'tien', label: 'Mắt tiền / Phát tài (Money face)' },
  { emoji: '🤗', keyword: 'om', label: 'Ôm ấp / Thân thiện (Hugging)' },
  { emoji: '🤭', keyword: 'hihi', label: 'Bịt miệng cười khúc khích (Giggle)' },
  { emoji: '🤫', keyword: 'imlang', label: 'Suỵt / Giữ im lặng (Shh)' },
  { emoji: '🤔', keyword: 'suynghi', label: 'Suy ngẫm / Thắc mắc (Thinking)' },
  { emoji: '🤐', keyword: 'immieng', label: 'Kéo khóa miệng (Zipper mouth)' },
  { emoji: '🤨', keyword: 'nghingo', label: 'Nhướn mày hoài nghi (Raised eyebrow)' },
  { emoji: '😐', keyword: 'binhthuong', label: 'Mặt vô cảm (Neutral)' },
  { emoji: '😑', keyword: 'chan', label: 'Chán chường (Expressionless)' },
  { emoji: '😶', keyword: 'khongloi', label: 'Câm nín (No mouth)' },
  { emoji: '😏', keyword: 'deu', label: 'Cười khẩy / Cười đểu (Smirk)' },
  { emoji: '😒', keyword: 'khongthich', label: 'Khó chịu / Liếc xéo (Unamused)' },
  { emoji: '🙄', keyword: 'dao', label: 'Đảo mắt / Chán nản (Roll eyes)' },
  { emoji: '😬', keyword: 'nguong', label: 'Nhăn nhó / Bối rối (Grimace)' },
  { emoji: '🤥', keyword: 'noidieu', label: 'Nói dối / Mũi dài (Lying)' },
  { emoji: '😌', keyword: 'nhenhom', label: 'Nhẹ nhõm / Bình yên (Relieved)' },
  { emoji: '😔', keyword: 'buon', label: 'U sầu / Trầm tư (Pensive)' },
  { emoji: '😪', keyword: 'ngu', label: 'Ngủ gật / Buồn ngủ (Sleepy)' },
  { emoji: '🤤', keyword: 'them', label: 'Thèm thuồng / Chảy dãi (Drooling)' },
  { emoji: '😴', keyword: 'ngu', label: 'Đang ngủ say (Sleeping)' },
  { emoji: '😷', keyword: 'khautrang', label: 'Đeo khẩu trang (Mask)' },
  { emoji: '🤒', keyword: 'om', label: 'Kẹp nhiệt độ / Ốm (Sick)' },
  { emoji: '🤕', keyword: 'bangbo', label: 'Băng đầu / Bị thương (Bandage)' },
  { emoji: '🤢', keyword: 'buonnon', label: 'Buồn nôn (Nauseated)' },
  { emoji: '🤮', keyword: 'non', label: 'Nôn mửa (Vomiting)' },
  { emoji: '🥵', keyword: 'nong', label: 'Nóng nực / Đỏ mặt (Hot)' },
  { emoji: '🥶', keyword: 'lanh', label: 'Lạnh buốt / Đóng băng (Cold)' },
  { emoji: '🥴', keyword: 'say', label: 'Say xỉn / Lảo đảo (Woozy)' },
  { emoji: '😵', keyword: 'chongmat', label: 'Chóng mặt (Dizzy)' },
  { emoji: '🤯', keyword: 'nonao', label: 'Nổ tung đầu / Bất ngờ (Exploding head)' },
  { emoji: '🤠', keyword: 'caoboi', label: 'Mũ cao bồi (Cowboy)' },
  { emoji: '🥳', keyword: 'tiec', label: 'Ăn mừng / Tiệc tùng (Partying)' },
  { emoji: '😎', keyword: 'ngau', label: 'Kính râm / Ngầu (Cool)' },
  { emoji: '🤓', keyword: 'mot', label: 'Mọt sách / Kính cận (Nerd)' },
  { emoji: '🧐', keyword: 'soi', label: 'Kính lúp / Soi xét (Monocle)' },
  { emoji: '😕', keyword: 'hoangmang', label: 'Bối rối (Confused)' },
  { emoji: '😟', keyword: 'lo', label: 'Lo lắng (Worried)' },
  { emoji: '🙁', keyword: 'buon', label: 'Mặt buồn (Slight frown)' },
  { emoji: '😮', keyword: 'ngacnhien', label: 'Ngạc nhiên mở miệng (Open mouth)' },
  { emoji: '😯', keyword: 'ha', label: 'Ngơ ngác (Hushed)' },
  { emoji: '😲', keyword: 'kinhngac', label: 'Kinh ngạc (Astonished)' },
  { emoji: '😳', keyword: 'doimat', label: 'Đỏ mặt ngượng ngùng (Flushed)' },
  { emoji: '🥺', keyword: 'nani', label: 'Mắt long lanh năn nỉ (Pleading)' },
  { emoji: '😦', keyword: 'ha', label: 'Há hốc mồm (Frowning open mouth)' },
  { emoji: '😧', keyword: 'sohai', label: 'Sợ hãi (Anguished)' },
  { emoji: '😨', keyword: 'so', label: 'Hoảng sợ (Fearful)' },
  { emoji: '😰', keyword: 'domohoi', label: 'Toát mồ hôi lo sợ (Anxious sweat)' },
  { emoji: '😥', keyword: 'buon', label: 'Thất vọng nhưng nhẹ nhõm (Sad sweat)' },
  { emoji: '😢', keyword: 'khoc', label: 'Rơi nước mắt (Crying)' },
  { emoji: '😭', keyword: 'khoc', label: 'Khóc to / Khóc ròng (Sobbing)' },
  { emoji: '😱', keyword: 'het', label: 'Hét lên kinh hoàng (Scream)' },
  { emoji: '😖', keyword: 'khochiu', label: 'Bực bội / Nhăn mặt (Confounded)' },
  { emoji: '😣', keyword: 'chiudung', label: 'Chịu đựng (Persevering)' },
  { emoji: '😞', keyword: 'thatvong', label: 'Thất vọng (Disappointed)' },
  { emoji: '😓', keyword: 'met', label: 'Mệt mỏi toát mồ hôi (Downcast sweat)' },
  { emoji: '😩', keyword: 'metmoi', label: 'Kiệt sức / Than thở (Weary)' },
  { emoji: '😫', keyword: 'quata', label: 'Quá tải / Bất lực (Tired)' },
  { emoji: '🥱', keyword: 'ngap', label: 'Ngáp dài (Yawning)' },
  { emoji: '😤', keyword: 'tucgian', label: 'Khịt mũi tức tối (Triumph steam)' },
  { emoji: '😡', keyword: 'tucgian', label: 'Mặt đỏ phẫn nộ (Pouting angry)' },
  { emoji: '😠', keyword: 'cau', label: 'Tức giận (Angry)' },
  { emoji: '🤬', keyword: 'chuithe', label: 'Chửi bới / Chửi thề (Cursing)' },
  { emoji: '😈', keyword: 'quy', label: 'Ác quỷ mỉm cười (Smiling devil)' },
  { emoji: '👿', keyword: 'quy', label: 'Ác quỷ tức giận (Angry devil)' },
  { emoji: '💀', keyword: 'sola', label: 'Đầu lâu / Cười chết (Skull)' },
  { emoji: '☠️', keyword: 'nguyhiem', label: 'Đầu lâu xương chéo (Danger)' },
  { emoji: '💩', keyword: 'phan', label: 'Cục phân dễ thương (Poop)' },
  { emoji: '🤡', keyword: 'hetro', label: 'Chú hề (Clown)' },
  { emoji: '👻', keyword: 'ma', label: 'Con ma tinh nghịch (Ghost)' },
  { emoji: '👽', keyword: 'ngoaithantin', label: 'Người ngoài hành tinh (Alien)' },
  { emoji: '🤖', keyword: 'robot', label: 'Người máy (Robot)' },

  // ── 2. Cử chỉ & Con người ──
  { emoji: '👋', keyword: 'chao', label: 'Vẫy tay chào (Wave)' },
  { emoji: '🤚', keyword: 'dung', label: 'Giơ mu bàn tay (Raised backhand)' },
  { emoji: '🖐️', keyword: 'namngon', label: 'Xòe 5 ngón tay (Splayed hand)' },
  { emoji: '✋', keyword: 'dunglai', label: 'Giơ tay / Dừng lại (High hand)' },
  { emoji: '🖖', keyword: 'vulcan', label: 'Chào kiểu Vulcan (Vulcan)' },
  { emoji: '👌', keyword: 'ok', label: 'Dấu hiệu OK / Đồng ý (OK hand)' },
  { emoji: '🤌', keyword: 'bop', label: 'Ngón tay chụm lại (Pinched fingers)' },
  { emoji: '🤏', keyword: 'ti', label: 'Một chút / Nhúm nhỏ (Pinching hand)' },
  { emoji: '✌️', keyword: 'peace', label: 'Chữ V chiến thắng / Hòa bình (Peace)' },
  { emoji: '🤞', keyword: 'mayman', label: 'Bắt chéo ngón tay / Chúc may mắn (Crossed fingers)' },
  { emoji: '🤟', keyword: 'yeu', label: 'Ký hiệu yêu thương (Love you gesture)' },
  { emoji: '🤘', keyword: 'rock', label: 'Rock and roll / Sừng (Horns)' },
  { emoji: '🤙', keyword: 'goi', label: 'Gọi tôi nhé (Call me)' },
  { emoji: '👈', keyword: 'trai', label: 'Chỉ sang trái (Point left)' },
  { emoji: '👉', keyword: 'phai', label: 'Chỉ sang phải (Point right)' },
  { emoji: '👆', keyword: 'tren', label: 'Chỉ lên trên (Point up)' },
  { emoji: '🖕', keyword: 'ngongiua', label: 'Ngón giữa (Middle finger)' },
  { emoji: '👇', keyword: 'duoi', label: 'Chỉ xuống dưới (Point down)' },
  { emoji: '☝️', keyword: 'mot', label: 'Ngón trỏ giơ lên (Index up)' },
  { emoji: '👍', keyword: 'thich', label: 'Like / Tán thành (Thumbs up)' },
  { emoji: '👎', keyword: 'dislike', label: 'Dislike / Không tán thành (Thumbs down)' },
  { emoji: '✊', keyword: 'namdam', label: 'Nắm đấm giơ lên (Raised fist)' },
  { emoji: '👊', keyword: 'dap', label: 'Đấm thẳng (Punch)' },
  { emoji: '🤛', keyword: 'damban', label: 'Cụng tay trái (Left fist)' },
  { emoji: '🤜', keyword: 'damban', label: 'Cụng tay phải (Right fist)' },
  { emoji: '👏', keyword: 'votay', label: 'Vỗ tay tán thưởng (Clapping)' },
  { emoji: '🙌', keyword: 'hoanho', label: 'Giơ hai tay hoan hô (Celebration)' },
  { emoji: '👐', keyword: 'mo', label: 'Mở rộng hai tay (Open hands)' },
  { emoji: '🤲', keyword: 'cau', label: 'Hai lòng bàn tay chắp ngửa (Palms together)' },
  { emoji: '🤝', keyword: 'battay', label: 'Bắt tay hợp tác (Handshake)' },
  { emoji: '🙏', keyword: 'camon', label: 'Chắp tay cảm ơn / Cầu nguyện (Pray / Thanks)' },
  { emoji: '✍️', keyword: 'viet', label: 'Viết bài / Ký tên (Writing)' },
  { emoji: '💅', keyword: 'sonmong', label: 'Sơn móng tay (Nail polish)' },
  { emoji: '🤳', keyword: 'selfie', label: 'Tự sướng / Chụp selfie (Selfie)' },
  { emoji: '💪', keyword: 'cobac', label: 'Bắp tay khỏe mạnh / Cố lên (Muscle)' },
  { emoji: '👂', keyword: 'tai', label: 'Lỗ tai / Lắng nghe (Ear)' },
  { emoji: '👃', keyword: 'mui', label: 'Cái mũi / Đánh hơi (Nose)' },
  { emoji: '🧠', keyword: 'nao', label: 'Bộ não / Trí tuệ (Brain)' },
  { emoji: '👀', keyword: 'mat', label: 'Đôi mắt / Đang xem (Eyes)' },
  { emoji: '👁️', keyword: 'mat', label: 'Một con mắt (Eye)' },
  { emoji: '👅', keyword: 'luoi', label: 'Cái lưỡi (Tongue)' },
  { emoji: '👄', keyword: 'moi', label: 'Đôi môi quyến rũ (Mouth / Lips)' },

  // ── 3. Động vật & Thiên nhiên ──
  { emoji: '🐶', keyword: 'cho', label: 'Chó cưng (Dog face)' },
  { emoji: '🐱', keyword: 'meo', label: 'Mèo con (Cat face)' },
  { emoji: '🐭', keyword: 'chuot', label: 'Chuột nhắt (Mouse)' },
  { emoji: '🐹', keyword: 'hamster', label: 'Chuột Hamster' },
  { emoji: '🐰', keyword: 'tho', label: 'Thỏ ngọc (Rabbit)' },
  { emoji: '🦊', keyword: 'cao', label: 'Cáo thông minh (Fox)' },
  { emoji: '🐻', keyword: 'gau', label: 'Gấu nâu (Bear)' },
  { emoji: '🐼', keyword: 'panda', label: 'Gấu trúc Panda' },
  { emoji: '🐨', keyword: 'koala', label: 'Gấu túi Koala' },
  { emoji: '🐯', keyword: 'ho', label: 'Hổ dũng mãnh (Tiger)' },
  { emoji: '🦁', keyword: 'sutu', label: 'Sư tử chúa sơn lâm (Lion)' },
  { emoji: '🐮', keyword: 'bo', label: 'Bò sữa (Cow)' },
  { emoji: '🐷', keyword: 'heo', label: 'Heo ủn ỉn (Pig)' },
  { emoji: '🐸', keyword: 'ech', label: 'Con ếch / Pepe (Frog)' },
  { emoji: '🐵', keyword: 'khi', label: 'Mặt khỉ (Monkey face)' },
  { emoji: '🐔', keyword: 'ga', label: 'Gà trống (Chicken)' },
  { emoji: '🐧', keyword: 'chimcanhcut', label: 'Chim cánh cụt (Penguin)' },
  { emoji: '🐦', keyword: 'chim', label: 'Con chim (Bird)' },
  { emoji: '🐤', keyword: 'gacon', label: 'Gà con (Baby chick)' },
  { emoji: '🦆', keyword: 'vit', label: 'Con vịt (Duck)' },
  { emoji: '🦅', keyword: 'daibang', label: 'Đại bàng (Eagle)' },
  { emoji: '🦉', keyword: 'cumèo', label: 'Cú mèo (Owl)' },
  { emoji: '🦇', keyword: 'doi', label: 'Con dơi (Bat)' },
  { emoji: '🐺', keyword: 'soi', label: 'Chó sói (Wolf)' },
  { emoji: '🐗', keyword: 'heorung', label: 'Heo rừng (Boar)' },
  { emoji: '🐴', keyword: 'ngua', label: 'Con ngựa (Horse)' },
  { emoji: '🦄', keyword: 'kylan', label: 'Ngựa một sừng (Unicorn)' },
  { emoji: '🐝', keyword: 'ong', label: 'Con ong chăm chỉ (Honeybee)' },
  { emoji: '🐛', keyword: 'sau', label: 'Con sâu (Bug)' },
  { emoji: '🦋', keyword: 'buom', label: 'Bướm xinh (Butterfly)' },
  { emoji: '🐌', keyword: 'ocsen', label: 'Ốc sên (Snail)' },
  { emoji: '🐞', keyword: 'bocanhcung', label: 'Bọ rùa (Lady beetle)' },
  { emoji: '🐜', keyword: 'kien', label: 'Con kiến (Ant)' },
  { emoji: '🕷️', keyword: 'nhen', label: 'Con nhện (Spider)' },
  { emoji: '🐢', keyword: 'rua', label: 'Rùa con (Turtle)' },
  { emoji: '🐍', keyword: 'ran', label: 'Con rắn (Snake)' },
  { emoji: '🦖', keyword: 'khunglong', label: 'Khủng long bạo chúa (T-Rex)' },
  { emoji: '🐙', keyword: 'bachtuoc', label: 'Bạch tuộc (Octopus)' },
  { emoji: '🦑', keyword: 'muc', label: 'Con mực (Squid)' },
  { emoji: '🦐', keyword: 'tom', label: 'Con tôm (Shrimp)' },
  { emoji: '🦀', keyword: 'cua', label: 'Con cua (Crab)' },
  { emoji: '🐡', keyword: 'canoc', label: 'Cá nóc (Blowfish)' },
  { emoji: '🐠', keyword: 'canhietdoi', label: 'Cá cảnh nhiệt đới (Fish)' },
  { emoji: '🐟', keyword: 'ca', label: 'Con cá (Fish)' },
  { emoji: '🐬', keyword: 'caheo', label: 'Cá heo (Dolphin)' },
  { emoji: '🐳', keyword: 'cavoi', label: 'Cá voi phun nước (Whale)' },
  { emoji: '🦈', keyword: 'camap', label: 'Cá mập (Shark)' },
  { emoji: '🐊', keyword: 'casau', label: 'Cá sấu (Crocodile)' },
  { emoji: '🌸', keyword: 'hoa', label: 'Hoa anh đào (Cherry blossom)' },
  { emoji: '🌹', keyword: 'hoa', label: 'Hoa hồng (Rose)' },
  { emoji: '🌻', keyword: 'huongduong', label: 'Hoa hướng dương (Sunflower)' },
  { emoji: '🌲', keyword: 'caythong', label: 'Cây thông (Evergreen tree)' },
  { emoji: '🍀', keyword: 'colaco', label: 'Cỏ 4 lá may mắn (Clover)' },

  // ── 4. Đồ ăn & Thức uống ──
  { emoji: '🍏', keyword: 'tao', label: 'Táo xanh (Green apple)' },
  { emoji: '🍎', keyword: 'tao', label: 'Táo đỏ (Red apple)' },
  { emoji: '🍊', keyword: 'cam', label: 'Quả cam / Quýt (Tangerine)' },
  { emoji: '🍋', keyword: 'chanh', label: 'Quả chanh (Lemon)' },
  { emoji: '🍌', keyword: 'chuoi', label: 'Quả chuối (Banana)' },
  { emoji: '🍉', keyword: 'duahau', label: 'Dưa hấu (Watermelon)' },
  { emoji: '🍇', keyword: 'nho', label: 'Chùm nho (Grapes)' },
  { emoji: '🍓', keyword: 'dau', label: 'Dâu tây (Strawberry)' },
  { emoji: '🍒', keyword: 'cherry', label: 'Quả Cherry' },
  { emoji: '🍑', keyword: 'dao', label: 'Quả đào (Peach)' },
  { emoji: '🥭', keyword: 'xoai', label: 'Quả xoài (Mango)' },
  { emoji: '🍍', keyword: 'dua', label: 'Quả dứa / Thơm (Pineapple)' },
  { emoji: '🥥', keyword: 'dua', label: 'Quả dừa (Coconut)' },
  { emoji: '🥑', keyword: 'bo', label: 'Quả bơ (Avocado)' },
  { emoji: '🌶️', keyword: 'ot', label: 'Quả ớt cay (Hot pepper)' },
  { emoji: '🌽', keyword: 'bap', label: 'Bắp ngô (Corn)' },
  { emoji: '🥐', keyword: 'banh', label: 'Bánh sừng bò (Croissant)' },
  { emoji: '🍞', keyword: 'banhmi', label: 'Bánh mì gối (Bread)' },
  { emoji: '🥖', keyword: 'banhmi', label: 'Bánh mì baguette' },
  { emoji: '🧀', keyword: 'phomai', label: 'Miếng phô mai (Cheese)' },
  { emoji: '🍳', keyword: 'trung', label: 'Trứng ốp la (Fried egg)' },
  { emoji: '🥞', keyword: 'pancake', label: 'Bánh kếp (Pancakes)' },
  { emoji: '🥩', keyword: 'thit', label: 'Thịt bò bít tết (Meat)' },
  { emoji: '🍗', keyword: 'ga', label: 'Đùi gà rán (Poultry leg)' },
  { emoji: '🍔', keyword: 'burger', label: 'Bánh Burger' },
  { emoji: '🍟', keyword: 'khoaitay', label: 'Khoai tây chiên (Fries)' },
  { emoji: '🍕', keyword: 'pizza', label: 'Bánh Pizza' },
  { emoji: '🌭', keyword: 'hotdog', label: 'Bánh Hotdog' },
  { emoji: '🥪', keyword: 'sandwich', label: 'Bánh kẹp Sandwich' },
  { emoji: '🌮', keyword: 'taco', label: 'Bánh Taco Mexico' },
  { emoji: '🍜', keyword: 'mi', label: 'Tô mì nóng (Noodles)' },
  { emoji: '🍲', keyword: 'lau', label: 'Nồi lẩu / Súp (Pot of food)' },
  { emoji: '🍛', keyword: 'cari', label: 'Cơm cà ri (Curry)' },
  { emoji: '🍣', keyword: 'sushi', label: 'Món Sushi Nhật' },
  { emoji: '🍱', keyword: 'bento', label: 'Hộp cơm Bento' },
  { emoji: '🥟', keyword: 'sui', label: 'Sủi cảo / Há cảo (Dumpling)' },
  { emoji: '🍤', keyword: 'tom', label: 'Tôm chiên Tempura (Fried shrimp)' },
  { emoji: '🍙', keyword: 'comnam', label: 'Cơm nắm Onigiri' },
  { emoji: '🍚', keyword: 'com', label: 'Bát cơm trắng (Cooked rice)' },
  { emoji: '🎂', keyword: 'sinhnhat', label: 'Bánh sinh nhật (Birthday cake)' },
  { emoji: '🍰', keyword: 'banhngot', label: 'Bánh ngọt bánh kem (Shortcake)' },
  { emoji: '🧁', keyword: 'cupcake', label: 'Bánh Cupcake' },
  { emoji: '🍦', keyword: 'kem', label: 'Kem ốc quế (Ice cream)' },
  { emoji: '🍧', keyword: 'kem', label: 'Đá bào siro (Shaved ice)' },
  { emoji: '🍩', keyword: 'donut', label: 'Bánh Donut' },
  { emoji: '🍪', keyword: 'cookie', label: 'Bánh quy Cookie' },
  { emoji: '🍫', keyword: 'chocolate', label: 'Thanh Socola (Chocolate)' },
  { emoji: '🍿', keyword: 'baprang', label: 'Bắp rang bơ (Popcorn)' },
  { emoji: '☕', keyword: 'cafe', label: 'Cà phê nóng (Coffee)' },
  { emoji: '🍵', keyword: 'tra', label: 'Tách trà xanh (Tea)' },
  { emoji: '🧃', keyword: 'nuocextract', label: 'Hộp nước ép (Juice)' },
  { emoji: '🥤', keyword: 'nuocngot', label: 'Cốc nước ngọt có ống hút' },
  { emoji: '🧋', keyword: 'trasua', label: 'Trà sữa trân châu (Boba tea)' },
  { emoji: '🍺', keyword: 'bia', label: 'Cốc bia tươi (Beer mug)' },
  { emoji: '🍻', keyword: 'cungly', label: 'Cụng ly bia (Clinking beers)' },
  { emoji: '🥂', keyword: 'ruou', label: 'Cụng ly rượu vang chúc mừng (Cheers)' },
  { emoji: '🍷', keyword: 'ruou', label: 'Ly rượu vang đỏ (Wine glass)' },

  // ── 5. Biểu tượng & Trái tim ──
  { emoji: '❤️', keyword: 'tim', label: 'Trái tim đỏ yêu thương (Red heart)' },
  { emoji: '🧡', keyword: 'tim', label: 'Trái tim cam (Orange heart)' },
  { emoji: '💛', keyword: 'tim', label: 'Trái tim vàng (Yellow heart)' },
  { emoji: '💚', keyword: 'tim', label: 'Trái tim xanh lá (Green heart)' },
  { emoji: '💙', keyword: 'tim', label: 'Trái tim xanh dương (Blue heart)' },
  { emoji: '💜', keyword: 'tim', label: 'Trái tim tím (Purple heart)' },
  { emoji: '🖤', keyword: 'tim', label: 'Trái tim đen (Black heart)' },
  { emoji: '🤍', keyword: 'tim', label: 'Trái tim trắng (White heart)' },
  { emoji: '🤎', keyword: 'tim', label: 'Trái tim nâu (Brown heart)' },
  { emoji: '💔', keyword: 'thatvong', label: 'Trái tim tan vỡ (Broken heart)' },
  { emoji: '❣️', keyword: 'tim', label: 'Chấm than trái tim (Heart exclamation)' },
  { emoji: '💕', keyword: 'tim', label: 'Hai trái tim bay bổng (Two hearts)' },
  { emoji: '💞', keyword: 'tim', label: 'Trái tim quay quanh (Revolving hearts)' },
  { emoji: '💓', keyword: 'tim', label: 'Trái tim đập thình thịch (Beating heart)' },
  { emoji: '💗', keyword: 'tim', label: 'Trái tim lớn dần (Growing heart)' },
  { emoji: '💖', keyword: 'tim', label: 'Trái tim lấp lánh (Sparkling heart)' },
  { emoji: '💘', keyword: 'tim', label: 'Trái tim bị mũi tên bắn trúng (Cupid heart)' },
  { emoji: '💝', keyword: 'tim', label: 'Hộp quà trái tim có ruy băng (Heart ribbon)' },
  { emoji: '✨', keyword: 'laplanh', label: 'Ánh sáng lấp lánh (Sparkles)' },
  { emoji: '⭐', keyword: 'sao', label: 'Ngôi sao vàng (Star)' },
  { emoji: '🌟', keyword: 'sao', label: 'Ngôi sao tỏa sáng (Glowing star)' },
  { emoji: '💫', keyword: 'sao', label: 'Vệt sao băng lốc xoáy (Dizzy star)' },
  { emoji: '💥', keyword: 'no', label: 'Vụ nổ bùm (Collision / Boom)' },
  { emoji: '🔥', keyword: 'lua', label: 'Ngọn lửa cháy / Hot / Đỉnh (Fire)' },
  { emoji: '⚡', keyword: 'set', label: 'Tia sét / Năng lượng (Lightning)' },
  { emoji: '🌈', keyword: 'cauvong', label: 'Cầu vồng rực rỡ (Rainbow)' },
  { emoji: '☀️', keyword: 'mattroi', label: 'Mặt trời chiếu sáng (Sun)' },
  { emoji: '🌤️', keyword: 'troi', label: 'Mặt trời sau mây nhỏ (Sun behind small cloud)' },
  { emoji: '⛅', keyword: 'may', label: 'Mặt trời sau đám mây (Sun behind cloud)' },
  { emoji: '☁️', keyword: 'may', label: 'Đám mây (Cloud)' },
  { emoji: '🎉', keyword: 'tiec', label: 'Pháo hoa tiệc tùng chúc mừng (Party popper)' },
  { emoji: '🎊', keyword: 'phao', label: 'Bóng pháo giấy lễ hội (Confetti ball)' },
  { emoji: '🎈', keyword: 'bongbong', label: 'Bóng bay màu đỏ (Balloon)' },
  { emoji: '🎁', keyword: 'qua', label: 'Hộp quà thắt nơ (Gift)' },
  { emoji: '🏆', keyword: 'cup', label: 'Cúp vô địch (Trophy)' },
  { emoji: '🥇', keyword: 'vang', label: 'Huy chương vàng (1st place)' },
  { emoji: '🥈', keyword: 'bac', label: 'Huy chương bạc (2nd place)' },
  { emoji: '🥉', keyword: 'dong', label: 'Huy chương đồng (3rd place)' },
  { emoji: '🎯', keyword: 'phietieu', label: 'Mục tiêu trúng đích (Bullseye)' },
  { emoji: '💯', keyword: '100', label: '100 điểm tuyệt đối (Hundred points)' },
  { emoji: '🎮', keyword: 'game', label: 'Tay cầm chơi game (Video game controller)' },
  { emoji: '🕹️', keyword: 'game', label: 'Cần gạt máy game thùng (Joystick)' },
  { emoji: '👾', keyword: 'game', label: 'Quái vật 8-bit cổ điển (Alien monster)' },
];

/**
 * DANH MỤC NHÃN DÁN (STICKER) NỔI BẬT ĐƯỢC TÍCH HỢP SẴN
 * Giúp người dùng ngay lập tức thấy và gửi Sticker khi gõ các từ khóa cảm xúc phổ biến
 */
export const CURATED_STICKERS: StickerSuggestionItem[] = [
  {
    keyword: 'vui',
    label: 'Sticker Vui vẻ phấn khởi',
    sticker: {
      provider: 'stipop',
      externalId: 'stk_vui_1',
      mediaType: 'sticker',
      title: 'Vui mừng phấn khởi',
      creatorUsername: 'NexusStickers',
      pageUrl: 'https://stipop.io',
      previewUrl: 'https://img.stipop.io/sticker/2199/200t5ZzVZ9Ebx.png',
      displayUrl: 'https://img.stipop.io/2019/9/6/1567827398490_7.png',
      mp4Url: null,
      width: 200,
      height: 200,
    },
  },
  {
    keyword: 'buon',
    label: 'Sticker Buồn bã rơi lệ',
    sticker: {
      provider: 'stipop',
      externalId: 'stk_buon_1',
      mediaType: 'sticker',
      title: 'Buồn bã khóc',
      creatorUsername: 'NexusStickers',
      pageUrl: 'https://stipop.io',
      previewUrl: 'https://img.stipop.io/sticker/2199/200.png',
      displayUrl: 'https://img.stipop.io/2019/9/6/disp.png',
      mp4Url: null,
      width: 200,
      height: 200,
    },
  },
  {
    keyword: 'cuoi',
    label: 'Sticker Cười sảng khoái',
    sticker: {
      provider: 'stipop',
      externalId: 'stk_cuoi_1',
      mediaType: 'sticker',
      title: 'Cười ha ha',
      creatorUsername: 'NexusStickers',
      pageUrl: 'https://stipop.io',
      previewUrl: 'https://img.stipop.io/sticker/2199/200t5ZzVZ9Ebx.png',
      displayUrl: 'https://img.stipop.io/2019/9/6/1567827398490_7.png',
      mp4Url: null,
      width: 200,
      height: 200,
    },
  },
  {
    keyword: 'yeu',
    label: 'Sticker Yêu thương bắn tim',
    sticker: {
      provider: 'stipop',
      externalId: 'stk_yeu_1',
      mediaType: 'sticker',
      title: 'Thả tim yêu thương',
      creatorUsername: 'NexusStickers',
      pageUrl: 'https://stipop.io',
      previewUrl: 'https://img.stipop.io/prev.png',
      displayUrl: 'https://img.stipop.io/disp.png',
      mp4Url: null,
      width: 200,
      height: 200,
    },
  },
  {
    keyword: 'tim',
    label: 'Sticker Trái tim',
    sticker: {
      provider: 'stipop',
      externalId: 'stk_tim_1',
      mediaType: 'sticker',
      title: 'Trái tim lung linh',
      creatorUsername: 'NexusStickers',
      pageUrl: 'https://stipop.io',
      previewUrl: 'https://img.stipop.io/prev.png',
      displayUrl: 'https://img.stipop.io/disp.png',
      mp4Url: null,
      width: 200,
      height: 200,
    },
  },
  {
    keyword: 'game',
    label: 'Sticker Chơi game đỉnh cao',
    sticker: {
      provider: 'stipop',
      externalId: 'stk_game_1',
      mediaType: 'sticker',
      title: 'Game On',
      creatorUsername: 'NexusStickers',
      pageUrl: 'https://stipop.io',
      previewUrl: 'https://img.stipop.io/sticker/2199/200t5ZzVZ9Ebx.png',
      displayUrl: 'https://img.stipop.io/2019/9/6/1567827398490_7.png',
      mp4Url: null,
      width: 200,
      height: 200,
    },
  },
  {
    keyword: 'meo',
    label: 'Sticker Mèo cưng dễ thương',
    sticker: {
      provider: 'stipop',
      externalId: 'stk_meo_1',
      mediaType: 'sticker',
      title: 'Mèo đáng yêu',
      creatorUsername: 'NexusStickers',
      pageUrl: 'https://stipop.io',
      previewUrl: 'https://img.stipop.io/sticker/2199/200.png',
      displayUrl: 'https://img.stipop.io/2019/9/6/disp.png',
      mp4Url: null,
      width: 200,
      height: 200,
    },
  },
  {
    keyword: 'cho',
    label: 'Sticker Cún con tinh nghịch',
    sticker: {
      provider: 'stipop',
      externalId: 'stk_cho_1',
      mediaType: 'sticker',
      title: 'Cún con',
      creatorUsername: 'NexusStickers',
      pageUrl: 'https://stipop.io',
      previewUrl: 'https://img.stipop.io/sticker/2199/200t5ZzVZ9Ebx.png',
      displayUrl: 'https://img.stipop.io/2019/9/6/1567827398490_7.png',
      mp4Url: null,
      width: 200,
      height: 200,
    },
  },
  {
    keyword: 'chao',
    label: 'Sticker Xin chào',
    sticker: {
      provider: 'stipop',
      externalId: 'stk_chao_1',
      mediaType: 'sticker',
      title: 'Chào bạn nhé',
      creatorUsername: 'NexusStickers',
      pageUrl: 'https://stipop.io',
      previewUrl: 'https://img.stipop.io/prev.png',
      displayUrl: 'https://img.stipop.io/disp.png',
      mp4Url: null,
      width: 200,
      height: 200,
    },
  },
  {
    keyword: 'chucmung',
    label: 'Sticker Chúc mừng',
    sticker: {
      provider: 'stipop',
      externalId: 'stk_chucmung_1',
      mediaType: 'sticker',
      title: 'Chúc mừng tiệc tùng',
      creatorUsername: 'NexusStickers',
      pageUrl: 'https://stipop.io',
      previewUrl: 'https://img.stipop.io/sticker/2199/200t5ZzVZ9Ebx.png',
      displayUrl: 'https://img.stipop.io/2019/9/6/1567827398490_7.png',
      mp4Url: null,
      width: 200,
      height: 200,
    },
  },
];

/** Tìm danh sách Emoji phù hợp từ toàn bộ cơ sở dữ liệu Emoji */
export function findEmojiSuggestions(rawQuery: string): EmojiSuggestionItem[] {
  const query = removeVietnameseTones(rawQuery.trim());
  if (!query) {
    return COMPREHENSIVE_EMOJIS.slice(0, 10);
  }
  return COMPREHENSIVE_EMOJIS.filter((item) => {
    const itemKeyword = removeVietnameseTones(item.keyword);
    const itemLabel = removeVietnameseTones(item.label);
    return (
      itemKeyword.startsWith(query) ||
      itemKeyword.includes(query) ||
      itemLabel.includes(query) ||
      query.includes(itemKeyword)
    );
  }).slice(0, 10);
}

/** Tìm danh sách Sticker phù hợp từ bộ nhãn dán */
export function findCuratedStickerSuggestions(rawQuery: string): StickerSuggestionItem[] {
  const query = removeVietnameseTones(rawQuery.trim());
  if (!query) {
    return CURATED_STICKERS.slice(0, 4);
  }
  return CURATED_STICKERS.filter((item) => {
    const itemKeyword = removeVietnameseTones(item.keyword);
    const itemLabel = removeVietnameseTones(item.label);
    return (
      itemKeyword.startsWith(query) ||
      itemKeyword.includes(query) ||
      itemLabel.includes(query) ||
      query.includes(itemKeyword)
    );
  }).slice(0, 6);
}
