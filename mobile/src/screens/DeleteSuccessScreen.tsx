import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity, SafeAreaView } from 'react-native';
import { formatFileSize } from '../utils/fileSize';

interface DeleteSuccessScreenProps {
  deletedCount: number;
  freedStorage: number;
  failedCount: number;
  onContinue: () => void;
}

const DeleteSuccessScreen: React.FC<DeleteSuccessScreenProps> = ({
  deletedCount,
  freedStorage,
  failedCount,
  onContinue,
}) => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Success Icon */}
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>✓</Text>
        </View>

        {/* Title */}
        <Text style={styles.title}>Deletion Complete!</Text>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Photos Deleted</Text>
            <Text style={styles.statValue}>{deletedCount}</Text>
          </View>

          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Storage Freed</Text>
            <Text style={styles.statValueLarge}>{formatFileSize(freedStorage)}</Text>
          </View>

          {failedCount > 0 && (
            <View style={[styles.statItem, styles.errorItem]}>
              <Text style={styles.statLabel}>Failed</Text>
              <Text style={styles.failedValue}>{failedCount}</Text>
            </View>
          )}
        </View>

        {/* Message */}
        <Text style={styles.message}>
          {failedCount === 0
            ? 'All photos have been successfully deleted.'
            : `${deletedCount} photos deleted, ${failedCount} failed.`}
        </Text>

        {/* Continue Button */}
        <TouchableOpacity style={styles.button} onPress={onContinue}>
          <Text style={styles.buttonText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#34C759',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  icon: {
    fontSize: 48,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 24,
    textAlign: 'center',
  },
  statsContainer: {
    width: '100%',
    marginBottom: 24,
  },
  statItem: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#eeeeee',
  },
  errorItem: {
    backgroundColor: '#fff5f5',
    borderColor: '#ffdddd',
  },
  statLabel: {
    fontSize: 12,
    color: '#999999',
    marginBottom: 4,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
  },
  statValueLarge: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#34C759',
  },
  failedValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF3B30',
  },
  message: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});

export default DeleteSuccessScreen;
