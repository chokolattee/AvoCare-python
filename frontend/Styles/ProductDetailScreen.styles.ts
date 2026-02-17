import { StyleSheet } from 'react-native';

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
  inkFaint:   '#7a9460',
  mist:       '#f7faf3',
  fog:        '#eef3e8',
  white:      '#ffffff',
  border:     '#d5e8c0',
  borderSoft: '#e8f2dc',
  red:        '#b83232',
  redPale:    '#fdf0f0',
};

export const MAX_CONTENT_WIDTH = 860;
export const DESKTOP_BREAKPOINT = 860;

export const styles = StyleSheet.create({

  // ─── Root ─────────────────────────────────────────────────────────────────
  safeArea: {
    flex: 1,
    backgroundColor: '#eef3e8',
    // No height:'100%' — matches the CommunityScreen pattern that works on web.
    // flex:1 is sufficient when the navigator/root gives a bounded height.
  },

  // ─── Top bar ──────────────────────────────────────────────────────────────
  topBar: {
    width: '100%',
    backgroundColor: C.white,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    alignItems: 'center',
    zIndex: 10,
  },
  topBarInner: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 100,
    backgroundColor: C.fog,
    borderWidth: 1.5,
    borderColor: C.border,
  },
  backText: {
    fontSize: 13,
    fontWeight: '700',
    color: C.inkSoft,
  },
  topBarTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: C.ink,
    letterSpacing: -0.2,
  },

  // ─── Scroll view ──────────────────────────────────────────────────────────
  // KEY: flex:1 fills space below the top bar.
  // contentContainer uses flexGrow:1 + paddingBottom only — NO alignItems:'center'.
  // Centering is done by the child contentColumn using alignSelf:'center' + maxWidth,
  // exactly like CommunityScreen's centerColumn pattern.
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 60,
    // ❌ No alignItems:'center' here — this collapses height on web and breaks scroll.
  },

  // ─── Centered content column ──────────────────────────────────────────────
  // alignSelf:'center' + maxWidth + width:'100%' is the correct web-safe centering
  // pattern (same as CommunityScreen's centerColumn: maxWidth:600, alignSelf:'center').
  contentColumn: {
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: 'center',
  },

  // ─── Carousel ─────────────────────────────────────────────────────────────
  carouselPlaceholder: {
    backgroundColor: C.sagePale,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  carouselPlaceholderText: {
    color: C.sageLt,
    fontSize: 13,
    fontWeight: '600',
  },
  carouselImage: {
    width: '100%',
    height: '100%',
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    backgroundColor: C.white,
    gap: 5,
  },
  dot: {
    borderRadius: 100,
    height: 6,
  },
  dotActive: {
    width: 20,
    backgroundColor: C.forest,
  },
  dotInactive: {
    width: 6,
    backgroundColor: C.sageMid,
  },
  arrowBtn: {
    position: 'absolute',
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.38)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowLeft:  { left: 12 },
  arrowRight: { right: 12 },
  counterChip: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.42)',
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  counterText: {
    color: C.white,
    fontSize: 12,
    fontWeight: '700',
  },

  // ─── Mobile layout ────────────────────────────────────────────────────────
  mobileImageWrap: {
    width: '100%',
    backgroundColor: C.sagePale,
  },
  mobileContentCard: {
    width: '100%',
    backgroundColor: C.white,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: C.borderSoft,
  },

  // ─── Desktop layout ───────────────────────────────────────────────────────
  desktopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 24,
    padding: 24,
    width: '100%',
  },
  desktopImageCol: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: C.sagePale,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: '#1a3a05',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.09,
    shadowRadius: 16,
    elevation: 4,
  },
  desktopContentCard: {
    flex: 1,
    backgroundColor: C.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.borderSoft,
    padding: 24,
    shadowColor: '#1a3a05',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },

  // ─── Product header ───────────────────────────────────────────────────────
  productHeader: {
    marginBottom: 14,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    backgroundColor: C.sageTint,
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: C.sageMid,
    marginBottom: 8,
  },
  categoryChipText: {
    fontSize: 11,
    fontWeight: '800',
    color: C.sageMed,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  productName: {
    fontSize: 26,
    fontWeight: '900',
    color: C.ink,
    lineHeight: 32,
    letterSpacing: -0.5,
  },

  // ─── Price + status ───────────────────────────────────────────────────────
  priceStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    marginTop: 4,
  },
  price: {
    fontSize: 32,
    fontWeight: '900',
    color: C.forest,
    letterSpacing: -0.8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },

  // ─── Stock pill ───────────────────────────────────────────────────────────
  stockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  stockPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.sagePale,
    borderRadius: 100,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: C.sageMid,
  },
  stockPillOOS: {
    backgroundColor: C.redPale,
    borderColor: '#efc0c0',
  },
  stockPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: C.sage,
  },
  stockPillTextOOS: { color: C.red },

  // ─── Divider ──────────────────────────────────────────────────────────────
  divider: {
    height: 1,
    backgroundColor: C.borderSoft,
    marginBottom: 22,
  },

  // ─── Sections ─────────────────────────────────────────────────────────────
  section: { marginBottom: 24 },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: C.inkFaint,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  descriptionText: {
    fontSize: 15,
    color: C.inkSoft,
    lineHeight: 24,
  },

  // ─── Nutrition table ──────────────────────────────────────────────────────
  nutritionTable: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.border,
  },
  nutritionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: C.forest,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  nutritionHeaderText: {
    fontSize: 11,
    fontWeight: '800',
    color: C.white,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  nutritionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 11,
    backgroundColor: C.white,
    borderBottomWidth: 1,
    borderBottomColor: C.sagePale,
  },
  nutritionRowAlt: { backgroundColor: C.mist },
  nutritionLabel: {
    fontSize: 13,
    color: C.inkSoft,
    fontWeight: '500',
  },
  nutritionAmount: {
    fontSize: 13,
    color: C.ink,
    fontWeight: '800',
  },

  // ─── Meta grid ────────────────────────────────────────────────────────────
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metaItem: {
    backgroundColor: C.mist,
    borderRadius: 12,
    padding: 14,
    flex: 1,
    minWidth: 110,
    alignItems: 'flex-start',
    gap: 5,
    borderWidth: 1,
    borderColor: C.borderSoft,
  },
  metaLabel: {
    fontSize: 10,
    color: C.inkFaint,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metaValue: {
    fontSize: 13,
    fontWeight: '800',
    color: C.ink,
  },

  // ─── State screens ────────────────────────────────────────────────────────
  stateWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    padding: 32,
  },
  stateText: {
    fontSize: 15,
    textAlign: 'center',
    fontWeight: '600',
  },
});