import React from 'react';
import { View, Text, TouchableOpacity, Linking, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { styles } from '../Styles/Footer.styles';

const avocadoLogo = require('../assets/avocado.png');

const Footer: React.FC = () => {
  const openURL = (url: string) => {
    Linking.openURL(url).catch((err) => console.error('Failed to open URL:', err));
  };

  const socialLinks = [
    { icon: 'logo-facebook', url: 'https://facebook.com/avocare', name: 'Facebook' },
    { icon: 'logo-twitter', url: 'https://twitter.com/avocare', name: 'Twitter' },
    { icon: 'logo-instagram', url: 'https://instagram.com/avocare', name: 'Instagram' },
    { icon: 'logo-linkedin', url: 'https://linkedin.com/company/avocare', name: 'LinkedIn' },
  ];

  return (
    <View style={styles.footer}>
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
          {/* Main Horizontal Content */}
          <View style={styles.mainContent}>
            {/* Brand Section */}
            <View style={styles.brandSection}>
              <View style={styles.logoCircle}>
                <Image source={avocadoLogo} style={styles.avocadoImage} />
              </View>
              <View>
                <Text style={styles.brandName}>AvoCare</Text>
                <Text style={styles.brandTagline}>Growing health, harvesting wellness</Text>
              </View>
            </View>

            {/* Contact Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Contact</Text>
              <TouchableOpacity onPress={() => openURL('tel:+6328531035')}>
                <Text style={styles.linkText}>+632 8 531-0351</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => openURL('mailto:info@avocare.com')}>
                <Text style={styles.linkText}>info@avocare.com</Text>
              </TouchableOpacity>
            </View>

            {/* Quick Links Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Quick Links</Text>
              <TouchableOpacity onPress={() => openURL('https://avocare.com/about')}>
                <Text style={styles.linkText}>About Us</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => openURL('https://avocare.com/products')}>
                <Text style={styles.linkText}>Our Products</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => openURL('https://avocare.com/blog')}>
                <Text style={styles.linkText}>Blog</Text>
              </TouchableOpacity>
            </View>

            {/* Social Media Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Follow Us</Text>
              <View style={styles.socialLinksContainer}>
                {socialLinks.map((social, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.socialButton}
                    onPress={() => openURL(social.url)}
                  >
                    <Ionicons name={social.icon as any} size={20} color="#fff" />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Bottom Section */}
          <View style={styles.divider} />
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

export default Footer;