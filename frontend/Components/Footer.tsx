import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const Footer: React.FC = () => {
  const openURL = (url: string) => {
    Linking.openURL(url).catch((err) => console.error('Failed to open URL:', err));
  };

  const socialLinks = [
    { icon: 'logo-facebook', url: 'https://facebook.com/avocare', color: '#1877F2', name: 'Facebook' },
    { icon: 'logo-twitter', url: 'https://twitter.com/avocare', color: '#1DA1F2', name: 'Twitter' },
    { icon: 'logo-instagram', url: 'https://instagram.com/avocare', color: '#E4405F', name: 'Instagram' },
    { icon: 'logo-linkedin', url: 'https://linkedin.com/company/avocare', color: '#0077B5', name: 'LinkedIn' },
  ];

  const quickLinks = [
    { title: 'About Us', url: 'https://avocare.com/about' },
    { title: 'Our Products', url: 'https://avocare.com/products' },
    { title: 'Blog', url: 'https://avocare.com/blog' },
    { title: 'Contact', url: 'https://avocare.com/contact' },
  ];

  return (
    <View style={styles.footer}>
      {/* Decorative Top Border */}
      <View style={styles.decorativeBorder}>
        <LinearGradient
          colors={['#8BC34A', '#5d873e', '#2d5a3d']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradientLine}
        />
      </View>

      <LinearGradient
        colors={['#2d5a3d', '#1f3d2a']}
        style={styles.footerGradient}
      >
        <View style={styles.footerContent}>
          {/* Logo & Brand Section */}
          <View style={styles.brandSection}>
            <View style={styles.logoCircle}>
              <Ionicons name="leaf" size={48} color="#8BC34A" />
            </View>
            <Text style={styles.brandName}>AvoCare</Text>
            <Text style={styles.brandTagline}>
              Growing health, harvesting wellness
            </Text>
          </View>

          {/* Main Content Grid */}
          <View style={styles.contentGrid}>
            {/* Contact Section */}
            <View style={styles.footerSection}>
              <View style={styles.sectionTitleContainer}>
                <Ionicons name="location" size={20} color="#8BC34A" />
                <Text style={styles.sectionTitle}>Get in Touch</Text>
              </View>
              <View style={styles.contactInfo}>
                <TouchableOpacity 
                  style={styles.contactItem}
                  onPress={() => openURL('https://maps.google.com')}
                >
                  <Ionicons name="business" size={16} color="#aad4aa" />
                  <View style={styles.contactTextContainer}>
                    <Text style={styles.contactText}>123 Green Avenue</Text>
                    <Text style={styles.contactText}>Mandaluyong City, 1550</Text>
                    <Text style={styles.contactText}>Philippines</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.contactItem}
                  onPress={() => openURL('tel:+6328531035')}
                >
                  <Ionicons name="call" size={16} color="#aad4aa" />
                  <Text style={styles.contactText}>+632 8 531-0351</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.contactItem}
                  onPress={() => openURL('mailto:info@avocare.com')}
                >
                  <Ionicons name="mail" size={16} color="#aad4aa" />
                  <Text style={styles.emailText}>info@avocare.com</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Quick Links Section */}
            <View style={styles.footerSection}>
              <View style={styles.sectionTitleContainer}>
                <Ionicons name="link" size={20} color="#8BC34A" />
                <Text style={styles.sectionTitle}>Quick Links</Text>
              </View>
              <View style={styles.quickLinksContainer}>
                {quickLinks.map((link, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.quickLink}
                    onPress={() => openURL(link.url)}
                  >
                    <Ionicons name="chevron-forward" size={14} color="#8BC34A" />
                    <Text style={styles.quickLinkText}>{link.title}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Social Media Section */}
            <View style={styles.footerSection}>
              <View style={styles.sectionTitleContainer}>
                <Ionicons name="share-social" size={20} color="#8BC34A" />
                <Text style={styles.sectionTitle}>Connect With Us</Text>
              </View>
              <View style={styles.socialLinksContainer}>
                {socialLinks.map((social, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.socialButton}
                    onPress={() => openURL(social.url)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name={social.icon as any} size={24} color="#fff" />
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.socialDescription}>
                Follow us for updates, tips, and avocado love
              </Text>
            </View>
          </View>

          {/* Newsletter Section */}
          <View style={styles.newsletterSection}>
            <View style={styles.newsletterContent}>
              <Ionicons name="mail-outline" size={32} color="#8BC34A" />
              <View style={styles.newsletterText}>
                <Text style={styles.newsletterTitle}>Stay Updated</Text>
                <Text style={styles.newsletterDescription}>
                  Subscribe to our newsletter for farming tips and news
                </Text>
              </View>
            </View>
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Copyright & Legal */}
          <View style={styles.bottomSection}>
            <Text style={styles.copyrightText}>
              © {new Date().getFullYear()} AvoCare. All rights reserved.
            </Text>
            <View style={styles.legalLinks}>
              <TouchableOpacity onPress={() => openURL('https://avocare.com/privacy')}>
                <Text style={styles.legalLink}>Privacy Policy</Text>
              </TouchableOpacity>
              <Text style={styles.separator}>•</Text>
              <TouchableOpacity onPress={() => openURL('https://avocare.com/terms')}>
                <Text style={styles.legalLink}>Terms of Service</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
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
    paddingTop: 50,
    paddingBottom: 30,
  },
  footerContent: {
    paddingHorizontal: 20,
  },
  
  // Brand Section
  brandSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
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
  brandName: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 1,
    marginBottom: 8,
  },
  brandTagline: {
    fontSize: 14,
    color: '#aad4aa',
    fontStyle: 'italic',
  },

  // Content Grid
  contentGrid: {
    gap: 32,
  },
  footerSection: {
    gap: 16,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#8BC34A',
    letterSpacing: 0.5,
  },

  // Contact Info
  contactInfo: {
    gap: 16,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  contactTextContainer: {
    flex: 1,
  },
  contactText: {
    fontSize: 14,
    color: '#d4e5d4',
    lineHeight: 20,
  },
  emailText: {
    fontSize: 14,
    color: '#8BC34A',
    textDecorationLine: 'underline',
  },

  // Quick Links
  quickLinksContainer: {
    gap: 12,
  },
  quickLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quickLinkText: {
    fontSize: 14,
    color: '#d4e5d4',
  },

  // Social Media
  socialLinksContainer: {
    flexDirection: 'row',
    gap: 16,
    flexWrap: 'wrap',
  },
  socialButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(139, 195, 74, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#8BC34A',
  },
  socialDescription: {
    fontSize: 13,
    color: '#aad4aa',
    marginTop: 8,
  },

  // Newsletter
  newsletterSection: {
    marginTop: 32,
    backgroundColor: 'rgba(139, 195, 74, 0.1)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(139, 195, 74, 0.3)',
  },
  newsletterContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  newsletterText: {
    flex: 1,
  },
  newsletterTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  newsletterDescription: {
    fontSize: 13,
    color: '#aad4aa',
  },

  // Bottom Section
  divider: {
    height: 1,
    backgroundColor: 'rgba(139, 195, 74, 0.2)',
    marginTop: 32,
    marginBottom: 24,
  },
  bottomSection: {
    alignItems: 'center',
    gap: 16,
  },
  copyrightText: {
    fontSize: 13,
    color: '#aad4aa',
    textAlign: 'center',
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

export default Footer;