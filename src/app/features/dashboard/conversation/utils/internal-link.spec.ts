import { resolveInternalLink } from './internal-link';

const ORIGIN = 'https://nexus.app';
const UUID = '11111111-2222-4333-8444-555555555555';

describe('resolveInternalLink', () => {
  describe('hồ sơ người dùng /u/:username', () => {
    it('nhận diện link user hợp lệ', () => {
      expect(resolveInternalLink(`${ORIGIN}/u/mon`, ORIGIN)).toEqual({
        kind: 'profile',
        username: 'mon',
      });
    });

    it('chấp nhận username có dấu chấm và gạch dưới', () => {
      expect(resolveInternalLink(`${ORIGIN}/u/minh.tai_01`, ORIGIN)).toEqual({
        kind: 'profile',
        username: 'minh.tai_01',
      });
    });

    it('bỏ qua query string và hash', () => {
      expect(resolveInternalLink(`${ORIGIN}/u/mon?ref=chat#top`, ORIGIN)).toEqual({
        kind: 'profile',
        username: 'mon',
      });
    });

    it('bỏ qua dấu / thừa ở cuối', () => {
      expect(resolveInternalLink(`${ORIGIN}/u/mon/`, ORIGIN)).toEqual({
        kind: 'profile',
        username: 'mon',
      });
    });

    it('trả null khi username quá ngắn (<3)', () => {
      expect(resolveInternalLink(`${ORIGIN}/u/ab`, ORIGIN)).toBeNull();
    });

    it('trả null khi username chứa ký tự lạ', () => {
      expect(resolveInternalLink(`${ORIGIN}/u/mon@x`, ORIGIN)).toBeNull();
    });
  });

  describe('lời mời máy chủ /invite/:code', () => {
    it('nhận diện link invite hợp lệ', () => {
      expect(resolveInternalLink(`${ORIGIN}/invite/abcd1234`, ORIGIN)).toEqual({
        kind: 'server-invite',
        code: 'abcd1234',
      });
    });

    it('chấp nhận mã có gạch ngang/gạch dưới', () => {
      expect(resolveInternalLink(`${ORIGIN}/invite/nexus-vip_2026`, ORIGIN)).toEqual({
        kind: 'server-invite',
        code: 'nexus-vip_2026',
      });
    });

    it('trả null khi mã quá ngắn (<4)', () => {
      expect(resolveInternalLink(`${ORIGIN}/invite/abc`, ORIGIN)).toBeNull();
    });
  });

  describe('giới thiệu máy chủ /channels/:serverId', () => {
    it('nhận diện link server khi serverId là uuid', () => {
      expect(resolveInternalLink(`${ORIGIN}/channels/${UUID}`, ORIGIN)).toEqual({
        kind: 'server',
        serverId: UUID,
      });
    });

    it('KHÔNG nhận nhầm link kênh /channels/:serverId/:channelId', () => {
      expect(resolveInternalLink(`${ORIGIN}/channels/${UUID}/22222222-3333-4444-8555-666666666666`, ORIGIN)).toBeNull();
    });

    it('trả null cho /channels/@me', () => {
      expect(resolveInternalLink(`${ORIGIN}/channels/@me`, ORIGIN)).toBeNull();
    });

    it('trả null khi serverId không phải uuid', () => {
      expect(resolveInternalLink(`${ORIGIN}/channels/not-a-uuid`, ORIGIN)).toBeNull();
    });
  });

  describe('loại trừ link ngoài và rác', () => {
    it('trả null cho link khác origin (external)', () => {
      expect(resolveInternalLink('https://youtube.com/u/mon', ORIGIN)).toBeNull();
    });

    it('trả null cho cùng path nhưng khác host', () => {
      expect(resolveInternalLink(`https://evil.example/channels/${UUID}`, ORIGIN)).toBeNull();
    });

    it('trả null cho URL không parse được', () => {
      expect(resolveInternalLink('not a url', ORIGIN)).toBeNull();
    });

    it('trả null cho chuỗi rỗng / null / undefined', () => {
      expect(resolveInternalLink('', ORIGIN)).toBeNull();
      expect(resolveInternalLink(null, ORIGIN)).toBeNull();
      expect(resolveInternalLink(undefined, ORIGIN)).toBeNull();
    });

    it('trả null cho route nội bộ không hỗ trợ', () => {
      expect(resolveInternalLink(`${ORIGIN}/settings/profile`, ORIGIN)).toBeNull();
      expect(resolveInternalLink(`${ORIGIN}/u`, ORIGIN)).toBeNull();
      expect(resolveInternalLink(`${ORIGIN}/`, ORIGIN)).toBeNull();
    });

    it('trả null khi không xác định được origin (không truyền, không có location)', () => {
      expect(resolveInternalLink(`${ORIGIN}/u/mon`, null)).toBeNull();
    });
  });
});
