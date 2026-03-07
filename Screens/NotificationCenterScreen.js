import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
  Animated,
  Dimensions,
  ScrollView,
  Platform,
  Vibration,
  TouchableWithoutFeedback,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Mock notification data
const MOCK_NOTIFICATIONS = [
  {
    id: "1",
    category: "suspension",
    title: "Suspension",
    message: "You have been suspended because your wallet balance is insufficient. Please recharge your wallet to continue using Porter. - Team Porter",
    timestamp: "Oct 15",
    isRead: false,
    priority: "high",
  },
  {
    id: "2",
    category: "goodwill",
    title: "Goodwill",
    message: "Hi Partner, we feel sorry that your order was cancelled. A goodwill of Rs. 10.0 has been credited to your wallet by Porter. Keep doing orders to earn more.",
    timestamp: "Oct 11",
    isRead: true,
    priority: "normal",
  },
  {
    id: "3",
    category: "goodwill",
    title: "Goodwill",
    message: "Hi Partner, we feel sorry that your order was cancelled. A goodwill of Rs. 10.0 has been credited to your wallet by Porter. Keep doing orders to earn more.",
    timestamp: "Oct 11",
    isRead: true,
    priority: "normal",
  },
  {
    id: "4",
    category: "goodwill",
    title: "Goodwill",
    message: "Hi Partner, we feel sorry that your order was cancelled. There is no goodwill against the cancelled order. Keep doing more orders to earn more.",
    timestamp: "Oct 11",
    isRead: true,
    priority: "normal",
  },
  {
    id: "5",
    category: "goodwill",
    title: "Goodwill",
    message: "Hi Partner, we feel sorry that your order was cancelled. There is no goodwill against the cancelled order. Keep doing more orders to earn more.",
    timestamp: "Oct 10",
    isRead: true,
    priority: "normal",
  },
  {
    id: "6",
    category: "incentives",
    title: "Incentive Earned",
    message: "Congratulations! You've earned ₹250 incentive for completing 15 orders today. Keep up the great work!",
    timestamp: "Oct 9",
    isRead: true,
    priority: "high",
  },
  {
    id: "7",
    category: "account_active",
    title: "Account Activated",
    message: "Your account has been successfully activated. You can now start accepting orders. Welcome to the team!",
    timestamp: "Oct 8",
    isRead: true,
    priority: "high",
  },
  {
    id: "8",
    category: "referral",
    title: "Referral Bonus",
    message: "Your referral John Doe has completed their first order. You've earned ₹500 referral bonus!",
    timestamp: "Oct 7",
    isRead: true,
    priority: "normal",
  },
  {
    id: "9",
    category: "warning",
    title: "Warning: Low Rating",
    message: "Your rating has dropped to 3.8. Please maintain quality service to avoid account restrictions.",
    timestamp: "Oct 6",
    isRead: true,
    priority: "high",
  },
  {
    id: "10",
    category: "onboarding",
    title: "Complete Your Profile",
    message: "You're almost done! Please upload your vehicle documents to complete the onboarding process.",
    timestamp: "Oct 5",
    isRead: true,
    priority: "normal",
  },
];

const FILTER_CATEGORIES = [
  { id: "suspension", label: "Suspension", color: "#EC4D4A", icon: "ban" },
  { id: "account_active", label: "Account Active", color: "#4CAF50", icon: "checkmark-circle" },
  { id: "incentives", label: "Incentives", color: "#FFC107", icon: "gift" },
  { id: "goodwill", label: "Goodwill", color: "#192f6a", icon: "heart" },
  { id: "onboarding", label: "Onboarding", color: "#4CAF50", icon: "person-add" },
  { id: "referral", label: "Referral", color: "#FF9800", icon: "people" },
  { id: "warning", label: "Warning", color: "#EC4D4A", icon: "alert-circle" },
];

