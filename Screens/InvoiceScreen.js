import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  Dimensions,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { captureRef } from "react-native-view-shot";
import * as Sharing from "expo-sharing";

const { width } = Dimensions.get("window");

export default function InvoiceScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const booking = route?.params?.booking;
  const invoiceRef = React.useRef();

  // Extract booking details
  const invoiceNumber = booking?._id?.slice(-5).toUpperCase() || "12345";
  const invoiceDate = booking?.createdAt
    ? new Date(booking.createdAt).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : "25 June 2022";

  // Order Details
  const customerName = booking?.fromAddress?.receiverName || "Customer Name";
  const vehicleType = booking?.vehicleType || "Vehicle Details";
  const driverName = booking?.driverName || "Driver Name";
  const natureOfGoods = booking?.goodsType || "Nature Of Goods";
  const quantity = booking?.quantity || "Quantity";

  // Payment Details
  const tripFare = booking?.priceBreakdown?.components?.baseFare || booking?.price || 0;
  const couponDiscount = booking?.discount || 0;
  const roundingOff = booking?.roundingOff || 0;
  const tollCharges = booking?.tollCharges || 0;
  const totalFare = booking?.amountPay || booking?.price || 0;

  // Address Details
  const pickupLocation = booking?.fromAddress?.address || "Pickup Location";
  const droppingLocation = booking?.dropLocation?.[0]?.Address || "Dropping Location";

  // Parcel Photo
  const parcelPhoto = booking?.parcelImage || booking?.bookingImages?.[0];

  // Footer Details
  const gstCategory = "GST Category: Regular";
  const gstId = "29AABCU9603R1ZM";
  const cinCode = "U74900KA2016PTC12345";
  const sanCode = "SAN123456";
  const companyName = "RIDODROP LOGISTICS SOLUTIONS PRIVATE LIMITED";
  const companyAddress =
    "Road/Street: 6th Cross, Jayanagar 1st Block,\nSomeshwaranagar, Bengaluru, 560011";

  const handleDownload = async () => {
    try {
      const uri = await captureRef(invoiceRef, {
        format: "png",
        quality: 1,
      });
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri);
      } else {
        Alert.alert("Success", "Invoice saved!");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to generate invoice");
      console.error(error);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View ref={invoiceRef} style={styles.invoiceContainer}>
          {/* Header with RIDODROP branding and vehicles */}
          <View style={styles.headerSection}>
            <Image
              source={require("../assets/Modern Professional Business invoice Template.png")}
              style={styles.headerImage}
              resizeMode="contain"
            />
            <View style={styles.invoiceInfo}>
              <Text style={styles.invoiceLabel}>Invoice no : {invoiceNumber}</Text>
              <Text style={styles.invoiceDate}>{invoiceDate}</Text>
            </View>
          </View>

          {/* Main Content Container */}
          <View style={styles.contentContainer}>
            {/* Two Column Layout */}
            <View style={styles.detailsRow}>
              {/* Order Details Column */}
              <View style={styles.columnLeft}>
                <Text style={styles.sectionTitle}>Order Details</Text>
                <View style={styles.divider} />

                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Customer Name</Text>
                  <Text style={styles.detailValue}>{customerName}</Text>
                </View>

                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Vehicle Details</Text>
                  <Text style={styles.detailValue}>{vehicleType}</Text>
                </View>

                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Driver Name</Text>
                  <Text style={styles.detailValue}>{driverName}</Text>
                </View>

                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Nature Of Goods</Text>
                  <Text style={styles.detailValue}>{natureOfGoods}</Text>
                </View>

                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Quantity</Text>
                  <Text style={styles.detailValue}>{quantity}</Text>
                </View>
              </View>

              {/* Payment Details Column */}
              <View style={styles.columnRight}>
                <Text style={styles.sectionTitle}>Payment Details</Text>
                <View style={styles.divider} />

                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Trip Fare</Text>
                  <Text style={styles.detailValue}>₹{tripFare}</Text>
                </View>

                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Coupon Discount</Text>
                  <Text style={styles.detailValue}>₹{couponDiscount}</Text>
                </View>

                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Rounding Off</Text>
                  <Text style={styles.detailValue}>₹{roundingOff}</Text>
                </View>

                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Toll Charges</Text>
                  <Text style={styles.detailValue}>₹{tollCharges}</Text>
                </View>

                <View style={styles.totalFareContainer}>
                  <Text style={styles.totalFareLabel}>Total Fare</Text>
                  <Text style={styles.totalFareValue}>₹{totalFare}</Text>
                </View>
              </View>
            </View>

            {/* Parcel Photo Section */}
            <View style={styles.parcelSection}>
              <Text style={styles.parcelTitle}>Parcel Photo</Text>
              <View style={styles.parcelPhotoContainer}>
                {parcelPhoto ? (
                  <Image
                    source={{ uri: parcelPhoto }}
                    style={styles.parcelImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.placeholderImage}>
                    <Ionicons name="image-outline" size={48} color="#ccc" />
                    <Text style={styles.placeholderText}>No parcel photo</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Address Details */}
            <View style={styles.addressSection}>
              <Text style={styles.addressTitle}>ADDRESS DETAILS</Text>

              <View style={styles.locationRow}>
                <View style={styles.locationDotGreen} />
                <Text style={styles.locationLabel}>PICKUP LOCATION</Text>
              </View>
              <Text style={styles.locationAddress}>{pickupLocation}</Text>

              <View style={styles.dottedLine} />

              <View style={styles.locationRow}>
                <View style={styles.locationDotRed} />
                <Text style={styles.locationLabel}>DROPPING LOCATION</Text>
              </View>
              <Text style={styles.locationAddress}>{droppingLocation}</Text>
            </View>

            {/* Footer Section */}
            <View style={styles.footerSection}>
              <View style={styles.footerLeft}>
                <Text style={styles.footerText}>GST Category : {gstCategory}</Text>
                <Text style={styles.footerText}>GST ID            : {gstId}</Text>
                <Text style={styles.footerText}>CIN Code        : {cinCode}</Text>
                <Text style={styles.footerText}>SAN Code       : {sanCode}</Text>
              </View>

              <View style={styles.footerRight}>
                <Text style={styles.companyName}>{companyName}</Text>
                <Text style={styles.companyAddress}>{companyAddress}</Text>
              </View>
            </View>

            <Text style={styles.disclaimer}>
              This invoice has been generated electronically and is valid without any manual
              signature or company stamp
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={20} color="#fff" />
          <Text style={styles.buttonText}>Back</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.downloadButton} onPress={handleDownload}>
          <Ionicons name="download" size={20} color="#fff" />
          <Text style={styles.buttonText}>Download</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#2c2c2c",
  },
  scrollContent: {
    paddingVertical: 20,
  },
  invoiceContainer: {
    backgroundColor: "#fff",
    marginHorizontal: 10,
    marginBottom: 10,
    borderRadius: 20,
    overflow: "hidden",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  headerSection: {
    backgroundColor: "#fff",
    position: "relative",
  },
  headerImage: {
    width: "100%",
    height: 180,
  },
  invoiceInfo: {
    position: "absolute",
    top: 15,
    right: 20,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    padding: 12,
    borderRadius: 12,
  },
  invoiceLabel: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#000",
  },
  invoiceDate: {
    fontSize: 14,
    color: "#333",
    marginTop: 2,
  },
  contentContainer: {
    padding: 20,
    backgroundColor: "#fff",
  },
  detailsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  columnLeft: {
    flex: 1,
    marginRight: 10,
  },
  columnRight: {
    flex: 1,
    marginLeft: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 8,
  },
  divider: {
    height: 1,
    backgroundColor: "#ddd",
    marginBottom: 12,
  },
  detailItem: {
    backgroundColor: "#f5f5f5",
    padding: 10,
    marginBottom: 8,
    borderRadius: 6,
  },
  detailLabel: {
    fontSize: 11,
    color: "#666",
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 13,
    color: "#000",
    fontWeight: "500",
  },
  totalFareContainer: {
    backgroundColor: "#f0f0f0",
    padding: 12,
    marginTop: 4,
    borderRadius: 6,
  },
  totalFareLabel: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 4,
  },
  totalFareValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#000",
  },
  parcelSection: {
    marginBottom: 20,
  },
  parcelTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 10,
  },
  parcelPhotoContainer: {
    width: "100%",
    height: 220,
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    overflow: "hidden",
  },
  parcelImage: {
    width: "100%",
    height: "100%",
  },
  placeholderImage: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderText: {
    marginTop: 8,
    fontSize: 14,
    color: "#999",
  },
  addressSection: {
    marginBottom: 20,
    borderTopWidth: 1,
    borderTopColor: "#ddd",
    paddingTop: 15,
  },
  addressTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 15,
    letterSpacing: 0.5,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  locationDotGreen: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#4CAF50",
    marginRight: 10,
  },
  locationDotRed: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#E53935",
    marginRight: 10,
  },
  locationLabel: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#333",
    letterSpacing: 0.5,
  },
  locationAddress: {
    fontSize: 13,
    color: "#666",
    marginLeft: 24,
    marginBottom: 12,
  },
  dottedLine: {
    height: 30,
    width: 2,
    borderLeftWidth: 2,
    borderLeftColor: "#999",
    borderStyle: "dotted",
    marginLeft: 6,
    marginBottom: 8,
  },
  footerSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: "#ddd",
    marginBottom: 15,
  },
  footerLeft: {
    flex: 1,
  },
  footerRight: {
    flex: 1,
    alignItems: "flex-end",
  },
  footerText: {
    fontSize: 11,
    color: "#555",
    marginBottom: 4,
    fontFamily: "monospace",
  },
  companyName: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#000",
    textAlign: "right",
    marginBottom: 4,
  },
  companyAddress: {
    fontSize: 10,
    color: "#666",
    textAlign: "right",
  },
  disclaimer: {
    fontSize: 9,
    color: "#999",
    textAlign: "center",
    fontStyle: "italic",
    marginTop: 10,
  },
  actionButtons: {
    flexDirection: "row",
    padding: 15,
    backgroundColor: "#2c2c2c",
    justifyContent: "space-between",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#666",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    flex: 0.48,
    justifyContent: "center",
  },
  downloadButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E53935",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    flex: 0.48,
    justifyContent: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 8,
  },
});
