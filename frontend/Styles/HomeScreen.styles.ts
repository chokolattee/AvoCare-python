import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    flexGrow: 1,
  },

  // Hero Section (static styles)
  heroGradient: {
    flex: 1,
    position: 'relative',
  },
  carouselContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  carouselImage: {
    width: '100%',
    height: '100%',
  },
  carouselOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  heroContent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 50,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    zIndex: 2,
  },
  welcomeText: {
    color: '#fff',
    marginBottom: 10,
    fontWeight: '500',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  heroTitle: {
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  highlight: {
    color: '#e8ffd7',
  },
  heroSubtitle: {
    color: '#fff',
    textAlign: 'center',
    lineHeight: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  carouselDots: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    zIndex: 3,
  },
  carouselDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  carouselDotActive: {
    backgroundColor: '#fff',
    width: 32,
    borderRadius: 5,
  },

  // Action Buttons
  actionButtonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionButtonIcon: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonText: {
    width: '100%',
    alignItems: 'center',
  },
  actionButtonTitle: {
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  actionButtonSubtitle: {
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 14,
    textAlign: 'center',
  },

  // News Section
  newsSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontWeight: 'bold',
    color: '#2d3e2d',
  },
  newsList: {
    gap: 10,
  },
  newsItem: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#5d873e',
  },
  newsItemContent: {
    flex: 1,
  },
  newsItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2d3e2d',
    marginBottom: 4,
    lineHeight: 19,
  },
  newsItemSource: {
    fontSize: 11,
    color: '#888',
    fontStyle: 'italic',
  },

  // Community Section
  communitySection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  communityPreview: {
    gap: 14,
  },
  communityText: {
    fontSize: 13,
    color: '#555',
    lineHeight: 20,
  },
  communityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#5d873e',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 6,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  communityButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
  },
  
  // Forum Post Card
  forumPostCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e8f5e0',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  forumPostHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  forumPostUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  forumPostAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#e8f5e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  forumPostAuthor: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2d3e2d',
  },
  forumCategoryBadge: {
    backgroundColor: '#e8f5e0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  forumCategoryText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#5d873e',
    textTransform: 'uppercase',
  },
  forumPostTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2d3e2d',
    marginBottom: 6,
    lineHeight: 21,
  },
  forumPostContent: {
    fontSize: 13,
    color: '#666',
    lineHeight: 19,
    marginBottom: 10,
  },
  forumPostImageContainer: {
    position: 'relative',
    width: '100%',
    height: 160,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 10,
    backgroundColor: '#f8f9fa',
  },
  forumPostImage: {
    width: '100%',
    height: '100%',
  },
  moreImagesOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  moreImagesText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  forumPostFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  forumPostStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  forumPostStatText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 4,
    fontWeight: '600',
  },
  readMoreText: {
    fontSize: 12,
    color: '#5d873e',
    fontWeight: '600',
  },

  // Avocado Benefits Section
  benefitsSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  avocadoIcon: {
    fontSize: 24,
  },
  benefitsGrid: {
    gap: 12,
  },
  benefitCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 14,
    borderLeftWidth: 4,
    borderLeftColor: '#5d873e',
  },
  benefitIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  benefitTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2d3e2d',
    marginBottom: 6,
  },
  benefitDescription: {
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
  },
});