export default function NotificationCenterScreen() {
  const navigation = useNavigation();
  const [activeFilter, setActiveFilter] = useState("all");
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-20)).current;
  const filterSlideAnim = useRef(new Animated.Value(50)).current;
  const dropdownAnim = useRef(new Animated.Value(0)).current;
  const [cardAnimations] = useState(
    notifications.map(() => new Animated.Value(0))
  );

  useEffect(() => {
    // Calculate unread count
    const unread = notifications.filter(n => !n.isRead).length;
    setUnreadCount(unread);

    // Entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(filterSlideAnim, {
        toValue: 0,
        duration: 600,
        delay: 200,
        useNativeDriver: true,
      }),
    ]).start();

    // Stagger card animations
    Animated.stagger(
      50,
      cardAnimations.map(anim =>
        Animated.timing(anim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        })
      )
    ).start();
  }, []);

  const getCategoryColor = (category) => {
    const cat = FILTER_CATEGORIES.find(c => c.id === category);
    return cat ? cat.color : "#6B7280";
  };

  const getCategoryIcon = (category) => {
    const cat = FILTER_CATEGORIES.find(c => c.id === category);
    return cat ? cat.icon : "notifications";
  };

  const handleFilterPress = (filterId) => {
    Vibration.vibrate(10);
    setActiveFilter(filterId);
    setShowFilterDropdown(false);
    
    // Animate dropdown close
    Animated.timing(dropdownAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const toggleFilterDropdown = () => {
    Vibration.vibrate(10);
    const toValue = showFilterDropdown ? 0 : 1;
    
    Animated.spring(dropdownAnim, {
      toValue,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();
    
    setShowFilterDropdown(!showFilterDropdown);
  };

  const handleNotificationPress = (notification) => {
    Vibration.vibrate(10);
    // Mark as read
    setNotifications(prevNotifications =>
      prevNotifications.map(n =>
        n.id === notification.id ? { ...n, isRead: true } : n
      )
    );
  };

  const handleMarkAllAsRead = () => {
    setNotifications(prevNotifications =>
      prevNotifications.map(n => ({ ...n, isRead: true }))
    );
  };

  const filteredNotifications = activeFilter === "all"
    ? notifications
    : notifications.filter(n => n.category === activeFilter);

  const renderFilterPill = ({ item, index }) => {
    return (
      <TouchableOpacity
        onPress={() => handleFilterPress(item.id)}
        activeOpacity={0.7}
        style={styles.dropdownItem}
      >
        <View style={[styles.categoryIconContainer, { backgroundColor: `${item.color}15` }]}>
          <Ionicons name={item.icon} size={20} color={item.color} />
        </View>
        <Text style={styles.dropdownItemText}>{item.label}</Text>
        {activeFilter === item.id && (
          <Ionicons name="checkmark" size={20} color="#192f6a" style={styles.checkmark} />
        )}
      </TouchableOpacity>
    );
  };

  const renderNotificationCard = ({ item, index }) => {
    const cardOpacity = cardAnimations[index] || new Animated.Value(1);
    const cardTranslateY = cardOpacity.interpolate({
      inputRange: [0, 1],
      outputRange: [30, 0],
    });

    return (
      <Animated.View
        style={{
          opacity: cardOpacity,
          transform: [{ translateY: cardTranslateY }],
        }}
      >
        <TouchableOpacity
          onPress={() => handleNotificationPress(item)}
          activeOpacity={0.7}
          style={[
            styles.notificationCard,
            !item.isRead && styles.notificationCardUnread,
          ]}
        >
          {!item.isRead && (
            <View style={[styles.unreadBorder, { backgroundColor: getCategoryColor(item.category) }]} />
          )}
          
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <View style={[styles.categoryIconContainer, { backgroundColor: `${getCategoryColor(item.category)}15` }]}>
                <Ionicons
                  name={getCategoryIcon(item.category)}
                  size={20}
                  color={getCategoryColor(item.category)}
                />
              </View>
              <View style={styles.cardHeaderText}>
                <Text style={[styles.categoryTitle, !item.isRead && styles.categoryTitleUnread]}>
                  {item.title}
                </Text>
                {item.priority === "high" && (
                  <View style={styles.priorityBadge}>
                    <Ionicons name="alert-circle" size={12} color="#EC4D4A" />
                  </View>
                )}
              </View>
            </View>
            <Text style={styles.timestamp}>{item.timestamp}</Text>
          </View>

          <View style={styles.cardBody}>
            <Text style={[styles.messageText, !item.isRead && styles.messageTextUnread]}>
              {item.message}
            </Text>
          </View>

          {!item.isRead && (
            <View style={styles.unreadDot} />
          )}
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <LinearGradient
          colors={["#192f6a20", "#2a408030"]}
          style={styles.emptyIconGradient}
        >
          <Ionicons name="notifications-off-outline" size={64} color="#192f6a" />
        </LinearGradient>
      </View>
      <Text style={styles.emptyTitle}>All caught up! 🎉</Text>
      <Text style={styles.emptySubtitle}>
        {activeFilter === "all"
          ? "No notifications at the moment"
          : `No ${FILTER_CATEGORIES.find(c => c.id === activeFilter)?.label.toLowerCase()} notifications`}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <TouchableWithoutFeedback onPress={() => {
        if (showFilterDropdown) {
          setShowFilterDropdown(false);
          Animated.timing(dropdownAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }).start();
        }
      }}>
        <View style={{ flex: 1 }}>
          {/* Header */}
          <Animated.View
            style={[
              styles.header,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color="#192f6a" />
            </TouchableOpacity>

            <Text style={styles.headerTitle}>Notification Center</Text>

            {unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
              </View>
            )}
          </Animated.View>

      {/* Mark all as read button */}
      {/* {unreadCount > 0 && (
        <Animated.View
          style={[
            styles.markAllContainer,
            { opacity: fadeAnim },
          ]}
        >
          <TouchableOpacity
            onPress={handleMarkAllAsRead}
            style={styles.markAllButton}
          >
            <Ionicons name="checkmark-done" size={16} color="#192f6a" />
            <Text style={styles.markAllText}>Mark all as read</Text>
          </TouchableOpacity>
        </Animated.View>
      )} */}

      {/* Filter Pills */}
      <Animated.View
        style={[
          styles.filterContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateX: filterSlideAnim }],
          },
        ]}
      >
        <TouchableOpacity
          onPress={toggleFilterDropdown}
          style={styles.filterSelector}
          activeOpacity={0.7}
        >
          <View style={styles.filterSelectorContent}>
            <View style={styles.filterSelectorLeft}>
              {activeFilter === "all" ? (
                <>
                  <Ionicons name="filter" size={20} color="#192f6a" />
                  <Text style={styles.filterSelectorText}>All Notifications</Text>
                </>
              ) : (
                <>
                  <View style={[
                    styles.categoryIconContainerSmall,
                    { backgroundColor: `${FILTER_CATEGORIES.find(c => c.id === activeFilter)?.color}15` }
                  ]}>
                    <Ionicons 
                      name={FILTER_CATEGORIES.find(c => c.id === activeFilter)?.icon} 
                      size={16} 
                      color={FILTER_CATEGORIES.find(c => c.id === activeFilter)?.color} 
                    />
                  </View>
                  <Text style={styles.filterSelectorText}>
                    {FILTER_CATEGORIES.find(c => c.id === activeFilter)?.label}
                  </Text>
                </>
              )}
            </View>
            <Ionicons 
              name={showFilterDropdown ? "chevron-up" : "chevron-down"} 
              size={20} 
              color="#192f6a" 
            />
          </View>
        </TouchableOpacity>

        {/* Dropdown Menu */}
        {showFilterDropdown && (
          <Animated.View
            style={[
              styles.dropdownMenu,
              {
                opacity: dropdownAnim,
                transform: [{
                  translateY: dropdownAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-10, 0],
                  }),
                }],
              },
            ]}
          >
            <TouchableOpacity
              onPress={() => handleFilterPress("all")}
              activeOpacity={0.7}
              style={styles.dropdownItem}
            >
              <View style={[styles.categoryIconContainer, { backgroundColor: "#192f6a15" }]}>
                <Ionicons name="notifications" size={20} color="#192f6a" />
              </View>
              <Text style={styles.dropdownItemText}>All Notifications</Text>
              {activeFilter === "all" && (
                <Ionicons name="checkmark" size={20} color="#192f6a" style={styles.checkmark} />
              )}
            </TouchableOpacity>

            <View style={styles.dropdownDivider} />

            <ScrollView 
              style={styles.dropdownScrollView}
              showsVerticalScrollIndicator={false}
            >
              {FILTER_CATEGORIES.map((item, index) => (
                <View key={item.id}>
                  {renderFilterPill({ item, index })}
                </View>
              ))}
            </ScrollView>
          </Animated.View>
        )}
      </Animated.View>

      {/* Notifications List */}
      <FlatList
        data={filteredNotifications}
        renderItem={renderNotificationCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmptyState}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={10}
      />
        </View>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: "700",
    color: "#192f6a",
  },
  unreadBadge: {
    backgroundColor: "#4CAF50",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    minWidth: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  unreadBadgeText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  markAllContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  markAllButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-end",
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: "#192f6a15",
    borderRadius: 16,
  },
  markAllText: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: "600",
    color: "#192f6a",
  },
  filterContainer: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    position: "relative",
    zIndex: 1000,
  },
  filterSelector: {
    backgroundColor: "#F5F7FA",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  filterSelectorContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  filterSelectorLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  filterSelectorText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#192f6a",
  },
  categoryIconContainerSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  dropdownMenu: {
    position: "absolute",
    top: 60,
    left: 16,
    right: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    maxHeight: 400,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  dropdownScrollView: {
    maxHeight: 320,
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  dropdownItemText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
    color: "#333",
  },
  checkmark: {
    marginLeft: "auto",
  },
  dropdownDivider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginHorizontal: 16,
  },
  filterScrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterPillWrapper: {
    marginRight: 8,
  },
  filterPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: "#F3F4F6",
    gap: 6,
  },
  filterPillActive: {
    ...Platform.select({
      ios: {
        shadowColor: "#192f6a",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  filterPillText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
  filterPillTextActive: {
    color: "#FFFFFF",
  },
  filterIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 2,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  notificationCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    position: "relative",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  notificationCardUnread: {
    backgroundColor: "#FEFEFE",
  },
  unreadBorder: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  cardHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  categoryIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  cardHeaderText: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  categoryTitleUnread: {
    fontWeight: "700",
    color: "#192f6a",
  },
  priorityBadge: {
    marginLeft: 6,
  },
  priorityIcon: {
    color: "#EC4D4A",
  },
  timestamp: {
    fontSize: 12,
    color: "#9CA3AF",
    marginLeft: 8,
  },
  cardBody: {
    paddingLeft: 52,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 21,
    color: "#666",
  },
  messageTextUnread: {
    color: "#333",
  },
  unreadDot: {
    position: "absolute",
    top: 18,
    right: 16,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EC4D4A",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyIconContainer: {
    marginBottom: 24,
  },
  emptyIconGradient: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#192f6a",
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 24,
  },
});
