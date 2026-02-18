import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  Image,
  TouchableOpacity,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ActivityIndicator,
  Platform,
  Dimensions,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Product } from '../Types/product';
import { getProduct } from '../Services/productApi';
import {
  styles,
  DESKTOP_BREAKPOINT,
} from '../Styles/ProductDetailScreen.styles';

// ─── Types ────────────────────────────────────────────────────────────────────

type RootStackParamList = {
  Market: undefined;
  ProductDetail: { productId: string };
};

type Props = {
  navigation: StackNavigationProp<RootStackParamList, 'ProductDetail'>;
  route:      RouteProp<RootStackParamList, 'ProductDetail'>;
};

// ─── Web-safe root container ──────────────────────────────────────────────────
// SafeAreaView on web renders as an unsized div — it never constrains height,
// so the inner ScrollView can't scroll (it just grows to fit all content).
// Using a plain View on web, combined with the height:'100vh' style, fixes this.
const RootContainer = Platform.OS === 'web' ? View : SafeAreaView;

// ─── Image Carousel ───────────────────────────────────────────────────────────

interface CarouselProps {
  images:      string[];
  imageWidth:  number;
  imageHeight: number;
}

const ImageCarousel: React.FC<CarouselProps> = ({ images, imageWidth, imageHeight }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const flatRef = useRef<FlatList>(null);

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const idx = Math.round(e.nativeEvent.contentOffset.x / imageWidth);
      setActiveIndex(idx);
    },
    [imageWidth],
  );

  const goTo = (idx: number) => {
    flatRef.current?.scrollToIndex({ index: idx, animated: true });
    setActiveIndex(idx);
  };

  if (!images || images.length === 0) {
    return (
      <View style={[styles.carouselPlaceholder, { width: imageWidth, height: imageHeight }]}>
        <Ionicons name="leaf-outline" size={52} color="#a5c890" />
        <Text style={styles.carouselPlaceholderText}>No images available</Text>
      </View>
    );
  }

  if (images.length === 1) {
    return (
      <View style={{ width: imageWidth, height: imageHeight, backgroundColor: '#e8f5dc' }}>
        <Image source={{ uri: images[0] }} style={styles.carouselImage} resizeMode="cover" />
      </View>
    );
  }

  const arrowTop = Math.floor(imageHeight / 2) - 19;

  return (
    <View style={{ width: imageWidth, height: imageHeight + 36 }}>
      <FlatList
        ref={flatRef}
        data={images}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        keyExtractor={(_, i) => String(i)}
        renderItem={({ item }) => (
          <View style={{ width: imageWidth, height: imageHeight, backgroundColor: '#e8f5dc' }}>
            <Image source={{ uri: item }} style={styles.carouselImage} resizeMode="cover" />
          </View>
        )}
        getItemLayout={(_, i) => ({ length: imageWidth, offset: imageWidth * i, index: i })}
      />

      {/* Dots */}
      <View style={styles.dotsRow}>
        {images.map((_, i) => (
          <TouchableOpacity
            key={i}
            onPress={() => goTo(i)}
            hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
          >
            <View style={[styles.dot, i === activeIndex ? styles.dotActive : styles.dotInactive]} />
          </TouchableOpacity>
        ))}
      </View>

      {/* Arrows */}
      {activeIndex > 0 && (
        <TouchableOpacity
          style={[styles.arrowBtn, styles.arrowLeft, { top: arrowTop }]}
          onPress={() => goTo(activeIndex - 1)}
          activeOpacity={0.8}
        >
          <Ionicons name="chevron-back" size={20} color="#fff" />
        </TouchableOpacity>
      )}
      {activeIndex < images.length - 1 && (
        <TouchableOpacity
          style={[styles.arrowBtn, styles.arrowRight, { top: arrowTop }]}
          onPress={() => goTo(activeIndex + 1)}
          activeOpacity={0.8}
        >
          <Ionicons name="chevron-forward" size={20} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Counter */}
      <View style={styles.counterChip}>
        <Text style={styles.counterText}>{activeIndex + 1} / {images.length}</Text>
      </View>
    </View>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────

const ProductDetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const { productId } = route.params;

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));

  const isWeb = Platform.OS === 'web';

  // ─── Dimension listener ──────────────────────────────────────────────
  useEffect(() => {
    const sub = Dimensions.addEventListener('change', ({ window }) =>
      setDimensions(window)
    );
    return () => sub?.remove();
  }, []);

  const contentWidth = dimensions.width;

  // ─── Centered column style (web only) ───────────────────────────────
  const centeredCol = isWeb
    ? { width: '100%' as const, maxWidth: contentWidth, alignSelf: 'center' as const }
    : { width: '100%' as const };

  // ─── Fetch product ───────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await getProduct(productId);
        if (res.success && res.data) setProduct(res.data);
        else setError(res.message || 'Product not found');
      } catch {
        setError('Failed to load product');
      } finally {
        setLoading(false);
      }
    })();
  }, [productId]);

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <RootContainer style={styles.safeArea}>
        <View style={styles.stateWrap}>
          <ActivityIndicator size="large" color="#3d6b22" />
          <Text style={[styles.stateText, { color: '#7a9460' }]}>Loading…</Text>
        </View>
      </RootContainer>
    );
  }

  // ── Error state ────────────────────────────────────────────────────────────
  if (error || !product) {
    return (
      <RootContainer style={styles.safeArea}>
        <View style={styles.stateWrap}>
          <Ionicons name="alert-circle-outline" size={48} color="#b83232" />
          <Text style={[styles.stateText, { color: '#b83232' }]}>
            {error || 'Product not found'}
          </Text>
        </View>
      </RootContainer>
    );
  }

  // ── Derived values ─────────────────────────────────────────────────────────
  const isOOS     = product.is_out_of_stock || product.stock === 0;
  const isDesktop = contentWidth >= DESKTOP_BREAKPOINT;

  const statusColor =
    product.status === 'active' ? '#2d7a28' :
    product.status === 'draft'  ? '#c47c00' : '#888888';
  const statusBg =
    product.status === 'active' ? '#e6f5e4' :
    product.status === 'draft'  ? '#fff6e0' : '#f0f0f0';

  const DESKTOP_PAD = 24;
  const DESKTOP_GAP = 24;

  const desktopColWidth = isDesktop
    ? Math.floor((contentWidth - DESKTOP_PAD * 2 - DESKTOP_GAP) / 2)
    : 0;

  const imageWidth  = isDesktop ? desktopColWidth : contentWidth;
  const imageHeight = isDesktop
    ? Math.min(Math.floor(desktopColWidth * 0.88), 420)
    : Math.min(Math.floor(contentWidth * 0.8), 360);

  // ── Content panel ──────────────────────────────────────────────────────────
  const renderContent = () => (
    <>
      {/* Category + name */}
      <View style={styles.productHeader}>
        <View style={styles.categoryChip}>
          <Ionicons name="pricetag-outline" size={11} color="#5a8c35" />
          <Text style={styles.categoryChipText}>{product.category.name}</Text>
        </View>
        <Text style={styles.productName}>{product.name}</Text>
      </View>

      {/* Price + status */}
      <View style={styles.priceStatusRow}>
        <Text style={styles.price}>₱{product.price.toFixed(2)}</Text>
        <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusText, { color: statusColor }]}>
            {product.status.charAt(0).toUpperCase() + product.status.slice(1)}
          </Text>
        </View>
      </View>

      {/* Stock */}
      <View style={styles.stockRow}>
        <View style={[styles.stockPill, isOOS && styles.stockPillOOS]}>
          <Ionicons
            name={isOOS ? 'close-circle-outline' : 'checkmark-circle-outline'}
            size={15}
            color={isOOS ? '#b83232' : '#2d7a28'}
          />
          <Text style={[styles.stockPillText, isOOS && styles.stockPillTextOOS]}>
            {isOOS ? 'Out of Stock' : `${product.stock} in stock`}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      {/* Description */}
      {!!product.description && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>About this product</Text>
          <Text style={styles.descriptionText}>{product.description}</Text>
        </View>
      )}

      {/* Nutrition */}
      {(product.nutrition?.length ?? 0) > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Nutritional Information</Text>
          <View style={styles.nutritionTable}>
            <View style={styles.nutritionHeader}>
              <Text style={styles.nutritionHeaderText}>Nutrient</Text>
              <Text style={styles.nutritionHeaderText}>Amount</Text>
            </View>
            {product.nutrition.map((entry, idx) => (
              <View
                key={entry.id ?? idx}
                style={[styles.nutritionRow, idx % 2 === 0 && styles.nutritionRowAlt]}
              >
                <Text style={styles.nutritionLabel}>{entry.label}</Text>
                <Text style={styles.nutritionAmount}>{entry.amount}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Details grid */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Details</Text>
        <View style={styles.metaGrid}>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Category</Text>
            <Text style={styles.metaValue}>{product.category.name}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Price</Text>
            <Text style={styles.metaValue}>₱{product.price.toFixed(2)}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Stock</Text>
            <Text style={styles.metaValue}>{product.stock}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Status</Text>
            <Text style={styles.metaValue}>
              {product.status.charAt(0).toUpperCase() + product.status.slice(1)}
            </Text>
          </View>
        </View>
      </View>
    </>
  );

  // ── Main render ────────────────────────────────────────────────────────────
  return (
    <RootContainer style={styles.safeArea}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Top bar */}
        <View style={styles.topBar}>
          <View style={centeredCol}>
            <View style={styles.topBarInner}>
              <TouchableOpacity
                style={styles.backBtn}
                onPress={() => navigation.goBack()}
                activeOpacity={0.75}
              >
                <Ionicons name="arrow-back" size={18} color="#2e4420" />
                <Text style={styles.backText}>Market</Text>
              </TouchableOpacity>
              <Text style={styles.topBarTitle} numberOfLines={1}>
                {product.name}
              </Text>
            </View>
          </View>
        </View>

        {/* Content wrapper with centered column */}
        <View style={centeredCol}>
          {isDesktop ? (
            /* ══ DESKTOP: side-by-side ══ */
            <View style={styles.desktopRow}>
              <View style={[styles.desktopImageCol, { width: desktopColWidth }]}>
                <ImageCarousel
                  images={product.images ?? []}
                  imageWidth={desktopColWidth}
                  imageHeight={imageHeight}
                />
              </View>
              <View style={styles.desktopContentCard}>
                {renderContent()}
              </View>
            </View>
          ) : (
            /* ══ MOBILE / NARROW: stacked ══ */
            <>
              <View style={styles.mobileImageWrap}>
                <ImageCarousel
                  images={product.images ?? []}
                  imageWidth={imageWidth}
                  imageHeight={imageHeight}
                />
              </View>
              <View style={styles.mobileContentCard}>
                {renderContent()}
              </View>
            </>
          )}

          <View style={{ height: 40 }} />
        </View>
      </ScrollView>
    </RootContainer>
  );
};

export default ProductDetailScreen;