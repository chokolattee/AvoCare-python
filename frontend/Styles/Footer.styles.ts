import { StyleSheet, Platform } from 'react-native';

export const styles = StyleSheet.create({
  footer: {
    marginTop: 50,
  },
  decorativeBorder: {
    height: 4,
  },
  gradientLine: {
    height: '100%',
  },
  footerGradient: {
    paddingVertical: 40,
  },
  footerContent: {
    paddingHorizontal: 20,
  },
  
  // Main Horizontal Layout
  mainContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 30,
  },
  
  // Brand Section
  brandSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minWidth: 200,
  },
  logoCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#8BC34A',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  avocadoImage: {
    width: 40,
    height: 40,
    // resizeMode deprecated, use Image prop
  },
  brandName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 1,
  },
  brandTagline: {
    fontSize: 12,
    color: '#aad4aa',
    fontStyle: 'italic',
  },

  // Section Styles
  section: {
    gap: 8,
    minWidth: 150,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#8BC34A',
    marginBottom: 8,
  },
  linkText: {
    fontSize: 13,
    color: '#d4e5d4',
    paddingVertical: 2,
  },

  // Social Media
  socialLinksContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  socialButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(139, 195, 74, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#8BC34A',
  },

  // Bottom Section
  divider: {
    height: 1,
    backgroundColor: 'rgba(139, 195, 74, 0.2)',
    marginTop: 32,
    marginBottom: 20,
  },
  bottomSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  copyrightText: {
    fontSize: 13,
    color: '#aad4aa',
  },
  legalLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  legalLink: {
    fontSize: 12,
    color: '#8BC34A',
    textDecorationLine: 'underline',
  },
  separator: {
    fontSize: 12,
    color: '#aad4aa',
  },
});