import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import HeaderWithBackButton from '../components/HeaderWithBackButton';
import { API_CONFIG } from '../config/api';

// const API_URL = 'https://ridodrop-backend-24-10-2025.onrender.com/api/v1';
const API_URL = `${API_CONFIG.BASE_URL}/api/v1`;

const STATUS_COLORS = {
  'Open': '#FF9800',
  'In Progress': '#2196F3',
  'Resolved': '#4CAF50',
  'Closed': '#9E9E9E'
};

const PRIORITY_COLORS = {
  'Urgent': '#D32F2F',
  'High': '#F57C00',
  'Medium': '#FBC02D',
  'Low': '#388E3C'
};

const TicketDetailsScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { ticketId } = route.params;
  const scrollViewRef = useRef(null);

  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [selectedImages, setSelectedImages] = useState([]);
  const [enlargedImage, setEnlargedImage] = useState(null);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [closingTicket, setClosingTicket] = useState(false);

  useEffect(() => {
    fetchTicketDetails();
  }, []);

  const fetchTicketDetails = async () => {
    try {
      const response = await fetch(`${API_URL}/tickets/${ticketId}`);
      const result = await response.json();

      if (response.ok && result.success) {
        setTicket(result.data);
      } else {
        throw new Error(result.message || 'Failed to fetch ticket details');
      }
    } catch (error) {
      console.error('Error fetching ticket details:', error);
      Alert.alert('Error', 'Failed to load ticket details. Please try again.');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    if (selectedImages.length >= 3) {
      Alert.alert('Limit Reached', 'You can attach up to 3 images only.');
      return;
    }

    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Please allow access to your photo library.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: false,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImages([...selectedImages, result.assets[0]]);
    }
  };

  const removeImage = (index) => {
    setSelectedImages(selectedImages.filter((_, i) => i !== index));
  };

  const handleAddComment = async () => {
    if (!comment.trim() && selectedImages.length === 0) {
      Alert.alert('Empty Comment', 'Please write a comment or attach an image.');
      return;
    }

    setSubmittingComment(true);

    try {
      const riderId = await AsyncStorage.getItem('riderId');
      const riderName = await AsyncStorage.getItem('riderName');

      const formData = new FormData();
      formData.append('userId', riderId);
      formData.append('userName', riderName || 'Partner');
      formData.append('userType', 'partner');
      formData.append('message', comment.trim());

      selectedImages.forEach((image, index) => {
        const filename = image.uri.split('/').pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';

        formData.append('attachments', {
          uri: image.uri,
          name: filename,
          type: type,
        });
      });

      const response = await fetch(`${API_URL}/tickets/${ticketId}/comments`, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setComment('');
        setSelectedImages([]);
        await fetchTicketDetails();
        
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);

        Alert.alert('Success', 'Your comment has been added.');
      } else {
        throw new Error(result.message || 'Failed to add comment');
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      Alert.alert('Error', 'Failed to add comment. Please try again.');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleCloseTicket = async () => {
    if (rating === 0) {
      Alert.alert('Rating Required', 'Please provide a rating before closing the ticket.');
      return;
    }

    setClosingTicket(true);

    try {
      const response = await fetch(`${API_URL}/tickets/${ticketId}/close`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rating,
          feedback: feedback.trim(),
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setShowCloseModal(false);
        await fetchTicketDetails();
        Alert.alert('Success', 'Ticket has been closed. Thank you for your feedback!');
      } else {
        throw new Error(result.message || 'Failed to close ticket');
      }
    } catch (error) {
      console.error('Error closing ticket:', error);
      Alert.alert('Error', 'Failed to close ticket. Please try again.');
    } finally {
      setClosingTicket(false);
    }
  };

  const formatDate = (date) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now - d;
    const hours = Math.floor(diff / (1000 * 60 * 60));

    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <HeaderWithBackButton title="Ticket Details" />
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#EC4D4A" />
            <Text style={styles.loadingText}>Loading ticket details...</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (!ticket) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <HeaderWithBackButton title="Ticket Details" />
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={60} color="#ccc" />
            <Text style={styles.errorText}>Ticket not found</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const canAddComments = ticket.status !== 'Closed';
  const canCloseTicket = ticket.status === 'Resolved' && !ticket.rating;

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <HeaderWithBackButton title="Ticket Details" />

        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Ticket Header */}
          <View style={styles.ticketHeader}>
            <View style={styles.ticketIdRow}>
              <Ionicons name="ticket" size={20} color="#EC4D4A" />
              <Text style={styles.ticketId}>{ticket.ticketId}</Text>
            </View>
            <View style={styles.badgesRow}>
              <View style={[styles.priorityBadge, { backgroundColor: PRIORITY_COLORS[ticket.priority] }]}>
                <Text style={styles.badgeText}>{ticket.priority}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[ticket.status] }]}>
                <Text style={styles.badgeText}>{ticket.status}</Text>
              </View>
            </View>
          </View>

          {/* Ticket Info */}
          <View style={styles.ticketInfo}>
            <Text style={styles.subject}>{ticket.subject}</Text>
            <Text style={styles.description}>{ticket.description}</Text>

            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Ionicons name="pricetag-outline" size={16} color="#666" />
                <Text style={styles.metaText}>{ticket.issueType}</Text>
              </View>
              <View style={styles.metaItem}>
                <Ionicons name="time-outline" size={16} color="#666" />
                <Text style={styles.metaText}>{formatDate(ticket.createdAt)}</Text>
              </View>
            </View>

            {ticket.orderId && (
              <View style={styles.orderInfo}>
                <Ionicons name="cube-outline" size={16} color="#EC4D4A" />
                <Text style={styles.orderText}>Order: {ticket.orderId}</Text>
              </View>
            )}

            {/* Initial Attachments */}
            {ticket.attachments && ticket.attachments.length > 0 && (
              <View style={styles.attachmentsSection}>
                <Text style={styles.attachmentsTitle}>Attachments:</Text>
                <View style={styles.attachmentsGrid}>
                  {ticket.attachments.map((url, index) => (
                    <TouchableOpacity
                      key={index}
                      onPress={() => setEnlargedImage(url)}
                    >
                      <Image source={{ uri: url }} style={styles.attachmentImage} />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </View>

          {/* Comments Thread */}
          <View style={styles.commentsSection}>
            <Text style={styles.commentsTitle}>
              Discussion ({ticket.comments?.length || 0})
            </Text>

            {ticket.comments && ticket.comments.length > 0 ? (
              ticket.comments.map((commentItem, index) => (
                <View key={index} style={styles.commentCard}>
                  <View style={styles.commentHeader}>
                    <View style={styles.commentUserInfo}>
                      <View style={[
                        styles.avatarCircle,
                        { backgroundColor: commentItem.userType === 'admin' ? '#2196F3' : '#EC4D4A' }
                      ]}>
                        <Text style={styles.avatarText}>
                          {commentItem.userName?.charAt(0).toUpperCase() || 'U'}
                        </Text>
                      </View>
                      <View>
                        <Text style={styles.commentUserName}>{commentItem.userName}</Text>
                        <Text style={styles.commentDate}>{formatDate(commentItem.createdAt)}</Text>
                      </View>
                    </View>
                    {commentItem.userType === 'admin' && (
                      <View style={styles.adminBadge}>
                        <Text style={styles.adminBadgeText}>Support</Text>
                      </View>
                    )}
                  </View>

                  <Text style={styles.commentMessage}>{commentItem.message}</Text>

                  {commentItem.attachments && commentItem.attachments.length > 0 && (
                    <View style={styles.commentAttachments}>
                      {commentItem.attachments.map((url, idx) => (
                        <TouchableOpacity
                          key={idx}
                          onPress={() => setEnlargedImage(url)}
                        >
                          <Image source={{ uri: url }} style={styles.commentAttachmentImage} />
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              ))
            ) : (
              <Text style={styles.noComments}>No comments yet. Be the first to reply!</Text>
            )}
          </View>

          {/* Close Ticket Button */}
          {canCloseTicket && (
            <TouchableOpacity
              style={styles.closeTicketButton}
              onPress={() => setShowCloseModal(true)}
            >
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.closeTicketText}>Close Ticket</Text>
            </TouchableOpacity>
          )}

          {ticket.status === 'Closed' && ticket.rating && (
            <View style={styles.feedbackSection}>
              <Text style={styles.feedbackTitle}>Your Feedback:</Text>
              <View style={styles.ratingDisplay}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Ionicons
                    key={star}
                    name={star <= ticket.rating ? 'star' : 'star-outline'}
                    size={24}
                    color="#FFB300"
                  />
                ))}
              </View>
              {ticket.feedback && (
                <Text style={styles.feedbackText}>{ticket.feedback}</Text>
              )}
            </View>
          )}
        </ScrollView>

        {/* Add Comment Section */}
        {canAddComments && (
          <View style={styles.commentInputSection}>
            {selectedImages.length > 0 && (
              <View style={styles.selectedImagesContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {selectedImages.map((image, index) => (
                    <View key={index} style={styles.selectedImageWrapper}>
                      <Image source={{ uri: image.uri }} style={styles.selectedImage} />
                      <TouchableOpacity
                        style={styles.removeImageButton}
                        onPress={() => removeImage(index)}
                      >
                        <Ionicons name="close-circle" size={24} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

            <View style={styles.commentInputRow}>
              <TouchableOpacity
                style={styles.attachButton}
                onPress={pickImage}
                disabled={submittingComment}
              >
                <Ionicons name="camera-outline" size={24} color="#666" />
              </TouchableOpacity>

              <TextInput
                style={styles.commentInput}
                placeholder="Write a comment..."
                value={comment}
                onChangeText={setComment}
                multiline
                maxLength={500}
                editable={!submittingComment}
              />

              <TouchableOpacity
                style={[
                  styles.sendButton,
                  (!comment.trim() && selectedImages.length === 0) && styles.sendButtonDisabled
                ]}
                onPress={handleAddComment}
                disabled={submittingComment || (!comment.trim() && selectedImages.length === 0)}
              >
                {submittingComment ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="send" size={20} color="#fff" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Close Ticket Modal */}
        <Modal
          visible={showCloseModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowCloseModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Close Ticket</Text>
              <Text style={styles.modalDescription}>
                Please rate your support experience
              </Text>

              <View style={styles.ratingContainer}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity
                    key={star}
                    onPress={() => setRating(star)}
                  >
                    <Ionicons
                      name={star <= rating ? 'star' : 'star-outline'}
                      size={40}
                      color="#FFB300"
                    />
                  </TouchableOpacity>
                ))}
              </View>

              <TextInput
                style={styles.feedbackInput}
                placeholder="Additional feedback (optional)"
                value={feedback}
                onChangeText={setFeedback}
                multiline
                numberOfLines={4}
                maxLength={500}
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={() => {
                    setShowCloseModal(false);
                    setRating(0);
                    setFeedback('');
                  }}
                  disabled={closingTicket}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalConfirmButton, closingTicket && styles.modalButtonDisabled]}
                  onPress={handleCloseTicket}
                  disabled={closingTicket || rating === 0}
                >
                  {closingTicket ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.modalConfirmText}>Submit</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Image Enlarge Modal */}
        <Modal
          visible={!!enlargedImage}
          transparent
          animationType="fade"
          onRequestClose={() => setEnlargedImage(null)}
        >
          <View style={styles.imageModalOverlay}>
            <TouchableOpacity
              style={styles.imageModalClose}
              onPress={() => setEnlargedImage(null)}
            >
              <Ionicons name="close" size={32} color="#fff" />
            </TouchableOpacity>
            <Image
              source={{ uri: enlargedImage }}
              style={styles.enlargedImage}
              resizeMode="contain"
            />
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    color: '#999',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  ticketIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ticketId: {
    fontSize: 16,
    fontWeight: '700',
    color: '#EC4D4A',
    marginLeft: 8,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  ticketInfo: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 12,
  },
  subject: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 13,
    color: '#666',
  },
  orderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  orderText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#EC4D4A',
  },
  attachmentsSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  attachmentsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  attachmentsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  attachmentImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  commentsSection: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 12,
  },
  commentsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  noComments: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 20,
  },
  commentCard: {
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  commentUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  commentUserName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  commentDate: {
    fontSize: 12,
    color: '#999',
  },
  adminBadge: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  adminBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  commentMessage: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  commentAttachments: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  commentAttachmentImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  closeTicketButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 14,
    borderRadius: 12,
    gap: 8,
  },
  closeTicketText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  feedbackSection: {
    backgroundColor: '#fff',
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
  },
  feedbackTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  ratingDisplay: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 8,
  },
  feedbackText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  commentInputSection: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingBottom: Platform.OS === 'ios' ? 20 : 8,
  },
  selectedImagesContainer: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  selectedImageWrapper: {
    marginRight: 8,
    position: 'relative',
  },
  selectedImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#EC4D4A',
    borderRadius: 12,
  },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    gap: 8,
  },
  attachButton: {
    padding: 8,
  },
  commentInput: {
    flex: 1,
    backgroundColor: '#f8f8f8',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: '#EC4D4A',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  ratingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
  },
  feedbackInput: {
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    height: 100,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  modalConfirmButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#EC4D4A',
    alignItems: 'center',
  },
  modalConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  modalButtonDisabled: {
    backgroundColor: '#ccc',
  },
  imageModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1,
  },
  enlargedImage: {
    width: '90%',
    height: '80%',
  },
});

export default TicketDetailsScreen;
