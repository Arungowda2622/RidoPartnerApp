// CompletedRideScreen.js
import React from 'react';
import {
    SafeAreaView,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    StatusBar,
    Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

const CompletedRideScreen = () => {
    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#1a1a1a" />

            {/* Header with gradient background */}
            <LinearGradient
                colors={['#1a1a1a', '#2d2d2d']}
                style={styles.headerGradient}
            >
                <View style={styles.header}>
                    <TouchableOpacity style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="#fff" />
                    </TouchableOpacity>
                    <View style={styles.headerContent}>
                        <Text style={styles.headerTitle}>Ride Completed</Text>
                        <Text style={styles.headerSubtitle}>Great job! 🎉</Text>
                    </View>
                    <TouchableOpacity style={styles.helpButton}>
                        <Ionicons name="help-circle" size={24} color="#fff" />
                    </TouchableOpacity>
                </View>
            </LinearGradient>

            {/* Page content */}
            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {/* Client Info Card */}


                {/* Earnings Card */}
                <View style={styles.earningsCard}>
                    <LinearGradient
                        colors={['#EC4D4A', '#ff6b6b']}
                        style={styles.earningsGradient}
                    >
                        <View style={styles.earningsHeader}>
                            <View>
                                <Text style={styles.earningsLabel}>Your Earnings</Text>
                                <Text style={styles.earningsAmount}>₹681</Text>
                            </View>
                            <TouchableOpacity style={styles.infoButton}>
                                <Ionicons name="information-circle" size={24} color="#fff" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.rideDetails}>
                            <View style={styles.rideDetailItem}>
                                <Ionicons name="time" size={16} color="#fff" />
                                <Text style={styles.rideDetailText}>Today, 7:03 PM</Text>
                            </View>
                            <View style={styles.rideDetailItem}>
                                <Ionicons name="receipt" size={16} color="#fff" />
                                <Text style={styles.rideDetailText}>#3255351236760989971</Text>
                            </View>
                        </View>
                    </LinearGradient>
                </View>

                {/* Fare Breakdown Card */}
                <View style={styles.breakdownCard}>
                    <Text style={styles.breakdownTitle}>💰 Fare Breakdown</Text>
                    
                    <View style={styles.breakdownSection}>
                        <Text style={styles.sectionTitle}>Trip Charges</Text>
                        
                        <View style={styles.breakdownRow}>
                            <Text style={styles.breakdownLabel}>Base Fare</Text>
                            <Text style={styles.breakdownValue}>₹80</Text>
                        </View>
                        
                        <View style={styles.breakdownRow}>
                            <Text style={styles.breakdownLabel}>Distance (15 km × ₹25/km)</Text>
                            <Text style={styles.breakdownValue}>₹375</Text>
                        </View>
                        
                        <View style={styles.breakdownRow}>
                            <Text style={styles.breakdownLabel}>Traffic Surcharge (12%)</Text>
                            <Text style={styles.breakdownValue}>₹35</Text>
                        </View>
                        
                        <View style={styles.breakdownRow}>
                            <Text style={styles.breakdownLabel}>Load Charges (50 kg)</Text>
                            <Text style={styles.breakdownValue}>₹40</Text>
                        </View>
                        
                        <View style={styles.surgeBadgeContainer}>
                            <Ionicons name="trending-up" size={16} color="#FF6B6B" />
                            <Text style={styles.surgeBadgeText}>1.4x Surge Applied</Text>
                        </View>
                    </View>
                    
                    <View style={styles.breakdownDivider} />
                    
                    <View style={styles.breakdownRow}>
                        <Text style={styles.totalLabel}>Total Amount</Text>
                        <Text style={styles.totalValue}>₹757</Text>
                    </View>
                    
                    <View style={styles.breakdownRow}>
                        <Text style={styles.feeLabel}>Platform Fee (10%)</Text>
                        <Text style={styles.feeValue}>-₹76</Text>
                    </View>
                    
                    <View style={styles.breakdownDivider} />
                    
                    <View style={styles.earningsHighlight}>
                        <View style={styles.earningsHighlightContent}>
                            <Ionicons name="wallet" size={20} color="#4CAF50" />
                            <Text style={styles.earningsHighlightLabel}>You Received</Text>
                        </View>
                        <Text style={styles.earningsHighlightValue}>₹681</Text>
                    </View>
                    
                    <View style={styles.infoBox}>
                        <Ionicons name="information-circle" size={16} color="#2196F3" />
                        <Text style={styles.infoText}>
                            This amount has been added to your wallet balance
                        </Text>
                    </View>
                </View>

                {/* Trip Stats Card */}
                <View style={styles.statsCard}>
                    <View style={styles.statItem}>
                        <View style={styles.statIcon}>
                            <Ionicons name="speedometer" size={24} color="#EC4D4A" />
                        </View>
                        <View style={styles.statContent}>
                            <Text style={styles.statValue}>1.8 km</Text>
                            <Text style={styles.statLabel}>Distance</Text>
                        </View>
                    </View>

                    <View style={styles.statDivider} />

                    <View style={styles.statItem}>
                        <View style={styles.statIcon}>
                            <Ionicons name="bicycle" size={24} color="#2196F3" />
                        </View>
                        <View style={styles.statContent}>
                            <Text style={styles.statValue}>Motorcycle</Text>
                            <Text style={styles.statLabel}>Vehicle</Text>
                        </View>
                    </View>
                </View>

                {/* Route Card */}
                <View style={styles.routeCard}>
                    <Text style={styles.routeTitle}>Trip Route</Text>

                    <View style={styles.routeItem}>
                        <View style={styles.routeIcon}>
                            <Ionicons name="ellipse" size={12} color="#007aff" />
                        </View>
                        <View style={styles.routeContent}>
                            <Text style={styles.routeLabel}>Pickup</Text>
                            <Text style={styles.routeAddress}>7/5, 9th Cross Road</Text>
                        </View>
                    </View>

                    <View style={styles.routeLine} />

                    <View style={styles.routeItem}>
                        <View style={styles.routeIcon}>
                            <Ionicons name="location" size={16} color="#4CAF50" />
                        </View>
                        <View style={styles.routeContent}>
                            <Text style={styles.routeLabel}>Drop-off</Text>
                            <Text style={styles.routeAddress}>Regina Raj Bliss, 24, Emerald 1st Cross Road</Text>
                        </View>
                    </View>
                </View>

                {/* Quick Actions */}
                <View style={styles.quickActions}>
                    <TouchableOpacity style={styles.actionButton}>
                        <Ionicons name="share" size={20} color="#EC4D4A" />
                        <Text style={styles.actionText}>Share Trip</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.actionButton}>
                        <Ionicons name="receipt" size={20} color="#2196F3" />
                        <Text style={styles.actionText}>Download Receipt</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.actionButton}>
                        <Ionicons name="star" size={20} color="#FFC107" />
                        <Text style={styles.actionText}>Rate Client</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>

            {/* Bottom CTA */}
            <View style={styles.bottomContainer}>
                <TouchableOpacity style={styles.reviewButton}>
                    <LinearGradient
                        colors={['#EC4D4A', '#ff6b6b']}
                        style={styles.reviewGradient}
                    >
                        <Ionicons name="star" size={20} color="#fff" />
                        <Text style={styles.reviewText}>Give Review</Text>
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

