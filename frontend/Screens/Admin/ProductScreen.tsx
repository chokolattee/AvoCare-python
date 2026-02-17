import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Dimensions,
  SafeAreaView,
  RefreshControl,
  Image,
  Modal,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Picker } from '@react-native-picker/picker';
import {
  getProducts,
  getCategories,
  createCategory,
  createProduct,
  updateProduct,
  archiveProduct,
  restoreProduct,
} from '../../Services/productApi';
import {
  Product,
  Category,
  NutritionEntry,
  ProductFormData,
  ProductStatus,
} from '../../Types/product';
import { styles } from '../../Styles/ProductScreen.styles';

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_FILTERS: Array<'all' | ProductStatus> = ['all', 'active', 'draft', 'archived'];

const EMPTY_FORM: ProductFormData = {
  name: '',
  description: '',
  category: '',
  price: 0,
  stock: 0,
  images: [],
  nutrition: [],
  status: 'draft',
};

// ─── Platform-aware image appender ───────────────────────────────────────────
// Mirrors the same helper in productApi.ts so both paths stay in sync.
async function appendImageToFormData(
  formData: FormData,
  uri: string,
  index: number
): Promise<void> {
  const filename = `product_${Date.now()}_${index}.jpg`;
  if (Platform.OS === 'web') {
    const res  = await fetch(uri);
    const blob = await res.blob();
    formData.append('images', blob, filename);
  } else {
    formData.append('images', { uri, name: filename, type: 'image/jpeg' } as any);
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

const ProductScreen = () => {
  // ─── Layout ──────────────────────────────────────────────────────────────
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));
  const isDesktop = dimensions.width >= 768;

  // ─── Data ────────────────────────────────────────────────────────────────
  const [products, setProducts]                 = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [categories, setCategories]             = useState<Category[]>([]);

  // ─── UI State ────────────────────────────────────────────────────────────
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updating, setUpdating]     = useState(false);

  // ─── Filters ─────────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery]       = useState('');
  const [filterStatus, setFilterStatus]     = useState<'all' | ProductStatus>('all');
  const [filterCategory, setFilterCategory] = useState('all');

  // ─── Modals ──────────────────────────────────────────────────────────────
  const [modalVisible, setModalVisible]           = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showCreateModal, setShowCreateModal]     = useState(false);

  // ─── Form ────────────────────────────────────────────────────────────────
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [formData, setFormData]               = useState<ProductFormData>(EMPTY_FORM);

  // Quick-create modal state
  const [quickForm, setQuickForm]       = useState<ProductFormData>({ ...EMPTY_FORM });
  const [quickImages, setQuickImages]   = useState<string[]>([]);
  const [quickLoading, setQuickLoading] = useState(false);

  const [newCategoryName, setNewCategoryName] = useState('');

  // ─── Dimension listener ──────────────────────────────────────────────────

  useEffect(() => {
    const sub = Dimensions.addEventListener('change', ({ window }) => setDimensions(window));
    return () => sub?.remove();
  }, []);

  // ─── Initial load ────────────────────────────────────────────────────────

  useEffect(() => { fetchData(); }, []);

  // ─── Filter products whenever deps change ────────────────────────────────

  useEffect(() => { applyFilters(); }, [searchQuery, products, filterStatus, filterCategory]);

  // ─── Data fetching ───────────────────────────────────────────────────────

  const fetchData = async () => {
    try {
      setLoading(true);
      await Promise.all([fetchProducts(), fetchCategories()]);
    } catch (error) {
      console.error('fetchData error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    const response = await getProducts();
    if (response.success && response.data) {
      setProducts(response.data);
    } else {
      Alert.alert('Error', response.message || 'Failed to fetch products');
    }
  };

  const fetchCategories = async () => {
    const response = await getCategories();
    if (response.success && response.data) {
      setCategories(response.data);
    } else {
      Alert.alert('Error', response.message || 'Failed to fetch categories');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  // ─── Filtering ───────────────────────────────────────────────────────────

  const applyFilters = () => {
    let filtered = [...products];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q)
      );
    }
    if (filterStatus !== 'all') {
      filtered = filtered.filter((p) => p.status === filterStatus);
    }
    if (filterCategory !== 'all') {
      filtered = filtered.filter((p) => p.category.id === filterCategory);
    }
    setFilteredProducts(filtered);
  };

  // ─── Modal helpers ───────────────────────────────────────────────────────

  const openModal = (product?: Product) => {
    if (product) {
      setSelectedProduct(product);
      setFormData({
        name:        product.name,
        description: product.description,
        category:    product.category.id,
        price:       product.price,
        stock:       product.stock,
        images:      product.images,   // these are https:// Cloudinary URLs
        nutrition:   product.nutrition,
        status:      product.status,
      });
    } else {
      setSelectedProduct(null);
      setFormData({ ...EMPTY_FORM, category: categories[0]?.id || '' });
    }
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedProduct(null);
  };

  // ─── Quick Create Modal Handlers ─────────────────────────────────────────

  const openQuickCreateModal = () => {
    setQuickForm({ ...EMPTY_FORM, category: categories[0]?.id || '' });
    setQuickImages([]);
    setQuickLoading(false);
    setShowCreateModal(true);
  };

  const closeQuickCreateModal = () => setShowCreateModal(false);

  // ─── Image picking ───────────────────────────────────────────────────────

  const pickImages = async (
    onPicked: (uris: string[]) => void,
    currentCount: number
  ) => {
    try {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Camera roll permission is required');
          return;
        }
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
        base64: false,
      });
      if (!result.canceled) {
        const newUris = result.assets.map((a) => a.uri);
        onPicked(newUris);
      }
    } catch {
      Alert.alert('Error', 'Failed to pick images');
    }
  };

  const handleImagePick = () =>
    pickImages((newUris) => {
      setFormData((prev) => ({
        ...prev,
        images: [...prev.images, ...newUris].slice(0, 5),
      }));
    }, formData.images.length);

  const handleQuickImagePick = () =>
    pickImages((newUris) => {
      setQuickImages((prev) => [...prev, ...newUris].slice(0, 5));
    }, quickImages.length);

  const removeImage = (index: number) =>
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));

  const removeQuickImage = (idx: number) =>
    setQuickImages((prev) => prev.filter((_, i) => i !== idx));

  // ─── Nutrition handling ──────────────────────────────────────────────────

  const addNutritionEntry = () => {
    const newEntry: NutritionEntry = { label: '', amount: '' };
    setFormData((prev) => ({ ...prev, nutrition: [...prev.nutrition, newEntry] }));
  };

  const updateNutritionEntry = (index: number, field: 'label' | 'amount', value: string) => {
    setFormData((prev) => {
      const updated = [...prev.nutrition];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, nutrition: updated };
    });
  };

  const removeNutritionEntry = (index: number) =>
    setFormData((prev) => ({
      ...prev,
      nutrition: prev.nutrition.filter((_, i) => i !== index),
    }));

  // ─── Category creation ───────────────────────────────────────────────────

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      Alert.alert('Validation Error', 'Category name is required');
      return;
    }
    setUpdating(true);
    try {
      const response = await createCategory(newCategoryName.trim());
      if (response.success && response.data) {
        await fetchCategories();
        setFormData((prev) => ({ ...prev, category: response.data!.id }));
        setShowCategoryModal(false);
        setNewCategoryName('');
        Alert.alert('Success', 'Category added');
      } else {
        Alert.alert('Error', response.message || 'Failed to add category');
      }
    } catch {
      Alert.alert('Error', 'Failed to add category');
    } finally {
      setUpdating(false);
    }
  };

  // ─── Build FormData payload (shared by create & update) ──────────────────
  // Uses appendImageToFormData which is platform-aware (blob on web, {uri} on native).

  const buildPayload = async (
    form: ProductFormData,
    localImageUris: string[],
    extraFields?: Record<string, string>
  ): Promise<FormData> => {
    const payload = new FormData();
    payload.append('name',        form.name.trim());
    payload.append('description', form.description.trim());
    payload.append('category',    form.category);
    payload.append('price',       form.price.toString());
    payload.append('stock',       form.stock.toString());
    payload.append('status',      form.status);
    payload.append('nutrition',   JSON.stringify(
      form.nutrition.filter((n) => n.label.trim() && n.amount.trim())
    ));

    if (extraFields) {
      Object.entries(extraFields).forEach(([k, v]) => payload.append(k, v));
    }

    for (let i = 0; i < localImageUris.length; i++) {
      await appendImageToFormData(payload, localImageUris[i], i);
    }

    return payload;
  };

  // ─── Quick Create ─────────────────────────────────────────────────────────

  const handleQuickCreate = async () => {
    if (!quickForm.name.trim()) {
      Alert.alert('Validation Error', 'Product name is required');
      return;
    }
    if (!quickForm.category) {
      Alert.alert('Validation Error', 'Please select a category');
      return;
    }
    if (quickForm.price <= 0) {
      Alert.alert('Validation Error', 'Price must be greater than 0');
      return;
    }
    if (quickForm.stock < 0) {
      Alert.alert('Validation Error', 'Stock cannot be negative');
      return;
    }

    setQuickLoading(true);
    try {
      const payload  = await buildPayload(quickForm, quickImages);
      const response = await createProduct(payload);
      if (response.success) {
        Alert.alert('Success', 'Product created successfully');
        closeQuickCreateModal();
        await fetchProducts();
      } else {
        Alert.alert('Error', response.message || 'Failed to create product');
      }
    } catch (error) {
      console.error('[ProductScreen] handleQuickCreate error:', error);
      Alert.alert('Error', 'Failed to create product');
    } finally {
      setQuickLoading(false);
    }
  };

  // ─── Create / Update ─────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Validation Error', 'Product name is required');
      return;
    }
    if (!formData.category) {
      Alert.alert('Validation Error', 'Please select a category');
      return;
    }
    if (formData.price <= 0) {
      Alert.alert('Validation Error', 'Price must be greater than 0');
      return;
    }
    if (formData.stock < 0) {
      Alert.alert('Validation Error', 'Stock cannot be negative');
      return;
    }

    setUpdating(true);
    try {
      // Split into existing Cloudinary URLs (keep) vs new local picks (upload)
      const existingImages = formData.images.filter(
        (img) => img.startsWith('http://') || img.startsWith('https://')
      );
      const newLocalImages = formData.images.filter(
        (img) => !img.startsWith('http://') && !img.startsWith('https://')
      );

      console.log('[ProductScreen] handleSubmit images:', {
        total:    formData.images.length,
        existing: existingImages.length,
        newLocal: newLocalImages.length,
      });

      let payload: FormData;
      let response;

      if (selectedProduct) {
        // UPDATE — tell backend which existing URLs to keep, then upload new ones
        payload = await buildPayload(
          formData,
          newLocalImages,
          { keepImageUrls: JSON.stringify(existingImages) }
        );
        response = await updateProduct(selectedProduct.id, payload);
      } else {
        // CREATE — all picked images are new local URIs
        payload  = await buildPayload(formData, newLocalImages);
        response = await createProduct(payload);
      }

      if (response.success) {
        Alert.alert('Success', `Product ${selectedProduct ? 'updated' : 'created'} successfully`);
        closeModal();
        await fetchProducts();
      } else {
        Alert.alert('Error', response.message || 'Failed to save product');
      }
    } catch (error) {
      console.error('[ProductScreen] handleSubmit error:', error);
      Alert.alert('Error', 'Failed to save product');
    } finally {
      setUpdating(false);
    }
  };

  // ─── Archive / Restore ───────────────────────────────────────────────────

  const handleArchive = (product: Product) => {
    Alert.alert(
      'Archive Product',
      `Are you sure you want to archive "${product.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Archive',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await archiveProduct(product.id);
              if (response.success) {
                Alert.alert('Success', 'Product archived successfully');
                await fetchProducts();
              } else {
                Alert.alert('Error', response.message || 'Failed to archive product');
              }
            } catch {
              Alert.alert('Error', 'Failed to archive product');
            }
          },
        },
      ]
    );
  };

  const handleRestore = async (product: Product) => {
    try {
      const response = await restoreProduct(product.id);
      if (response.success) {
        Alert.alert('Success', 'Product restored successfully');
        await fetchProducts();
      } else {
        Alert.alert('Error', response.message || 'Failed to restore product');
      }
    } catch {
      Alert.alert('Error', 'Failed to restore product');
    }
  };

  // ─── Table row ───────────────────────────────────────────────────────────

  const renderTableRow = (product: Product) => {
    const statusColor =
      product.status === 'active'
        ? '#10b981'
        : product.status === 'draft'
        ? '#f59e0b'
        : '#6b7280';

    return (
      <View key={product.id} style={styles.tableRow}>
        <View style={styles.tableCell}>
          {product.images.length > 0 ? (
            <Image source={{ uri: product.images[0] }} style={styles.thumbnailImage} />
          ) : (
            <View style={styles.thumbnailPlaceholder}>
              <Ionicons name="image-outline" size={20} color="#9ca3af" />
            </View>
          )}
        </View>

        <View style={[styles.tableCell, styles.tableCellName]}>
          <Text style={styles.tableCellText} numberOfLines={2}>{product.name}</Text>
        </View>

        <View style={styles.tableCell}>
          <Text style={styles.tableCellText}>{product.category.name}</Text>
        </View>

        <View style={styles.tableCell}>
          <Text style={styles.tableCellText}>₱{product.price.toFixed(2)}</Text>
        </View>

        <View style={styles.tableCell}>
          <Text
            style={[
              styles.tableCellText,
              product.is_out_of_stock && styles.outOfStockValue,
            ]}
          >
            {product.stock}
          </Text>
        </View>

        <View style={styles.tableCell}>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>{product.status}</Text>
          </View>
        </View>

        <View style={[styles.tableCell, styles.actionsCell]}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => openModal(product)}
            disabled={product.status === 'archived'}
          >
            <Ionicons
              name="create-outline"
              size={20}
              color={product.status === 'archived' ? '#d1d5db' : '#3b82f6'}
            />
          </TouchableOpacity>

          {product.status === 'archived' ? (
            <TouchableOpacity style={styles.iconButton} onPress={() => handleRestore(product)}>
              <Ionicons name="refresh-outline" size={20} color="#10b981" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.iconButton} onPress={() => handleArchive(product)}>
              <Ionicons name="archive-outline" size={20} color="#ef4444" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.title}>Product Management</Text>
        <TouchableOpacity style={styles.addButton} onPress={openQuickCreateModal}>
          <Ionicons name="add-circle" size={24} color="#fff" />
          <Text style={styles.addButtonText}>Add Product</Text>
        </TouchableOpacity>
      </View>

      {/* ── Quick Create Modal ── */}
      <Modal
        visible={showCreateModal}
        animationType="fade"
        transparent
        onRequestClose={closeQuickCreateModal}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isDesktop && styles.modalContentDesktop]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Product</Text>
              <TouchableOpacity onPress={closeQuickCreateModal}>
                <Ionicons name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Product Name <Text style={styles.required}>*</Text></Text>
                <TextInput
                  style={styles.input}
                  value={quickForm.name}
                  onChangeText={t => setQuickForm(p => ({ ...p, name: t }))}
                  placeholder="Enter product name"
                  placeholderTextColor="#9ca3af"
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={quickForm.description}
                  onChangeText={t => setQuickForm(p => ({ ...p, description: t }))}
                  placeholder="Enter product description"
                  placeholderTextColor="#9ca3af"
                  multiline
                  numberOfLines={3}
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Category <Text style={styles.required}>*</Text></Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={quickForm.category}
                    onValueChange={v => setQuickForm(p => ({ ...p, category: v }))}
                    style={styles.picker}
                  >
                    <Picker.Item label="Select a category" value="" />
                    {categories.map(cat => (
                      <Picker.Item key={cat.id} label={cat.name} value={cat.id} />
                    ))}
                  </Picker>
                </View>
              </View>
              <View style={styles.rowGroup}>
                <View style={[styles.formGroup, styles.halfWidth]}>
                  <Text style={styles.label}>Price (₱) <Text style={styles.required}>*</Text></Text>
                  <TextInput
                    style={styles.input}
                    value={quickForm.price === 0 ? '' : quickForm.price.toString()}
                    onChangeText={t => setQuickForm(p => ({ ...p, price: parseFloat(t) || 0 }))}
                    placeholder="0.00"
                    placeholderTextColor="#9ca3af"
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={[styles.formGroup, styles.halfWidth]}>
                  <Text style={styles.label}>Stock <Text style={styles.required}>*</Text></Text>
                  <TextInput
                    style={styles.input}
                    value={quickForm.stock === 0 ? '' : quickForm.stock.toString()}
                    onChangeText={t => setQuickForm(p => ({ ...p, stock: parseInt(t) || 0 }))}
                    placeholder="0"
                    placeholderTextColor="#9ca3af"
                    keyboardType="number-pad"
                  />
                </View>
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Status</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={quickForm.status}
                    onValueChange={v => setQuickForm(p => ({ ...p, status: v as ProductStatus }))}
                    style={styles.picker}
                  >
                    <Picker.Item label="Draft"    value="draft" />
                    <Picker.Item label="Active"   value="active" />
                    <Picker.Item label="Archived" value="archived" />
                  </Picker>
                </View>
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.label}>
                  Product Images{' '}
                  <Text style={{ color: '#9ca3af', fontSize: 12 }}>({quickImages.length}/5)</Text>
                </Text>
                {quickImages.length < 5 && (
                  <TouchableOpacity style={styles.imagePickerButton} onPress={handleQuickImagePick}>
                    <Ionicons name="cloud-upload-outline" size={20} color="#5d873e" />
                    <Text style={styles.imagePickerText}>Upload Images</Text>
                  </TouchableOpacity>
                )}
                {quickImages.length > 0 && (
                  <ScrollView horizontal style={styles.imagePreviewContainer}>
                    {quickImages.map((uri, idx) => (
                      <View key={idx} style={styles.imagePreview}>
                        <Image source={{ uri }} style={styles.previewImage} />
                        <TouchableOpacity
                          style={styles.removeImageButton}
                          onPress={() => removeQuickImage(idx)}
                        >
                          <Ionicons name="close-circle" size={20} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </ScrollView>
                )}
              </View>
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={closeQuickCreateModal}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.saveButton]}
                  onPress={handleQuickCreate}
                  disabled={quickLoading}
                >
                  {quickLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.saveButtonText}>Create</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Search ── */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#9ca3af" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search products..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9ca3af"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Filters ── */}
      <View style={styles.filterContainer}>
        <View style={styles.filterGroup}>
          <Text style={styles.filterLabel}>Status:</Text>
          <View style={styles.filterButtons}>
            {STATUS_FILTERS.map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.filterButton, filterStatus === s && styles.filterButtonActive]}
                onPress={() => setFilterStatus(s)}
              >
                <Text
                  style={[
                    styles.filterButtonText,
                    filterStatus === s && styles.filterButtonTextActive,
                  ]}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.filterGroup}>
          <Text style={styles.filterLabel}>Category:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.filterButtons}>
              <TouchableOpacity
                style={[styles.filterButton, filterCategory === 'all' && styles.filterButtonActive]}
                onPress={() => setFilterCategory('all')}
              >
                <Text
                  style={[
                    styles.filterButtonText,
                    filterCategory === 'all' && styles.filterButtonTextActive,
                  ]}
                >
                  All
                </Text>
              </TouchableOpacity>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.filterButton,
                    filterCategory === cat.id && styles.filterButtonActive,
                  ]}
                  onPress={() => setFilterCategory(cat.id)}
                >
                  <Text
                    style={[
                      styles.filterButtonText,
                      filterCategory === cat.id && styles.filterButtonTextActive,
                    ]}
                  >
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      </View>

      {/* ── Product table ── */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#5d873e" />
          </View>
        ) : filteredProducts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="basket-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyText}>No products found</Text>
          </View>
        ) : (
          <View style={styles.tableContainer}>
            <View style={styles.tableHeader}>
              {['Image', 'Product Name', 'Category', 'Price', 'Stock', 'Status', 'Actions'].map(
                (col, i) => (
                  <View
                    key={col}
                    style={[
                      styles.tableHeaderCell,
                      i === 1 && styles.tableCellName,
                      i === 6 && styles.actionsCell,
                    ]}
                  >
                    <Text style={styles.tableHeaderText}>{col}</Text>
                  </View>
                )
              )}
            </View>
            <View style={styles.tableBody}>
              {filteredProducts.map(renderTableRow)}
            </View>
          </View>
        )}
      </ScrollView>

      {/* ── Edit / Add Product modal ── */}
      <Modal
        visible={modalVisible}
        animationType="fade"
        transparent
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isDesktop && styles.modalContentDesktop]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedProduct ? 'Edit Product' : 'Add New Product'}
              </Text>
              <TouchableOpacity onPress={closeModal}>
                <Ionicons name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator>

              {/* Name */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>
                  Product Name <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  value={formData.name}
                  onChangeText={(t) => setFormData((p) => ({ ...p, name: t }))}
                  placeholder="Enter product name"
                  placeholderTextColor="#9ca3af"
                />
              </View>

              {/* Description */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={formData.description}
                  onChangeText={(t) => setFormData((p) => ({ ...p, description: t }))}
                  placeholder="Enter product description"
                  placeholderTextColor="#9ca3af"
                  multiline
                  numberOfLines={3}
                />
              </View>

              {/* Category */}
              <View style={styles.formGroup}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>
                    Category <Text style={styles.required}>*</Text>
                  </Text>
                  <TouchableOpacity onPress={() => setShowCategoryModal(true)}>
                    <Text style={styles.addCategoryLink}>+ Add Category</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={formData.category}
                    onValueChange={(v) => setFormData((p) => ({ ...p, category: v }))}
                    style={styles.picker}
                  >
                    <Picker.Item label="Select a category" value="" />
                    {categories.map((cat) => (
                      <Picker.Item key={cat.id} label={cat.name} value={cat.id} />
                    ))}
                  </Picker>
                </View>
              </View>

              {/* Price & Stock */}
              <View style={styles.rowGroup}>
                <View style={[styles.formGroup, styles.halfWidth]}>
                  <Text style={styles.label}>
                    Price (₱) <Text style={styles.required}>*</Text>
                  </Text>
                  <TextInput
                    style={styles.input}
                    value={formData.price === 0 ? '' : formData.price.toString()}
                    onChangeText={(t) =>
                      setFormData((p) => ({ ...p, price: parseFloat(t) || 0 }))
                    }
                    placeholder="0.00"
                    placeholderTextColor="#9ca3af"
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={[styles.formGroup, styles.halfWidth]}>
                  <Text style={styles.label}>
                    Stock <Text style={styles.required}>*</Text>
                  </Text>
                  <TextInput
                    style={styles.input}
                    value={formData.stock === 0 ? '' : formData.stock.toString()}
                    onChangeText={(t) =>
                      setFormData((p) => ({ ...p, stock: parseInt(t) || 0 }))
                    }
                    placeholder="0"
                    placeholderTextColor="#9ca3af"
                    keyboardType="number-pad"
                  />
                </View>
              </View>

              {/* Status */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Status</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={formData.status}
                    onValueChange={(v) =>
                      setFormData((p) => ({ ...p, status: v as ProductStatus }))
                    }
                    style={styles.picker}
                  >
                    <Picker.Item label="Draft"    value="draft" />
                    <Picker.Item label="Active"   value="active" />
                    <Picker.Item label="Archived" value="archived" />
                  </Picker>
                </View>
              </View>

              {/* Images */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>
                  Product Images{' '}
                  <Text style={{ color: '#9ca3af', fontSize: 12 }}>
                    ({formData.images.length}/5)
                  </Text>
                </Text>
                {formData.images.length < 5 && (
                  <TouchableOpacity style={styles.imagePickerButton} onPress={handleImagePick}>
                    <Ionicons name="cloud-upload-outline" size={20} color="#5d873e" />
                    <Text style={styles.imagePickerText}>Upload Images</Text>
                  </TouchableOpacity>
                )}
                {formData.images.length > 0 && (
                  <ScrollView horizontal style={styles.imagePreviewContainer}>
                    {formData.images.map((uri, idx) => (
                      <View key={idx} style={styles.imagePreview}>
                        <Image source={{ uri }} style={styles.previewImage} />
                        <TouchableOpacity
                          style={styles.removeImageButton}
                          onPress={() => removeImage(idx)}
                        >
                          <Ionicons name="close-circle" size={20} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </ScrollView>
                )}
              </View>

              {/* Nutrition */}
              <View style={styles.formGroup}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>
                    Nutritional Information{' '}
                    <Text style={{ color: '#9ca3af', fontSize: 12 }}>
                      ({formData.nutrition.length}{' '}
                      {formData.nutrition.length === 1 ? 'entry' : 'entries'})
                    </Text>
                  </Text>
                  <TouchableOpacity onPress={addNutritionEntry}>
                    <Text style={styles.addLink}>+ Add Entry</Text>
                  </TouchableOpacity>
                </View>
                {formData.nutrition.map((entry, idx) => (
                  <View key={entry.id ?? idx} style={styles.nutritionEntry}>
                    <TextInput
                      style={[styles.input, styles.nutritionInput]}
                      value={entry.label}
                      onChangeText={(t) => updateNutritionEntry(idx, 'label', t)}
                      placeholder="e.g., Calories"
                      placeholderTextColor="#9ca3af"
                    />
                    <TextInput
                      style={[styles.input, styles.nutritionInput]}
                      value={entry.amount}
                      onChangeText={(t) => updateNutritionEntry(idx, 'amount', t)}
                      placeholder="e.g., 160kcal"
                      placeholderTextColor="#9ca3af"
                    />
                    <TouchableOpacity onPress={() => removeNutritionEntry(idx)}>
                      <Ionicons name="trash-outline" size={20} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>

              {/* Submit */}
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={closeModal}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.saveButton]}
                  onPress={handleSubmit}
                  disabled={updating}
                >
                  {updating ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.saveButtonText}>
                      {selectedProduct ? 'Update' : 'Create'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>

            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Add Category modal ── */}
      <Modal
        visible={showCategoryModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowCategoryModal(false)}
      >
        <View style={styles.categoryModalOverlay}>
          <View style={styles.categoryModalContent}>
            <Text style={styles.categoryModalTitle}>Add New Category</Text>
            <TextInput
              style={styles.input}
              value={newCategoryName}
              onChangeText={setNewCategoryName}
              placeholder="Enter category name"
              placeholderTextColor="#9ca3af"
              autoFocus
            />
            <View style={styles.categoryModalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowCategoryModal(false);
                  setNewCategoryName('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleAddCategory}
                disabled={updating}
              >
                {updating ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Add</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
};

export default ProductScreen;