import { StyleSheet, Platform } from 'react-native';

export const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },

  // Hero Section
  heroSection: {
    paddingVertical: 60,
    paddingHorizontal: 20,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e8e8e8',
  },
  heroContent: {
    alignItems: 'center',
    maxWidth: 800,
    width: '100%',
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#e8f5e0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 3,
    borderColor: '#5d873e',
    ...Platform.select({
      ios: {
        shadowColor: '#5d873e',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  logo: {
    width: 80,
    height: 80,
    // resizeMode deprecated, use Image prop
  },
  heroTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#5d873e',
    marginBottom: 12,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#90b481',
    textAlign: 'center',
    lineHeight: 24,
  },

  // Section Styles
  section: {
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#5d873e',
  },

  // Mission Section
  missionText: {
    fontSize: 15,
    lineHeight: 24,
    color: '#555',
    marginBottom: 16,
    textAlign: 'justify',
  },

  // Features Section
  featuresSection: {
    paddingVertical: 40,
    paddingHorizontal: 20,
    backgroundColor: '#f8fdf5',
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'center',
  },
  featureCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 350,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  featureIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#f0f7ed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#5d873e',
    marginBottom: 8,
    textAlign: 'center',
  },
  featureDescription: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },

  // Team Section
  teamScrollContainer: {
     flexDirection: 'row',
     gap: 20,
     paddingHorizontal: 10,
   },
  teamSection: {
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  teamIntro: {
    fontSize: 15,
    lineHeight: 24,
    color: '#555',
    marginBottom: 32,
    textAlign: 'center',
  },
  teamGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
    justifyContent: 'center',
  },
  memberCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 280,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e8f5e0',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  memberImageContainer: {
    marginBottom: 16,
  },
  memberImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#5d873e',
  },
  memberImagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f0f7ed',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#5d873e',
  },
  memberName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#5d873e',
    marginBottom: 4,
    textAlign: 'center',
  },
  memberRole: {
    fontSize: 14,
    color: '#5d873e',
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  memberBio: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  memberLinks: {
    flexDirection: 'row',
    gap: 12,
  },
  socialLink: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f7ed',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#5d873e',
  },

  // Contact Section
  contactSection: {
    paddingVertical: 40,
    paddingHorizontal: 20,
    backgroundColor: '#f8fdf5',
  },
  contactText: {
    fontSize: 15,
    lineHeight: 24,
    color: '#555',
    marginBottom: 24,
    textAlign: 'center',
  },
  contactInfo: {
    gap: 16,
    alignItems: 'center',
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '100%',
    maxWidth: 400,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  contactItemText: {
    fontSize: 15,
    color: '#5d873e',
    fontWeight: '500',
  },

  // Mobile Menu Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    flexDirection: 'row',
  },
  modalContent: {
    backgroundColor: '#fff',
    width: '75%',
    maxWidth: 280,
    height: '100%',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    paddingTop: Platform.OS === 'ios' ? 50 : 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e8f5e0',
    backgroundColor: '#5d873e',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  closeButton: {
    padding: 4,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBody: {
    flex: 1,
    paddingTop: 8,
  },
  modalMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
    gap: 12,
  },
  modalMenuText: {
    flex: 1,
    fontSize: 15,
    color: '#2d5a3d',
    fontWeight: '600',
  },
});