export default CompletedRideScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    headerGradient: {
        paddingTop: 10,
        paddingBottom: 20,
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 10,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerContent: {
        flex: 1,
        marginLeft: 15,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 2,
    },
    headerSubtitle: {
        fontSize: 14,
        color: '#ccc',
    },
    helpButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollView: {
        flex: 1,
        paddingHorizontal: 20,
    },
    clientCard: {
        backgroundColor: '#fff',
        borderRadius: 15,
        padding: 20,
        marginTop: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    clientInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    clientAvatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#EC4D4A',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    clientDetails: {
        flex: 1,
    },
    clientName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 2,
    },
    clientStatus: {
        fontSize: 14,
        color: '#4CAF50',
        fontWeight: '500',
    },
    callButton: {
        width: 45,
        height: 45,
        borderRadius: 22.5,
        backgroundColor: '#E8F5E8',
        justifyContent: 'center',
        alignItems: 'center',
    },
    earningsCard: {
        marginTop: 20,
        borderRadius: 15,
        overflow: 'hidden',
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
    },
    earningsGradient: {
        padding: 25,
    },
    earningsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 20,
    },
    earningsLabel: {
        fontSize: 16,
        color: '#fff',
        opacity: 0.9,
        marginBottom: 5,
    },
    earningsAmount: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#fff',
    },
    infoButton: {
        width: 35,
        height: 35,
        borderRadius: 17.5,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    rideDetails: {
        gap: 12,
    },
    rideDetailItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    rideDetailText: {
        fontSize: 14,
        color: '#fff',
        opacity: 0.9,
    },
    statsCard: {
        backgroundColor: '#fff',
        borderRadius: 15,
        padding: 20,
        marginTop: 20,
        flexDirection: 'row',
        alignItems: 'center',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    statItem: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    statIcon: {
        width: 45,
        height: 45,
        borderRadius: 22.5,
        backgroundColor: '#f8f9fa',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    statContent: {
        flex: 1,
    },
    statValue: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 2,
    },
    statLabel: {
        fontSize: 14,
        color: '#666',
    },
    statDivider: {
        width: 1,
        height: 40,
        backgroundColor: '#e0e0e0',
        marginHorizontal: 20,
    },
    routeCard: {
        backgroundColor: '#fff',
        borderRadius: 15,
        padding: 20,
        marginTop: 20,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    routeTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        marginBottom: 15,
    },
    routeItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 15,
    },
    routeIcon: {
        width: 30,
        alignItems: 'center',
        marginRight: 15,
        marginTop: 2,
    },
    routeContent: {
        flex: 1,
    },
    routeLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: '#666',
        marginBottom: 2,
    },
    routeAddress: {
        fontSize: 15,
        color: '#333',
    },
    breakdownCard: {
        backgroundColor: '#fff',
        borderRadius: 15,
        padding: 20,
        marginTop: 20,
        marginBottom: 20,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    breakdownTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#333',
        marginBottom: 20,
    },
    breakdownSection: {
        marginBottom: 15,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666',
        marginBottom: 12,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    breakdownRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
    },
    breakdownLabel: {
        fontSize: 14,
        color: '#666',
        flex: 1,
    },
    breakdownValue: {
        fontSize: 14,
        color: '#333',
        fontWeight: '500',
        marginLeft: 10,
    },
    surgeBadgeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFE5E5',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        marginTop: 12,
        alignSelf: 'flex-start',
    },
    surgeBadgeText: {
        fontSize: 13,
        color: '#FF6B6B',
        fontWeight: '600',
        marginLeft: 6,
    },
    breakdownDivider: {
        height: 1,
        backgroundColor: '#E0E0E0',
        marginVertical: 15,
    },
    totalLabel: {
        fontSize: 16,
        fontWeight: '700',
        color: '#333',
    },
    totalValue: {
        fontSize: 16,
        fontWeight: '700',
        color: '#EC4D4A',
    },
    feeLabel: {
        fontSize: 14,
        color: '#999',
        fontStyle: 'italic',
    },
    feeValue: {
        fontSize: 14,
        color: '#999',
        fontWeight: '500',
    },
    earningsHighlight: {
        backgroundColor: '#E8F5E9',
        borderRadius: 12,
        padding: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 10,
    },
    earningsHighlightContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    earningsHighlightLabel: {
        fontSize: 15,
        fontWeight: '600',
        color: '#2E7D32',
        marginLeft: 10,
    },
    earningsHighlightValue: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1B5E20',
    },
    infoBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E3F2FD',
        padding: 12,
        borderRadius: 8,
        marginTop: 15,
    },
    infoText: {
        fontSize: 13,
        color: '#1976D2',
        marginLeft: 8,
        flex: 1,
        lineHeight: 20,
    },
    routeLine: {
        width: 2,
        height: 30,
        backgroundColor: '#e0e0e0',
        marginLeft: 14,
        marginBottom: 15,
    },
    quickActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 20,
        marginBottom: 20,
    },
    actionButton: {
        flex: 1,
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 15,
        alignItems: 'center',
        marginHorizontal: 5,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    actionText: {
        fontSize: 12,
        fontWeight: '500',
        color: '#333',
        marginTop: 5,
    },
    bottomContainer: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    reviewButton: {
        borderRadius: 15,
        overflow: 'hidden',
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
    },
    reviewGradient: {
        paddingVertical: 18,
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    reviewText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
        marginLeft: 10,
    },
});
