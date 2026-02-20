import { StyleSheet, Platform, Dimensions } from 'react-native';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

export const CHAT_WIDTH = Math.min(SCREEN_WIDTH * 0.92, 370);
export const CHAT_HEIGHT = Math.min(SCREEN_HEIGHT * 0.62, 500);

export const fabStyles = StyleSheet.create({
  fabContainer: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    zIndex: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fab: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#4a8c2a',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2d6e10',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 12,
    overflow: 'visible',
  },
  fabEmoji: { fontSize: 26, lineHeight: 32 },
  heart: { position: 'absolute', fontSize: 13 },
  badge: {
    position: 'absolute',
    top: -3,
    right: -3,
    backgroundColor: '#e53935',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#fff',
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
});

export const chatStyles = StyleSheet.create({
  chatWindow: {
    position: 'absolute',
    bottom: 20,
    right: 14,
    width: CHAT_WIDTH,
    height: CHAT_HEIGHT,
    borderRadius: 16,
    overflow: 'hidden',
    zIndex: 9998,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 22,
    ...(Platform.OS === 'web'
      ? ({ boxShadow: '0 6px 28px rgba(0,0,0,0.15), 0 2px 6px rgba(74,140,42,0.1)' } as any)
      : {}),
  },

  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    zIndex: 9997,
  },

  // ── Header ──
  chatHeader: {
    backgroundColor: '#4a8c2a',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 10,
    flexShrink: 0,
    ...(Platform.OS === 'web'
      ? ({ background: 'linear-gradient(135deg, #6ecb3a 0%, #4a8c2a 60%, #3a7220 100%)' } as any)
      : {}),
  },
  leavesContainer: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  leafDecor: { position: 'absolute', fontSize: 12, opacity: 0.4 },
  leaf1: { left: '6%', top: '28%' },
  leaf2: { left: '78%', top: '10%' },
  leaf3: { left: '86%', top: '60%' },
  leaf4: { left: '3%', top: '65%' },

  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
    zIndex: 10,
  },
  headerIconBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: { color: '#fff', fontSize: 12, fontWeight: '800' },

  headerAvoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, zIndex: 5 },
  avoAvatarWrap: { width: 50, height: 50, justifyContent: 'center', alignItems: 'center', overflow: 'visible' },
  avoAvatarEmoji: {
    fontSize: 42,
    lineHeight: 48,
    ...(Platform.OS === 'web'
      ? ({ filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.22))' } as any)
      : {}),
  },
  headerInfo: { flex: 1, alignItems: 'flex-start' },
  headerTitle: { fontSize: 15, fontWeight: '900', color: '#fff', letterSpacing: 0.2 },
  headerSubtitle: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.85)', marginTop: 1 },
  onlineRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  onlineDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#b5f55a' },
  onlineText: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.9)' },

  // ── Language Selector Bar ──
  langBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#f0fce8',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(110,203,58,0.2)',
    gap: 5,
    flexShrink: 0,
    ...(Platform.OS === 'web'
      ? ({ background: 'linear-gradient(90deg, #edfae0, #f5fef0)' } as any)
      : {}),
  },
  langLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#5a8a3a',
    marginRight: 2,
    letterSpacing: 0.3,
  },
  langBtn: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(74,140,42,0.3)',
    backgroundColor: '#fff',
  },
  langBtnActive: {
    backgroundColor: '#4a8c2a',
    borderColor: '#4a8c2a',
    shadowColor: '#2d6e10',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 3,
  },
  langBtnText: { fontSize: 11, fontWeight: '700', color: '#4a8c2a' },
  langBtnTextActive: { color: '#fff' },

  // ── Messages ──
  messagesArea: {
    flex: 1,
    backgroundColor: '#f0fce8',
    ...(Platform.OS === 'web'
      ? ({ background: 'linear-gradient(180deg, #e8fcd6 0%, #f0fce8 100%)', overflowY: 'auto', overflowX: 'hidden' } as any)
      : {}),
  },
  messagesContent: { padding: 10, paddingBottom: 6, flexGrow: 1 },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, marginBottom: 8 },
  msgRowUser: { flexDirection: 'row-reverse' },
  msgRowBot: { flexDirection: 'row' },
  msgAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(74,140,42,0.13)',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  msgAvatarUser: { backgroundColor: '#4a8c2a', elevation: 3 },
  msgAvatarEmoji: { fontSize: 18, lineHeight: 22 },
  bubble: { maxWidth: '76%', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18, flexShrink: 1 },
  bubbleBot: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    borderWidth: 1.5,
    borderColor: 'rgba(110,203,58,0.2)',
    shadowColor: '#2d6e10',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  bubbleUser: {
    borderBottomRightRadius: 4,
    backgroundColor: '#4a8c2a',
    shadowColor: '#2d6e10',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
    ...(Platform.OS === 'web'
      ? ({ background: 'linear-gradient(135deg, #6ecb3a, #4a8c2a)' } as any)
      : {}),
  },
  bubbleError: { backgroundColor: '#fff3f3', borderColor: '#ffcdd2' },
  bubbleTextUser: { fontSize: 13, lineHeight: 19, color: '#fff', fontWeight: '600' },
  timestamp: { fontSize: 9, marginTop: 3 },
  tsUser: { color: 'rgba(255,255,255,0.65)', textAlign: 'right' },
  tsBot: { color: '#a0b898' },

  // ── Typing ──
  typingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 2 },
  typingDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#6ecb3a' },

  // ── Markdown ──
  mdParagraph: { fontSize: 13, lineHeight: 19, color: '#2d4a1e', marginBottom: 3, fontWeight: '500' },
  mdBold: { fontWeight: '900', color: '#1e5c1e' },
  mdHeading: { fontWeight: '900', color: '#2a6e2a', marginTop: 6, marginBottom: 3 },
  mdH1: { fontSize: 15 },
  mdH2: { fontSize: 14 },
  mdH3: { fontSize: 13 },
  mdBulletRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 3 },
  mdBulletIcon: { fontSize: 12, color: '#4a8c2a', marginRight: 3, marginTop: 2, flexShrink: 0 },
  mdBulletText: { flex: 1, fontSize: 13, lineHeight: 19, color: '#2d4a1e', fontWeight: '500' },

  // ── Quick Questions ──
  quickSection: {
    maxHeight: 106,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#edfae0',
    flexShrink: 0,
    ...(Platform.OS === 'web'
      ? ({ background: 'linear-gradient(180deg, #f0fce8, #edfae0)', overflowY: 'auto' } as any)
      : {}),
  },
  quickBtn: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: 'rgba(110,203,58,0.38)',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 12,
    shadowColor: '#2d6e10',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 3,
    elevation: 1,
    marginBottom: 4,
  },
  quickBtnText: { fontSize: 12, fontWeight: '700', color: '#2d6a2d' },

  // ── Input ──
  inputArea: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderTopWidth: 1.5,
    borderTopColor: 'rgba(110,203,58,0.18)',
    gap: 8,
    flexShrink: 0,
  },
  input: {
    flex: 1,
    backgroundColor: '#f5fef0',
    borderRadius: 16,
    paddingHorizontal: 13,
    paddingVertical: 8,
    fontSize: 13,
    minHeight: 38,
    maxHeight: 90,
    color: '#2d4a1e',
    borderWidth: 1.5,
    borderColor: 'rgba(110,203,58,0.3)',
    fontWeight: '500',
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}),
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#4a8c2a',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2d6e10',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 5,
    ...(Platform.OS === 'web'
      ? ({ background: 'radial-gradient(circle at 35% 30%, #7ed957, #3a9e3f)' } as any)
      : {}),
  },
  sendBtnDisabled: { opacity: 0.4, elevation: 0 },
  sendBtnIcon: { color: '#fff', fontSize: 15, fontWeight: '800' },

  // ── Quick Questions Toggle Button ──
  quickToggleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f0fce8',
    borderWidth: 1.5,
    borderColor: 'rgba(110,203,58,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  quickToggleBtnActive: {
    backgroundColor: '#d4f5b8',
    borderColor: '#4a8c2a',
  },
  quickToggleIcon: { fontSize: 17 },
});