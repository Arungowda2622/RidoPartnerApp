import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  SafeAreaView,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

const MyTicketsScreen = () => {
  const navigation = useNavigation();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('All');

  const filters = ['All', 'Open', 'In Progress', 'Resolved', 'Closed'];

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      const riderId = await AsyncStorage.getItem('riderId');
      
      if (!riderId) {
        Alert.alert('Error', 'User not found. Please login again.');
        return;
      }

      const response = await fetch(
        `${API_URL}/tickets/my-tickets?userId=${riderId}&userType=partner`
      );
      
      const result = await response.json();

      if (response.ok && result.success) {
        setTickets(result.data);
      } else {
        throw new Error(result.message || 'Failed to fetch tickets');
      }
    } catch (error) {
      console.error('Error fetching tickets:', error);
      Alert.alert('Error', 'Failed to load tickets. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchTickets();
  };

  const getFilteredTickets = () => {
    if (selectedFilter === 'All') return tickets;
    return tickets.filter(ticket => ticket.status === selectedFilter);
  };

  const formatDate = (date) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now - d;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const renderTicketCard = ({ item }) => (
    <TouchableOpacity
      style={styles.ticketCard}
      onPress={() => navigation.navigate('TicketDetails', { ticketId: item._id })}
      activeOpacity={0.7}
    >
      <View style={styles.ticketHeader}>
        <View style={styles.ticketIdContainer}>
          <Ionicons name="ticket" size={16} color="#EC4D4A" />
          <Text style={styles.ticketId}>{item.ticketId}</Text>
        </View>
        <View style={[styles.priorityBadge, { backgroundColor: PRIORITY_COLORS[item.priority] }]}>
          <Text style={styles.priorityText}>{item.priority}</Text>
        </View>
      </View>

      <Text style={styles.subject} numberOfLines={1}>{item.subject}</Text>
      <Text style={styles.description} numberOfLines={2}>{item.description}</Text>

      <View style={styles.ticketFooter}>
        <View style={styles.issueTypeContainer}>
          <Ionicons name="pricetag-outline" size={14} color="#666" />
          <Text style={styles.issueType}>{item.issueType}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[item.status] }]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>

      <View style={styles.ticketMeta}>
        <View style={styles.metaItem}>
          <Ionicons name="time-outline" size={14} color="#999" />
          <Text style={styles.metaText}>{formatDate(item.createdAt)}</Text>
        </View>
        {item.comments && item.comments.length > 0 && (
          <View style={styles.metaItem}>
            <Ionicons name="chatbubble-outline" size={14} color="#999" />
            <Text style={styles.metaText}>{item.comments.length} replies</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="document-text-outline" size={80} color="#ccc" />
      <Text style={styles.emptyTitle}>No Tickets Found</Text>
      <Text style={styles.emptyText}>
        {selectedFilter === 'All'
          ? "You haven't raised any support tickets yet."
          : `No ${selectedFilter.toLowerCase()} tickets found.`}
      </Text>
      <TouchableOpacity
        style={styles.raiseTicketBtn}
        onPress={() => navigation.navigate('RaiseTicket')}
      >
        <Ionicons name="add-circle" size={20} color="#fff" />
        <Text style={styles.raiseTicketText}>Raise a Ticket</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.safeArea}>
        <View style={styles.container}>
          <HeaderWithBackButton title="My Tickets" />
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#EC4D4A" />
            <Text style={styles.loadingText}>Loading tickets...</Text>
          </View>
        </View>
      </View>
    );
  }

  const filteredTickets = getFilteredTickets();

  return (
    <View style={styles.safeArea}>
      <View style={styles.container}>
        <HeaderWithBackButton title="My Tickets" />

        {/* Filter Tabs */}
        <View style={styles.filterContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {filters.map((filter) => {
              const count = filter === 'All' 
                ? tickets.length 
                : tickets.filter(t => t.status === filter).length;
              
              return (
                <TouchableOpacity
                  key={filter}
                  style={[
                    styles.filterTab,
                    selectedFilter === filter && styles.filterTabActive
                  ]}
                  onPress={() => setSelectedFilter(filter)}
                >
                  <Text style={[
                    styles.filterText,
                    selectedFilter === filter && styles.filterTextActive
                  ]}>
                    {filter}
                  </Text>
                  {count > 0 && (
                    <View style={[
                      styles.filterBadge,
                      selectedFilter === filter && styles.filterBadgeActive
                    ]}>
                      <Text style={[
                        styles.filterBadgeText,
                        selectedFilter === filter && styles.filterBadgeTextActive
                      ]}>
                        {count}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Tickets List */}
        <FlatList
          data={filteredTickets}
          renderItem={renderTicketCard}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#EC4D4A']}
              tintColor="#EC4D4A"
            />
          }
          showsVerticalScrollIndicator={false}
        />

        {/* Floating Action Button */}
        {filteredTickets.length > 0 && (
          <TouchableOpacity
            style={styles.fab}
            onPress={() => navigation.navigate('RaiseTicket')}
          >
            <Ionicons name="add" size={28} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
    </View>
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
  filterContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    borderRadius: 16,
    backgroundColor: '#f5f5f5',
  },
  filterTabActive: {
    backgroundColor: '#EC4D4A',
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  filterTextActive: {
    color: '#fff',
  },
  filterBadge: {
    backgroundColor: '#ddd',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 6,
    minWidth: 20,
    alignItems: 'center',
  },
  filterBadgeActive: {
    backgroundColor: '#fff',
  },
  filterBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#666',
  },
  filterBadgeTextActive: {
    color: '#EC4D4A',
  },
  listContent: {
    padding: 16,
    paddingBottom: 80,
  },
  ticketCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  ticketIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ticketId: {
    fontSize: 13,
    fontWeight: '700',
    color: '#EC4D4A',
    marginLeft: 6,
  },
  priorityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  subject: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  ticketFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  issueTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  issueType: {
    fontSize: 13,
    color: '#666',
    marginLeft: 4,
    flexShrink: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  ticketMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  metaText: {
    fontSize: 12,
    color: '#999',
    marginLeft: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  raiseTicketBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EC4D4A',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
  },
  raiseTicketText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#EC4D4A',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});

export default MyTicketsScreen;
