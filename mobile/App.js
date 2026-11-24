import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet, FlatList, Image, SafeAreaView } from 'react-native';
import axios from 'axios';

const API = 'https://step-up-09ee.onrender.com/api';

export default function App() {
  const [screen, setScreen] = useState('home');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [cart, setCart] = useState([]);
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (screen === 'shop') {
      fetchProducts();
    }
  }, [screen]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/products`);
      setProducts(res.data || []);
    } catch (err) {
      console.log('Error fetching products:', err);
    }
    setLoading(false);
  };

  const addToCart = (product) => {
    setCart([...cart, product]);
  };

  // Home Screen
  const HomeScreen = () => (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.heroBanner}>
          <Text style={styles.heroTitle}>StepUp</Text>
          <Text style={styles.heroSubtitle}>Premium Footwear Collection</Text>
          <Text style={styles.heroDesc}>Step into Comfort & Style</Text>
          <TouchableOpacity style={styles.heroCTA} onPress={() => setScreen('shop')}>
            <Text style={styles.heroCTAText}>Shop Now →</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.featuredSection}>
          <Text style={styles.sectionTitle}>Featured Products</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.featuredScroll}>
            {products.slice(0, 5).map((product) => (
              <View key={product.id} style={styles.featuredCard}>
                <View style={styles.productImageLarge}>
                  <Text style={styles.imagePlaceholder}>👟</Text>
                </View>
                <Text style={styles.featuredName}>{product.name}</Text>
                <Text style={styles.featuredPrice}>₹{product.price}</Text>
                <TouchableOpacity style={styles.smallButton} onPress={() => addToCart(product)}>
                  <Text style={styles.smallButtonText}>Add</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </View>

        <View style={styles.categoriesSection}>
          <Text style={styles.sectionTitle}>Categories</Text>
          <View style={styles.categoriesGrid}>
            {['Running', 'Casual', 'Formal', 'Sports'].map((cat) => (
              <TouchableOpacity key={cat} style={styles.categoryCard}>
                <Text style={styles.categoryEmoji}>👟</Text>
                <Text style={styles.categoryName}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.promoSection}>
          <Text style={styles.promoText}>Special Offer</Text>
          <Text style={styles.promoDiscount}>Up to 40% OFF</Text>
          <TouchableOpacity style={styles.promoButton}>
            <Text style={styles.promoButtonText}>Explore Deals</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );

  // Shop Screen
  const ShopScreen = () => (
    <SafeAreaView style={styles.container}>
      <View style={styles.shopHeader}>
        <Text style={styles.shopTitle}>Shop All Products</Text>
        <TouchableOpacity style={styles.filterBtn}>
          <Text style={styles.filterText}>⚙️ Filter</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#EC008C" />
          <Text style={styles.loadingText}>Loading products...</Text>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id.toString()}
          numColumns={2}
          columnWrapperStyle={styles.productRow}
          renderItem={({ item }) => (
            <View style={styles.productItem}>
              <View style={styles.productImage}>
                <Text style={styles.imagePlaceholder}>👟</Text>
              </View>
              <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
              <Text style={styles.productDesc} numberOfLines={1}>{item.description}</Text>
              <View style={styles.productFooter}>
                <Text style={styles.productPrice}>₹{item.price}</Text>
                <TouchableOpacity style={styles.addButton} onPress={() => addToCart(item)}>
                  <Text style={styles.addButtonText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          scrollEnabled={true}
        />
      )}
    </SafeAreaView>
  );

  // Cart Screen
  const CartScreen = () => (
    <SafeAreaView style={styles.container}>
      <Text style={styles.screenTitle}>🛒 Shopping Cart</Text>
      <ScrollView style={styles.cartContent}>
        {cart.length === 0 ? (
          <View style={styles.centerContent}>
            <Text style={styles.emptyCartText}>Your cart is empty</Text>
            <TouchableOpacity style={styles.continueShoppingBtn} onPress={() => setScreen('shop')}>
              <Text style={styles.continueShoppingText}>Continue Shopping</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {cart.map((item, idx) => (
              <View key={idx} style={styles.cartItem}>
                <View style={styles.cartItemImage}>
                  <Text style={styles.imagePlaceholder}>👟</Text>
                </View>
                <View style={styles.cartItemDetails}>
                  <Text style={styles.cartItemName}>{item.name}</Text>
                  <Text style={styles.cartItemPrice}>₹{item.price}</Text>
                </View>
                <TouchableOpacity onPress={() => setCart(cart.filter((_, i) => i !== idx))}>
                  <Text style={styles.removeBtn}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
            <View style={styles.cartSummary}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalPrice}>₹{cart.reduce((sum, item) => sum + item.price, 0)}</Text>
            </View>
            <TouchableOpacity style={styles.checkoutBtn}>
              <Text style={styles.checkoutBtnText}>Proceed to Checkout</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );

  // Profile Screen
  const ProfileScreen = () => (
    <SafeAreaView style={styles.container}>
      <Text style={styles.screenTitle}>👤 Account</Text>
      <ScrollView style={styles.profileContent}>
        {user ? (
          <View>
            <View style={styles.profileHeader}>
              <View style={styles.profileAvatar}>
                <Text style={styles.avatarText}>👤</Text>
              </View>
              <Text style={styles.profileName}>{user.name}</Text>
              <Text style={styles.profileEmail}>{user.email}</Text>
            </View>
            <View style={styles.profileOptions}>
              <TouchableOpacity style={styles.profileOption}>
                <Text style={styles.optionIcon}>📋</Text>
                <Text style={styles.optionText}>My Orders</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.profileOption}>
                <Text style={styles.optionIcon}>❤️</Text>
                <Text style={styles.optionText}>Wishlist</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.profileOption}>
                <Text style={styles.optionIcon}>📍</Text>
                <Text style={styles.optionText}>Addresses</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.profileOption}>
                <Text style={styles.optionIcon}>⚙️</Text>
                <Text style={styles.optionText}>Settings</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.profileOption, styles.logoutOption]} onPress={() => setUser(null)}>
                <Text style={styles.optionText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.loginSection}>
            <Text style={styles.loginTitle}>Sign In to Your Account</Text>
            <TouchableOpacity style={styles.loginBtn}>
              <Text style={styles.loginBtnText}>Login with Email</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.loginBtn, styles.signupBtn]}>
              <Text style={styles.signupBtnText}>Create New Account</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );

  return (
    <View style={styles.appContainer}>
      {screen === 'home' && <HomeScreen />}
      {screen === 'shop' && <ShopScreen />}
      {screen === 'cart' && <CartScreen />}
      {screen === 'profile' && <ProfileScreen />}

      <View style={styles.navbar}>
        {[
          { id: 'home', icon: '🏠', label: 'Home' },
          { id: 'shop', icon: '🛍️', label: 'Shop' },
          { id: 'cart', icon: '🛒', label: `Cart${cart.length > 0 ? ` (${cart.length})` : ''}` },
          { id: 'profile', icon: '👤', label: 'Profile' },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.navItem, screen === tab.id && styles.navItemActive]}
            onPress={() => setScreen(tab.id)}
          >
            <Text style={styles.navIcon}>{tab.icon}</Text>
            <Text style={[styles.navLabel, screen === tab.id && styles.navLabelActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  appContainer: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1, backgroundColor: '#fff' },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Hero Banner
  heroBanner: { backgroundColor: '#000', paddingHorizontal: 20, paddingVertical: 40, marginBottom: 20 },
  heroTitle: { fontSize: 32, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  heroSubtitle: { fontSize: 18, color: '#EC008C', marginBottom: 8 },
  heroDesc: { fontSize: 14, color: '#ccc', marginBottom: 20 },
  heroCTA: { backgroundColor: '#EC008C', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8, alignSelf: 'flex-start' },
  heroCTAText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },

  // Featured Section
  featuredSection: { paddingHorizontal: 16, marginBottom: 24 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
  featuredScroll: { },
  featuredCard: { backgroundColor: '#f5f5f5', borderRadius: 12, padding: 12, marginRight: 12, width: 140 },
  productImageLarge: { backgroundColor: '#e0e0e0', height: 100, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  featuredName: { fontSize: 13, fontWeight: 'bold', marginBottom: 4 },
  featuredPrice: { fontSize: 14, fontWeight: 'bold', color: '#EC008C', marginBottom: 8 },
  smallButton: { backgroundColor: '#EC008C', paddingVertical: 6, borderRadius: 6, alignItems: 'center' },
  smallButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },

  // Categories
  categoriesSection: { paddingHorizontal: 16, marginBottom: 24 },
  categoriesGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  categoryCard: { width: '23%', backgroundColor: '#f5f5f5', borderRadius: 12, padding: 12, alignItems: 'center' },
  categoryEmoji: { fontSize: 28, marginBottom: 8 },
  categoryName: { fontSize: 11, fontWeight: 'bold', textAlign: 'center' },

  // Promo Section
  promoSection: { backgroundColor: '#EC008C', marginHorizontal: 16, borderRadius: 12, padding: 24, marginBottom: 20, alignItems: 'center' },
  promoText: { color: '#fff', fontSize: 14 },
  promoDiscount: { color: '#fff', fontSize: 24, fontWeight: 'bold', marginVertical: 8 },
  promoButton: { backgroundColor: '#fff', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 6 },
  promoButtonText: { color: '#EC008C', fontWeight: 'bold' },

  // Shop
  shopHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  shopTitle: { fontSize: 22, fontWeight: 'bold' },
  filterBtn: { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#f0f0f0', borderRadius: 6 },
  filterText: { fontSize: 14 },
  loadingText: { marginTop: 10, fontSize: 14, color: '#666' },

  // Products
  productRow: { justifyContent: 'space-between', paddingHorizontal: 8, marginVertical: 8 },
  productItem: { width: '48%', backgroundColor: '#f9f9f9', borderRadius: 10, overflow: 'hidden' },
  productImage: { backgroundColor: '#e8e8e8', height: 120, justifyContent: 'center', alignItems: 'center' },
  imagePlaceholder: { fontSize: 40 },
  productName: { fontSize: 13, fontWeight: 'bold', paddingHorizontal: 10, paddingTop: 10 },
  productDesc: { fontSize: 11, color: '#999', paddingHorizontal: 10, marginTop: 2 },
  productFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 10 },
  productPrice: { fontSize: 14, fontWeight: 'bold', color: '#EC008C' },
  addButton: { backgroundColor: '#EC008C', width: 32, height: 32, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
  addButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },

  // Cart
  screenTitle: { fontSize: 24, fontWeight: 'bold', paddingHorizontal: 16, paddingVertical: 16 },
  cartContent: { flex: 1, paddingHorizontal: 16 },
  emptyCartText: { fontSize: 16, color: '#666', marginBottom: 16 },
  continueShoppingBtn: { backgroundColor: '#EC008C', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  continueShoppingText: { color: '#fff', fontWeight: 'bold' },

  cartItem: { flexDirection: 'row', backgroundColor: '#f5f5f5', borderRadius: 10, padding: 12, marginVertical: 8, alignItems: 'center' },
  cartItemImage: { width: 60, height: 60, backgroundColor: '#e8e8e8', borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  cartItemDetails: { flex: 1 },
  cartItemName: { fontSize: 14, fontWeight: 'bold' },
  cartItemPrice: { fontSize: 13, color: '#EC008C', marginTop: 4 },
  removeBtn: { fontSize: 20, color: '#999' },

  cartSummary: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 16, borderTopWidth: 1, borderTopColor: '#e0e0e0', marginVertical: 16 },
  totalLabel: { fontSize: 14, color: '#666' },
  totalPrice: { fontSize: 18, fontWeight: 'bold', color: '#EC008C' },
  checkoutBtn: { backgroundColor: '#EC008C', paddingVertical: 14, borderRadius: 8, alignItems: 'center', marginBottom: 20 },
  checkoutBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },

  // Profile
  profileContent: { flex: 1, paddingHorizontal: 16 },
  profileHeader: { alignItems: 'center', paddingVertical: 24, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  profileAvatar: { width: 80, height: 80, backgroundColor: '#EC008C20', borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarText: { fontSize: 32 },
  profileName: { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  profileEmail: { fontSize: 14, color: '#666' },

  profileOptions: { paddingVertical: 16 },
  profileOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  optionIcon: { fontSize: 20, marginRight: 16 },
  optionText: { fontSize: 15, color: '#333' },
  logoutOption: { borderBottomWidth: 0, marginTop: 8 },

  loginSection: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  loginTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 24, textAlign: 'center' },
  loginBtn: { width: '100%', backgroundColor: '#EC008C', paddingVertical: 14, borderRadius: 8, alignItems: 'center', marginBottom: 12 },
  loginBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  signupBtn: { backgroundColor: '#f0f0f0' },
  signupBtnText: { color: '#000', fontWeight: 'bold', fontSize: 16 },

  // Navbar
  navbar: { flexDirection: 'row', backgroundColor: '#000', borderTopWidth: 1, borderTopColor: '#EC008C', paddingBottom: 10 },
  navItem: { flex: 1, alignItems: 'center', paddingVertical: 10 },
  navItemActive: { backgroundColor: '#EC008C15' },
  navIcon: { fontSize: 24, marginBottom: 4 },
  navLabel: { fontSize: 11, color: '#999' },
  navLabelActive: { color: '#EC008C' },
});

