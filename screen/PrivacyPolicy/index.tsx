import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

const PrivacyPolicyScreen = () => {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Content */}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.lastUpdated}>Last Updated: September 5, 2026</Text>

        <View style={styles.highlight}>
          <Text style={styles.highlightText}>
            <Text style={styles.bold}>TL;DR:</Text> We don't collect ANY personal data.
            Everything stays on your device. No ads, no tracking, no data collection.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>What We Collect</Text>
        <Text style={styles.paragraph}>
          Chess Engine does <Text style={styles.bold}>NOT</Text> collect any personal information.
        </Text>

        <Text style={styles.subsectionTitle}>We DO NOT Collect:</Text>
        <View style={styles.list}>
          <Text style={styles.listItem}>• Personal information (name, email, etc.)</Text>
          <Text style={styles.listItem}>• Location data</Text>
          <Text style={styles.listItem}>• Device identifiers</Text>
          <Text style={styles.listItem}>• User accounts or profiles</Text>
          <Text style={styles.listItem}>• Game history or statistics</Text>
          <Text style={styles.listItem}>• Analytics or usage data</Text>
        </View>

        <Text style={styles.subsectionTitle}>Local Storage Only:</Text>
        <Text style={styles.paragraph}>
          The app stores preferences locally on your device:
        </Text>
        <View style={styles.list}>
          <Text style={styles.listItem}>• Current game state</Text>
          <Text style={styles.listItem}>• Board color theme</Text>
          <Text style={styles.listItem}>• Clock settings</Text>
          <Text style={styles.listItem}>• Difficulty preferences</Text>
        </View>
        <Text style={styles.paragraph}>
          This data never leaves your device and is not accessible to us or anyone else.
        </Text>

        <Text style={styles.sectionTitle}>Third-Party Services</Text>
        <Text style={styles.paragraph}>
          Chess Engine does <Text style={styles.bold}>NOT</Text> use any third-party services:
        </Text>
        <View style={styles.list}>
          <Text style={styles.listItem}>• No analytics platforms</Text>
          <Text style={styles.listItem}>• No advertising networks</Text>
          <Text style={styles.listItem}>• No social media integrations</Text>
          <Text style={styles.listItem}>• No cloud storage</Text>
        </View>
        <Text style={styles.paragraph}>
          The app works entirely offline and does not require an internet connection.
        </Text>

        <Text style={styles.sectionTitle}>Children's Privacy</Text>
        <Text style={styles.paragraph}>
          Chess Engine does not collect any information from anyone, including children under 13.
          The app is safe for users of all ages.
        </Text>

        <Text style={styles.sectionTitle}>Your Rights</Text>
        <Text style={styles.paragraph}>
          Since we don't collect any data, there's nothing to access, modify, or delete.
          However, you can always:
        </Text>
        <View style={styles.list}>
          <Text style={styles.listItem}>• Clear app data through device settings</Text>
          <Text style={styles.listItem}>• Uninstall the app to remove all local data</Text>
        </View>

        <Text style={styles.sectionTitle}>Legal Compliance</Text>
        <Text style={styles.paragraph}>
          This app complies with GDPR, CCPA, COPPA, and other privacy laws. Since we don't
          collect personal data, most regulations don't apply to our practices.
        </Text>

        <View style={styles.summary}>
          <Text style={styles.summaryTitle}>Quick Summary</Text>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryQuestion}>What data do we collect?</Text>
            <Text style={styles.summaryAnswer}>None. Preferences are stored locally only.</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryQuestion}>Do we share data?</Text>
            <Text style={styles.summaryAnswer}>No. There's no data to share.</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryQuestion}>Third-party services?</Text>
            <Text style={styles.summaryAnswer}>No. The app is fully offline.</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryQuestion}>Safe for children?</Text>
            <Text style={styles.summaryAnswer}>Yes. No data collected from any users.</Text>
          </View>
        </View>

        <Text style={styles.footer}>
          If you have questions about this policy, please contact us.
        </Text>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#f8f9fa',
  },
  backButton: {
    padding: 5,
    width: 40,
  },
  backIcon: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  lastUpdated: {
    fontSize: 12,
    color: '#666',
    marginBottom: 20,
    fontStyle: 'italic',
  },
  highlight: {
    backgroundColor: '#e8f5e9',
    padding: 15,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#4caf50',
    marginBottom: 20,
  },
  highlightText: {
    fontSize: 14,
    color: '#2e7d32',
    lineHeight: 20,
  },
  bold: {
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginTop: 20,
    marginBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: '#3498db',
    paddingBottom: 5,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#34495e',
    marginTop: 15,
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 14,
    color: '#333',
    lineHeight: 22,
    marginBottom: 15,
  },
  list: {
    marginLeft: 10,
    marginBottom: 15,
  },
  listItem: {
    fontSize: 14,
    color: '#333',
    lineHeight: 24,
  },
  summary: {
    backgroundColor: '#e3f2fd',
    padding: 15,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#2196f3',
    marginTop: 20,
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1976d2',
    marginBottom: 15,
  },
  summaryItem: {
    marginBottom: 12,
  },
  summaryQuestion: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1976d2',
    marginBottom: 3,
  },
  summaryAnswer: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  footer: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 20,
    fontStyle: 'italic',
  },
});

export default PrivacyPolicyScreen;
