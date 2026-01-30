import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Image,
  TextInput,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';

type RootStackParamList = {
  Home: undefined;
  Community: undefined;
  Scan: undefined;
  Market: undefined;
  Profile: undefined;
};

type MarketScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Market'>;
type MarketScreenRouteProp = RouteProp<RootStackParamList, 'Market'>;

interface Props {
  navigation: MarketScreenNavigationProp;
  route: MarketScreenRouteProp;
}

interface Product {
  id: number;
  name: string;
  price: number;
  rating: number;
  reviews: number;
  image: string;
  category: 'fresh' | 'tools' | 'fertilizer' | 'seeds' | 'supplies';
  seller: string;
  inStock: boolean;
}

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

const MarketScreen: React.FC<Props> = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const products: Product[] = [
    {
      id: 1,
      name: 'Fresh Hass Avocados',
      price: 12.99,
      rating: 4.8,
      reviews: 234,
      image: 'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=400&h=400&fit=crop',
      category: 'fresh',
      seller: 'Green Valley Farms',
      inStock: true,
    },
    {
      id: 2,
      name: 'Organic Avocado Oil',
      price: 18.50,
      rating: 4.9,
      reviews: 189,
      image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&h=400&fit=crop',
      category: 'fresh',
      seller: 'Pure Organic Co.',
      inStock: true,
    },
    {
      id: 3,
      name: 'Avocado Tree Seedlings',
      price: 24.99,
      rating: 4.7,
      reviews: 156,
      image: 'https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?w=400&h=400&fit=crop',
      category: 'seeds',
      seller: 'TreeStart Nursery',
      inStock: true,
    },
    {
      id: 4,
      name: 'Premium Pruning Shears',
      price: 32.00,
      rating: 4.6,
      reviews: 421,
      image: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&h=400&fit=crop',
      category: 'tools',
      seller: 'Garden Pro Tools',
      inStock: true,
    },
    {
      id: 5,
      name: 'Organic Fertilizer 5kg',
      price: 28.75,
      rating: 4.8,
      reviews: 312,
      image: 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=400&h=400&fit=crop',
      category: 'fertilizer',
      seller: 'EcoGrow Solutions',
      inStock: true,
    },
    {
      id: 6,
      name: 'Drip Irrigation Kit',
      price: 45.99,
      rating: 4.5,
      reviews: 267,
      image: 'https://images.unsplash.com/photo-1592921870583-64906e40624c?w=400&h=400&fit=crop',
      category: 'supplies',
      seller: 'Aqua Farm Supply',
      inStock: true,
    },
    {
      id: 7,
      name: 'Fuerte Avocado Pack',
      price: 15.99,
      rating: 4.7,
      reviews: 198,
      image: 'https://images.unsplash.com/photo-1590301157890-4810ed352733?w=400&h=400&fit=crop',
      category: 'fresh',
      seller: 'Fresh Harvest Co.',
      inStock: true,
    },
    {
      id: 8,
      name: 'Grafting Tools Set',
      price: 38.50,
      rating: 4.9,
      reviews: 143,
      image: 'https://images.unsplash.com/photo-1530836369250-ef72a3f5cda8?w=400&h=400&fit=crop',
      category: 'tools',
      seller: 'Pro Grafting Co.',
      inStock: false,
    },
  ];

  const categories = [
    { key: 'all', label: 'All', icon: 'grid-outline' },
    { key: 'fresh', label: 'Fresh', icon: 'nutrition-outline' },
    { key: 'seeds', label: 'Seeds', icon: 'leaf-outline' },
    { key: 'tools', label: 'Tools', icon: 'hammer-outline' },
    { key: 'fertilizer', label: 'Fertilizer', icon: 'flask-outline' },
    { key: 'supplies', label: 'Supplies', icon: 'cube-outline' },
  ];

  const filteredProducts = products.filter(product => {
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search Products"
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <TouchableOpacity style={styles.cartButton}>
            <Ionicons name="cart" size={24} color="#5d873e" />
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>3</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Category Filter */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesContainer}
          contentContainerStyle={styles.categoriesContent}
        >
          {categories.map((category) => (
            <TouchableOpacity
              key={category.key}
              style={[
                styles.categoryButton,
                selectedCategory === category.key && styles.categoryButtonActive,
              ]}
              onPress={() => setSelectedCategory(category.key)}
            >
              <Ionicons 
                name={category.icon as any} 
                size={18} 
                color={selectedCategory === category.key ? '#fff' : '#5d873e'} 
              />
              <Text style={[
                styles.categoryText,
                selectedCategory === category.key && styles.categoryTextActive,
              ]}>
                {category.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Featured Banner */}
        <View style={styles.bannerContainer}>
          <View style={styles.banner}>
            <View style={styles.bannerContent}>
              <Text style={styles.bannerTitle}>Fresh Harvest Sale!</Text>
              <Text style={styles.bannerSubtitle}>Up to 30% off on fresh avocados</Text>
              <TouchableOpacity style={styles.bannerButton}>
                <Text style={styles.bannerButtonText}>Shop Now</Text>
              </TouchableOpacity>
            </View>
            <Image 
              source={{ uri: 'https://images.unsplash.com/photo-1601039641847-7857b994d704?w=400&h=300&fit=crop' }}
              style={styles.bannerImage}
            />
          </View>
        </View>

        {/* Products Grid */}
        <View style={styles.productsContainer}>
          <Text style={styles.sectionTitle}>
            {selectedCategory === 'all' ? 'All Products' : `${categories.find(c => c.key === selectedCategory)?.label} Products`}
          </Text>
          <View style={styles.productsGrid}>
            {filteredProducts.map((product) => (
              <TouchableOpacity key={product.id} style={styles.productCard}>
                {/* Product Image */}
                <View style={styles.productImageContainer}>
                  <Image source={{ uri: product.image }} style={styles.productImage} />
                  {!product.inStock && (
                    <View style={styles.outOfStockBadge}>
                      <Text style={styles.outOfStockText}>Out of Stock</Text>
                    </View>
                  )}
                  <TouchableOpacity style={styles.favoriteButton}>
                    <Ionicons name="heart-outline" size={20} color="#5d873e" />
                  </TouchableOpacity>
                </View>

                {/* Product Info */}
                <View style={styles.productInfo}>
                  <Text style={styles.productName} numberOfLines={2}>
                    {product.name}
                  </Text>
                  <Text style={styles.sellerName} numberOfLines={1}>
                    {product.seller}
                  </Text>

                  {/* Rating */}
                  <View style={styles.ratingContainer}>
                    <Ionicons name="star" size={14} color="#FFB800" />
                    <Text style={styles.ratingText}>{product.rating}</Text>
                    <Text style={styles.reviewsText}>({product.reviews})</Text>
                  </View>

                  {/* Price and Add Button */}
                  <View style={styles.productFooter}>
                    <Text style={styles.price}>${product.price}</Text>
                    <TouchableOpacity 
                      style={[
                        styles.addButton,
                        !product.inStock && styles.addButtonDisabled
                      ]}
                      disabled={!product.inStock}
                    >
                      <Ionicons name="add" size={18} color="#fff" />
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 2,
    borderColor: '#5d873e',
    marginRight: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#333',
  },
  cartButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#5d873e',
    position: 'relative',
  },
  cartBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#e74c3c',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  categoriesContainer: {
    marginTop: 8,
  },
  categoriesContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#fff',
    marginRight: 10,
    borderWidth: 2,
    borderColor: '#5d873e',
  },
  categoryButtonActive: {
    backgroundColor: '#5d873e',
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5d873e',
    marginLeft: 6,
  },
  categoryTextActive: {
    color: '#fff',
  },
  bannerContainer: {
    paddingHorizontal: 16,
    marginTop: 16,
  },
  banner: {
    backgroundColor: '#A5C89E',
    borderRadius: 16,
    overflow: 'hidden',
    flexDirection: 'row',
    minHeight: 140,
  },
  bannerContent: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  bannerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2d3e2d',
    marginBottom: 6,
  },
  bannerSubtitle: {
    fontSize: 14,
    color: '#3d4d3d',
    marginBottom: 12,
  },
  bannerButton: {
    backgroundColor: '#5d873e',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  bannerButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  bannerImage: {
    width: 120,
    height: '100%',
  },
  productsContainer: {
    paddingHorizontal: 16,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2d3e2d',
    marginBottom: 16,
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  productCard: {
    width: CARD_WIDTH,
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#e8e8e8',
  },
  productImageContainer: {
    position: 'relative',
    width: '100%',
    height: CARD_WIDTH,
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  outOfStockBadge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  outOfStockText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  favoriteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  productInfo: {
    padding: 12,
  },
  productName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2d3e2d',
    marginBottom: 4,
    minHeight: 38,
  },
  sellerName: {
    fontSize: 12,
    color: '#666',
    marginBottom: 6,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginLeft: 4,
  },
  reviewsText: {
    fontSize: 12,
    color: '#999',
    marginLeft: 4,
  },
  productFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  price: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#5d873e',
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#5d873e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonDisabled: {
    backgroundColor: '#ccc',
  },
  bottomSpacer: {
    height: 100,
  },
});

export default MarketScreen;