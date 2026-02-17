import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  Image,
  TextInput,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { getProducts, getCategories } from '../Services/productApi';
import { Product, Category } from '../Types/product';
import { styles, MAX_CONTENT_WIDTH } from '../Styles/MarketScreen.styles';

// ─── Navigation types ────────────────────────────────────────────────────────

type RootStackParamList = {
  Home: undefined;
  Community: undefined;
  Scan: undefined;
  Market: undefined;
  ProductDetails: { product: Product };
  Profile: undefined;
};

type Props = {
  navigation: StackNavigationProp<RootStackParamList, 'Market'>;
  route:      RouteProp<RootStackParamList, 'Market'>;
};

// ─── Layout constants ────────────────────────────────────────────────────────

const PADDING = 16;
const GAP     = 10;

function getColumns(width: number): number {
  if (width >= 900) return 4;
  if (width >= 600) return 3;
  return 2;
}

// ─── Component ───────────────────────────────────────────────────────────────

const MarketScreen: React.FC<Props> = ({ navigation }) => {
  const [dimensions, setDimensions]             = useState(Dimensions.get('window'));
  const [searchQuery, setSearchQuery]           = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [dropdownOpen, setDropdownOpen]         = useState(false);
  const [products, setProducts]                 = useState<Product[]>([]);
  const [categories, setCategories]             = useState<Category[]>([]);
  const [loading, setLoading]                   = useState(true);
  const [error, setError]                       = useState<string | null>(null);
  const [searchFocused, setSearchFocused]       = useState(false);

  const isWeb = Platform.OS === 'web';

  // Effective grid width — capped to MAX_CONTENT_WIDTH on web
  const effectiveWidth = isWeb
    ? Math.min(dimensions.width, MAX_CONTENT_WIDTH) - PADDING * 2
    : dimensions.width - PADDING * 2;
  const columns   = getColumns(dimensions.width);
  const cardWidth = Math.floor((effectiveWidth - GAP * (columns - 1)) / columns);

  // ─── Dimension listener ──────────────────────────────────────────────
  useEffect(() => {
    const sub = Dimensions.addEventListener('change', ({ window }) =>
      setDimensions(window)
    );
    return () => sub?.remove();
  }, []);

  // ─── Load data ───────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const [prodRes, catRes] = await Promise.all([
          getProducts({ status: 'active' }),
          getCategories(),
        ]);
        if (prodRes.success && prodRes.data) setProducts(prodRes.data);
        if (catRes.success  && catRes.data)  setCategories(catRes.data);
      } catch {
        setError('Failed to load products. Please try again.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ─── Derived values ──────────────────────────────────────────────────
  const filtered = products.filter((p) => {
    const matchCat    = selectedCategory === 'all' || p.category.id === selectedCategory;
    const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  const selectedCatName =
    selectedCategory === 'all'
      ? 'All'
      : (categories.find((c) => c.id === selectedCategory)?.name ?? 'All');

  const selectCategory = (id: string) => {
    setSelectedCategory(id);
    setDropdownOpen(false);
  };

  // ─── Centered column style (web only) ───────────────────────────────
  const centeredCol = isWeb
    ? { width: '100%' as const, maxWidth: MAX_CONTENT_WIDTH, alignSelf: 'center' as const }
    : { width: '100%' as const };

  // ─── Render card ─────────────────────────────────────────────────────
  const renderCard = useCallback(
    (product: Product) => {
      const thumb = product.images?.[0];
      const isOOS = product.is_out_of_stock || product.stock === 0;

      return (
        <TouchableOpacity
          key={product.id}
          style={[styles.card, { width: cardWidth }]}
          activeOpacity={0.85}
          onPress={() =>
            (navigation as any).navigate('ProductDetail', { productId: product.id })
          }
        >
          {/* ── Image: 1:1 square, like Shopee/Lazada ── */}
          <View style={[styles.cardImageWrap, { height: cardWidth }]}>
            {thumb ? (
              <Image
                source={{ uri: thumb }}
                style={styles.cardImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.cardImagePlaceholder}>
                <Ionicons name="leaf-outline" size={32} color="#a5c890" />
                <Text style={styles.cardImagePlaceholderText}>No image</Text>
              </View>
            )}

            {/* OOS overlay */}
            {isOOS && (
              <View style={styles.oosOverlay}>
                <Text style={styles.oosText}>Out of Stock</Text>
              </View>
            )}

            {/* Multi-image indicator */}
            {(product.images?.length ?? 0) > 1 && (
              <View style={styles.imageCountBadge}>
                <Ionicons name="images-outline" size={11} color="#fff" />
                <Text style={styles.imageCountText}>
                  {product.images.length}
                </Text>
              </View>
            )}
          </View>

          {/* ── Body ── */}
          <View style={styles.cardBody}>
            <Text style={styles.cardCategory} numberOfLines={1}>
              {product.category.name}
            </Text>
            <Text style={styles.cardName} numberOfLines={2}>
              {product.name}
            </Text>
            <View style={styles.cardFooter}>
              <Text style={styles.cardPrice}>
                ₱{product.price.toFixed(2)}
              </Text>
              <View style={[styles.stockBadge, isOOS && styles.stockBadgeOOS]}>
                <Text style={[styles.stockText, isOOS && styles.stockTextOOS]}>
                  {isOOS ? 'OOS' : String(product.stock)}
                </Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      );
    },
    [cardWidth, navigation]
  );

  // ─── Render ──────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      {/*
        ╔══════════════════════════════════════════════════════════════════╗
        ║  Single outer ScrollView that scrolls EVERYTHING together:      ║
        ║  header → dropdown panel (in-flow) → product grid               ║
        ║                                                                  ║
        ║  The dropdown is NOT absolutely positioned — it lives in the    ║
        ║  normal layout flow so it pushes the grid down and is fully     ║
        ║  visible on both mobile and web without overlapping cards.       ║
        ╚══════════════════════════════════════════════════════════════════╝
      */}
      <ScrollView
        style={styles.outerScroll}
        contentContainerStyle={styles.outerScrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onScrollBeginDrag={() => setDropdownOpen(false)}
      >

        {/* ══ HEADER ══ */}
        <View style={styles.headerBar}>
          <View style={centeredCol}>
            <View style={styles.headerInner}>

              {/* Title + item count */}
              <View style={styles.headerTopRow}>
                <View style={styles.headerTitleRow}>
                  <Text style={styles.headerTitle}>Marketplace</Text>
                  <View style={styles.headerDot} />
                </View>
                <Text style={styles.headerCount}>
                  {loading
                    ? '…'
                    : `${filtered.length} item${filtered.length !== 1 ? 's' : ''}`}
                </Text>
              </View>

              {/* Search bar + category trigger */}
              <View style={styles.controlsRow}>
                <View
                  style={[
                    styles.searchWrap,
                    searchFocused && styles.searchWrapFocused,
                  ]}
                >
                  <Ionicons name="search-outline" size={17} color="#7aad4e" />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search products…"
                    placeholderTextColor="#a8c48a"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    onFocus={() => setSearchFocused(true)}
                    onBlur={() => setSearchFocused(false)}
                  />
                  {searchQuery.length > 0 && (
                    <TouchableOpacity
                      onPress={() => setSearchQuery('')}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="close-circle" size={16} color="#a8c48a" />
                    </TouchableOpacity>
                  )}
                </View>

                <TouchableOpacity
                  style={[
                    styles.categoryTrigger,
                    dropdownOpen && styles.categoryTriggerOpen,
                  ]}
                  onPress={() => setDropdownOpen((v) => !v)}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="filter-outline"
                    size={14}
                    color={dropdownOpen ? '#fff' : '#5a8c35'}
                  />
                  <Text
                    style={[
                      styles.categoryTriggerText,
                      dropdownOpen && styles.categoryTriggerTextOpen,
                    ]}
                    numberOfLines={1}
                  >
                    {selectedCatName}
                  </Text>
                  <Ionicons
                    name={dropdownOpen ? 'chevron-up' : 'chevron-down'}
                    size={14}
                    color={dropdownOpen ? '#fff' : '#5a8c35'}
                  />
                </TouchableOpacity>
              </View>

            </View>
          </View>
        </View>

        {/* ══ CATEGORY DROPDOWN PANEL (in-flow) ══
            Renders immediately below the header in normal layout flow.
            A ScrollView inside caps the height at 260px so 5+ categories scroll.
        */}
        {dropdownOpen && (
          <View style={styles.dropdownPanel}>
            <View style={[styles.dropdownPanelInner, centeredCol]}>

              {/* Panel header */}
              <View style={styles.dropdownPanelHeader}>
                <Text style={styles.dropdownPanelHeaderText}>
                  Filter by Category
                </Text>
                <TouchableOpacity
                  style={styles.dropdownCloseBtn}
                  onPress={() => setDropdownOpen(false)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close" size={14} color="#4a6635" />
                </TouchableOpacity>
              </View>

              {/* Scrollable category list */}
              <ScrollView
                style={styles.dropdownScrollView}
                showsVerticalScrollIndicator={true}
                bounces={false}
                nestedScrollEnabled={true}
                keyboardShouldPersistTaps="handled"
              >
                {/* All */}
                <TouchableOpacity
                  style={[
                    styles.dropdownItem,
                    selectedCategory === 'all' && styles.dropdownItemActive,
                  ]}
                  onPress={() => selectCategory('all')}
                  activeOpacity={0.75}
                >
                  <View
                    style={[
                      styles.dropdownDot,
                      selectedCategory === 'all' && styles.dropdownDotActive,
                    ]}
                  />
                  <Text
                    style={[
                      styles.dropdownItemText,
                      selectedCategory === 'all' && styles.dropdownItemTextActive,
                    ]}
                  >
                    All Categories
                  </Text>
                  {selectedCategory === 'all' && (
                    <View style={styles.dropdownCheckCircle}>
                      <Ionicons name="checkmark" size={13} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>

                {/* Category items */}
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.dropdownItem,
                      selectedCategory === cat.id && styles.dropdownItemActive,
                    ]}
                    onPress={() => selectCategory(cat.id)}
                    activeOpacity={0.75}
                  >
                    <View
                      style={[
                        styles.dropdownDot,
                        selectedCategory === cat.id && styles.dropdownDotActive,
                      ]}
                    />
                    <Text
                      style={[
                        styles.dropdownItemText,
                        selectedCategory === cat.id &&
                          styles.dropdownItemTextActive,
                      ]}
                    >
                      {cat.name}
                    </Text>
                    {selectedCategory === cat.id && (
                      <View style={styles.dropdownCheckCircle}>
                        <Ionicons name="checkmark" size={13} color="#fff" />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>

            </View>
          </View>
        )}

        {/* ══ PRODUCT GRID ══ */}
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#3d6b22" />
            <Text style={styles.loadingText}>Loading products…</Text>
          </View>
        ) : error ? (
          <View style={styles.centered}>
            <Ionicons name="alert-circle-outline" size={48} color="#b83232" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.centered}>
            <Ionicons name="leaf-outline" size={54} color="#c8e8b0" />
            <Text style={styles.emptyText}>No products found</Text>
            <Text style={styles.emptySubText}>
              Try a different search or category
            </Text>
          </View>
        ) : (
          <View style={[styles.feedWrap, centeredCol]}>
            {/* Results count */}
            <View style={styles.resultsBar}>
              <Text style={styles.resultsText}>
                {filtered.length} RESULT{filtered.length !== 1 ? 'S' : ''}
                {selectedCategory !== 'all' ? ` · ${selectedCatName}` : ''}
              </Text>
            </View>

            {/* Grid */}
            <View style={[styles.grid, { gap: GAP }]}>
              {filtered.map(renderCard)}
            </View>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
};

export default MarketScreen;