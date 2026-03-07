import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Modal,
  Dimensions,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { API_CONFIG } from '../config/api';

const { width, height } = Dimensions.get('window');

const BookingImagesScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { booking } = route.params || {};
  const insets = useSafeAreaInsets();

  const [pickupImages, setPickupImages] = useState([]);
  const [dropImages, setDropImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imageViewerVisible, setImageViewerVisible] = useState(false);

  // Fetch images when component loads
  useEffect(() => {
    if (booking && (booking._id || booking.bookingId)) {
      fetchBookingImages();
    } else {
      setLoading(false);
    }
  }, [booking]);

  const fetchBookingImages = async () => {
    try {
      const bookingId = booking._id || booking.bookingId;
      console.log('📸 Fetching images for booking:', bookingId);

      const response = await fetch(
        // `https://ridodrop-backend-24-10-2025.onrender.com/api/v1/images/${bookingId}`
        `${API_CONFIG.BASE_URL}/api/v1/images/${bookingId}`
      );
      
      const data = await response.json();
      console.log('📸 Images response:', data);

      if (data.success) {
        setPickupImages(data.pickupImages || []);
        setDropImages(data.dropImages || []);
        console.log(`✅ Loaded ${data.counts?.pickup || 0} pickup images, ${data.counts?.drop || 0} drop images`);
      } else {
        Alert.alert('Error', 'Failed to load images');
      }
    } catch (error) {
      console.error('❌ Error fetching images:', error);
      Alert.alert('Error', 'Failed to load images. Please check your connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchBookingImages();
  };

  const openImageViewer = (imageUrl) => {
    setSelectedImage(imageUrl);
    setImageViewerVisible(true);
  };

  const renderImageGrid = (images, title, emptyMessage) => (
    <View style={styles.sectionContainer}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <View style={styles.imageCount}>
          <Text style={styles.imageCountText}>{images.length}</Text>
        </View>
      </View>
      
      {images.length > 0 ? (
        <View style={styles.imageGrid}>
          {images.map((imageUrl, index) => (
            <TouchableOpacity
              key={index}
              style={styles.imageItem}
              onPress={() => openImageViewer(imageUrl)}
            >
              <Image source={{ uri: imageUrl }} style={styles.gridImage} />
              <View style={styles.imageOverlay}>
                <Ionicons name="expand" size={20} color="#fff" />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="images-outline" size={48} color="#9CA3AF" />
          <Text style={styles.emptyStateText}>{emptyMessage}</Text>
        </View>
      )}
    </View>
  );

  const renderImageViewer = () => (
    <Modal
      visible={imageViewerVisible}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setImageViewerVisible(false)}
    >
      <View style={styles.imageViewerContainer}>
        <TouchableOpacity
          style={styles.imageViewerBackground}
          onPress={() => setImageViewerVisible(false)}
        />
        
        <SafeAreaView style={styles.imageViewerContent}>
          <View style={styles.imageViewerHeader}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setImageViewerVisible(false)}
            >
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
          </View>
          
          {selectedImage && (
            <Image
              source={{ uri: selectedImage }}
              style={styles.fullScreenImage}
              resizeMode="contain"
            />
          )}
        </SafeAreaView>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
          <ActivityIndicator size="large" color="#EC4D4A" />
          <Text style={styles.loadingText}>Loading images...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={["#1a1a1a", "#2d2d2d"]}
        style={[styles.header, { paddingTop: insets.top + 10 }]}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Booking Images</Text>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={onRefresh}
          >
            <Ionicons name="refresh" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
        
        {booking && (
          <Text style={styles.bookingId}>
            Order #{booking.bookingId || booking._id || 'N/A'}
          </Text>
        )}
      </LinearGradient>

      {/* Content */}
      <ScrollView
        style={styles.scrollContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryNumber}>{pickupImages.length}</Text>
              <Text style={styles.summaryLabel}>Pickup Images</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryNumber}>{dropImages.length}</Text>
              <Text style={styles.summaryLabel}>Drop Images</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryNumber}>
                {pickupImages.length + dropImages.length}
              </Text>
              <Text style={styles.summaryLabel}>Total Images</Text>
            </View>
          </View>
        </View>

        {/* Pickup Images Section */}
        {renderImageGrid(
          pickupImages,
          "📦 Pickup Images",
          "No pickup images uploaded yet"
        )}

        {/* Drop Images Section */}
        {renderImageGrid(
          dropImages,
          "🎯 Drop Images", 
          "No drop images uploaded yet"
        )}

        {/* Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Ionicons name="information-circle" size={24} color="#EC4D4A" />
            <Text style={styles.infoTitle}>Image Information</Text>
          </View>
          <Text style={styles.infoText}>
            • Pickup images are taken when collecting packages from the sender
          </Text>
          <Text style={styles.infoText}>
            • Drop images are taken when delivering packages to the receiver
          </Text>
          <Text style={styles.infoText}>
            • All images are stored securely in cloud storage
          </Text>
          <Text style={styles.infoText}>
            • Images are automatically optimized for faster loading
          </Text>
        </View>
      </ScrollView>

      {/* Image Viewer Modal */}
      {renderImageViewer()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    paddingBottom: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
  },
  bookingId: {
    textAlign: 'center',
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 5,
  },
  scrollContainer: {
    flex: 1,
    padding: 20,
  },
  summaryCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#EC4D4A',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 15,
  },
  sectionContainer: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  imageCount: {
    backgroundColor: '#EC4D4A',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  imageCountText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  imageItem: {
    width: (width - 80) / 3, // 3 images per row with margins
    height: (width - 80) / 3.5,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 10,
    position: 'relative',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 15,
    padding: 5,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    marginTop: 10,
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  infoCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginLeft: 10,
  },
  infoText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
    lineHeight: 20,
  },
  // Image Viewer Styles
  imageViewerContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  imageViewerBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  imageViewerContent: {
    flex: 1,
  },
  imageViewerHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 20,
    paddingTop: 60,
  },
  closeButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    padding: 10,
  },
  fullScreenImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
});

export default BookingImagesScreen;