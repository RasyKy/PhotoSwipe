import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function DeleteScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Delete Queue</Text>
      <Text style={styles.subtitle}>Placeholder for Student B</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '600' },
  subtitle: { marginTop: 8, fontSize: 16, opacity: 0.7 },
});
