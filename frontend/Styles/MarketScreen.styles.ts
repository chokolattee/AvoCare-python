import { StyleSheet, Platform } from 'react-native';

const C = {
  forest:     '#2d5016',
  sage:       '#3d6b22',
  sageMed:    '#5a8c35',
  sageLt:     '#7aad4e',
  sagePale:   '#e8f5dc',
  sageMid:    '#c8e8b0',
  sageTint:   '#f2fae9',
  ink:        '#111a0a',
  inkSoft:    '#2e4420',
  inkMid:     '#4a6635',
  inkFaint:   '#7a9460',
  mist:       '#f7faf3',
  fog:        '#eef3e8',
  white:      '#ffffff',
  border:     '#d5e8c0',
  borderSoft: '#e8f2dc',
  red:        '#b83232',
  redPale:    '#fdf0f0',
};

export const MAX_CONTENT_WIDTH = 720;

export const styles = StyleSheet.create({

  // ─── Root ──────────────────────────────────────────────────────────────────
  container: {
    flex: 1,
    backgroundColor: C.fog,
  },

  // ─── Outer scroll (wraps header + dropdown + grid as one flow) ─────────────
  outerScroll: {
    flex: 1,
  },
  outerScrollContent: {
    flexGrow: 1,
    paddingBottom: 60,
  },

  // ─── Header bar ────────────────────────────────────────────────────────────
  headerBar: {
    width: '100%',
    backgroundColor: C.white,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    alignItems: 'center',
  },
  headerInner: {
    width: '100%',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: C.ink,
    letterSpacing: -0.6,
  },
  headerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.sageMed,
  },
  headerCount: {
    fontSize: 12,
    fontWeight: '700',
    color: C.sageMed,
    backgroundColor: C.sagePale,
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 3,
    overflow: 'hidden',
  },

  // ─── Search + dropdown trigger row ─────────────────────────────────────────
  controlsRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  searchWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.fog,
    borderRadius: 100,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 11 : 9,
    borderWidth: 1.5,
    borderColor: C.border,
    gap: 8,
  },
  searchWrapFocused: {
    borderColor: C.sageMed,
    backgroundColor: C.white,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: C.ink,
  },

  // ─── Category trigger button ───────────────────────────────────────────────
  categoryTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.sagePale,
    borderRadius: 100,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 11 : 9,
    borderWidth: 1.5,
    borderColor: C.sageMid,
    gap: 5,
    minWidth: 100,
    maxWidth: 150,
  },
  categoryTriggerOpen: {
    backgroundColor: C.forest,
    borderColor: C.forest,
  },
  categoryTriggerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: C.sage,
  },
  categoryTriggerTextOpen: {
    color: C.white,
  },

  // ─── Dropdown panel (in-flow, not absolutely positioned) ───────────────────
  // Lives in the normal document flow so it pushes the grid down naturally
  dropdownPanel: {
    backgroundColor: C.white,
    borderBottomWidth: 1.5,
    borderBottomColor: C.border,
  },
  dropdownPanelInner: {
    width: '100%',
  },
  dropdownPanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: C.sageTint,
    borderBottomWidth: 1,
    borderBottomColor: C.sagePale,
  },
  dropdownPanelHeaderText: {
    fontSize: 11,
    fontWeight: '800',
    color: C.inkFaint,
    textTransform: 'uppercase',
    letterSpacing: 0.9,
  },
  dropdownCloseBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: C.fog,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },
  // Scrollable list capped at 260px — shows ~4 items, rest scrolls
  dropdownScrollView: {
    maxHeight: 260,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: C.borderSoft,
    gap: 12,
    backgroundColor: C.white,
  },
  dropdownItemActive: {
    backgroundColor: C.sageTint,
  },
  dropdownDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: C.border,
    backgroundColor: 'transparent',
  },
  dropdownDotActive: {
    borderColor: C.forest,
    backgroundColor: C.forest,
  },
  dropdownItemText: {
    flex: 1,
    fontSize: 14,
    color: C.inkSoft,
    fontWeight: '500',
  },
  dropdownItemTextActive: {
    color: C.forest,
    fontWeight: '700',
  },
  dropdownCheckCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: C.forest,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ─── Feed section ──────────────────────────────────────────────────────────
  feedSection: {
    flex: 1,
  },
  feedWrap: {
    paddingHorizontal: 16,
    paddingTop: 14,
  },

  // ─── Results bar ──────────────────────────────────────────────────────────
  resultsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
    marginBottom: 12,
  },
  resultsText: {
    fontSize: 11,
    fontWeight: '700',
    color: C.inkFaint,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  // ─── Grid ──────────────────────────────────────────────────────────────────
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  // ─── Card ──────────────────────────────────────────────────────────────────
  card: {
    backgroundColor: C.white,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.borderSoft,
    shadowColor: '#1a3a05',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },

  // ─── Card image — square (1:1) like Shopee/Lazada ─────────────────────────
  cardImageWrap: {
    width: '100%',
    backgroundColor: C.sagePale,
    // height is set inline = cardWidth (1:1 ratio)
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardImagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  cardImagePlaceholderText: {
    fontSize: 10,
    color: C.sageLt,
    fontWeight: '600',
  },

  // OOS: top/right/bottom/left instead of inset (RN compat)
  oosOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(0,0,0,0.50)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  oosText: {
    color: C.white,
    fontWeight: '800',
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },

  // ─── Multi-image badge ─────────────────────────────────────────────────────
  imageCountBadge: {
    position: 'absolute',
    bottom: 7,
    right: 7,
    backgroundColor: 'rgba(0,0,0,0.46)',
    borderRadius: 100,
    paddingHorizontal: 7,
    paddingVertical: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  imageCountText: {
    color: C.white,
    fontSize: 11,
    fontWeight: '700',
  },

  // ─── Card body ────────────────────────────────────────────────────────────
  cardBody: {
    padding: 10,
  },
  cardCategory: {
    fontSize: 10,
    color: C.sageMed,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  cardName: {
    fontSize: 13,
    fontWeight: '700',
    color: C.ink,
    lineHeight: 18,
    marginBottom: 8,
    minHeight: 36,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardPrice: {
    fontSize: 16,
    fontWeight: '900',
    color: C.forest,
    letterSpacing: -0.3,
  },
  stockBadge: {
    backgroundColor: C.sagePale,
    borderRadius: 100,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  stockBadgeOOS: {
    backgroundColor: C.redPale,
  },
  stockText: {
    fontSize: 11,
    fontWeight: '700',
    color: C.sageMed,
  },
  stockTextOOS: {
    color: C.red,
  },

  // ─── States ────────────────────────────────────────────────────────────────
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 80,
  },
  loadingText: {
    fontSize: 14,
    color: C.sageLt,
    marginTop: 8,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 15,
    color: C.red,
    textAlign: 'center',
    paddingHorizontal: 32,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '800',
    color: C.inkSoft,
    marginTop: 8,
  },
  emptySubText: {
    fontSize: 13,
    color: C.inkFaint,
    fontWeight: '500',
  },
});