/**
 * Settings Screen — Server config, preferences, and about section
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Switch,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Linking,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Colors } from '../../constants';

const STORAGE_KEYS = {
  serverUrl: '@grabvid_server_url',
  autoClipboard: '@grabvid_auto_clipboard',
  saveToPhotos: '@grabvid_save_to_photos',
};

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const maxW = isTablet ? 600 : width;

  const [serverUrl, setServerUrl] = useState('http://10.0.2.2:8000');
  const [autoClipboard, setAutoClipboard] = useState(true);
  const [saveToPhotos, setSaveToPhotos] = useState(true);

  // Load settings
  useEffect(() => {
    (async () => {
      const url = await AsyncStorage.getItem(STORAGE_KEYS.serverUrl);
      const clip = await AsyncStorage.getItem(STORAGE_KEYS.autoClipboard);
      const photos = await AsyncStorage.getItem(STORAGE_KEYS.saveToPhotos);
      if (url) setServerUrl(url);
      if (clip !== null) setAutoClipboard(clip === 'true');
      if (photos !== null) setSaveToPhotos(photos === 'true');
    })();
  }, []);

  // Save settings
  const saveServerUrl = async (url: string) => {
    setServerUrl(url);
    await AsyncStorage.setItem(STORAGE_KEYS.serverUrl, url);
  };

  const toggleAutoClipboard = async (val: boolean) => {
    setAutoClipboard(val);
    await AsyncStorage.setItem(STORAGE_KEYS.autoClipboard, val.toString());
  };

  const toggleSaveToPhotos = async (val: boolean) => {
    setSaveToPhotos(val);
    await AsyncStorage.setItem(STORAGE_KEYS.saveToPhotos, val.toString());
  };

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={[
        styles.content,
        { maxWidth: maxW, alignSelf: 'center', width: '100%' },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.headerTitle}>Settings</Text>

      {/* Server Section */}
      <Text style={styles.sectionLabel}>SERVER</Text>
      <View style={styles.card}>
        <Text style={styles.fieldLabel}>Server URL</Text>
        <TextInput
          style={styles.textInput}
          value={serverUrl}
          onChangeText={saveServerUrl}
          placeholder="http://localhost:8000"
          placeholderTextColor={Colors.textTertiary}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          selectionColor={Colors.textPrimary}
        />
      </View>

      {/* Preferences Section */}
      <Text style={styles.sectionLabel}>PREFERENCES</Text>
      <View style={styles.card}>
        <View style={styles.settingRow}>
          <Text style={styles.settingText}>Auto-detect clipboard links</Text>
          <Switch
            value={autoClipboard}
            onValueChange={toggleAutoClipboard}
            trackColor={{ false: Colors.surfaceTertiary, true: Colors.success + '50' }}
            thumbColor={autoClipboard ? Colors.success : Colors.textTertiary}
          />
        </View>
        <View style={styles.divider} />
        <View style={styles.settingRow}>
          <Text style={styles.settingText}>Save videos to Photos</Text>
          <Switch
            value={saveToPhotos}
            onValueChange={toggleSaveToPhotos}
            trackColor={{ false: Colors.surfaceTertiary, true: Colors.success + '50' }}
            thumbColor={saveToPhotos ? Colors.success : Colors.textTertiary}
          />
        </View>
      </View>

      {/* About Section */}
      <Text style={styles.sectionLabel}>ABOUT</Text>
      <View style={styles.card}>
        <View style={styles.settingRow}>
          <Text style={styles.settingText}>Version</Text>
          <Text style={styles.settingValue}>1.0.0</Text>
        </View>
        <View style={styles.divider} />
        <TouchableOpacity
          style={styles.settingRow}
          onPress={() => Linking.openURL('https://grabvid.app/privacy')}
          activeOpacity={0.7}
        >
          <Text style={styles.settingText}>Privacy Policy</Text>
          <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
        </TouchableOpacity>
        <View style={styles.divider} />
        <TouchableOpacity
          style={styles.settingRow}
          onPress={() => Linking.openURL('https://grabvid.app/terms')}
          activeOpacity={0.7}
        >
          <Text style={styles.settingText}>Terms of Service</Text>
          <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
        </TouchableOpacity>
      </View>

      {/* Legal Disclaimer */}
      <View style={styles.disclaimer}>
        <Text style={styles.disclaimerText}>
          GrabVid is intended for downloading media that you have the right to download.
          Users are responsible for complying with applicable copyright laws and platform
          terms of service.
        </Text>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.textPrimary,
    paddingVertical: 16,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textTertiary,
    marginTop: 24,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: Colors.surfacePrimary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  textInput: {
    fontSize: 15,
    color: Colors.textPrimary,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  settingText: {
    fontSize: 15,
    color: Colors.textPrimary,
  },
  settingValue: {
    fontSize: 15,
    color: Colors.textTertiary,
  },
  divider: {
    height: 0.5,
    backgroundColor: Colors.border,
    marginLeft: 16,
  },
  disclaimer: {
    marginTop: 32,
    paddingHorizontal: 8,
  },
  disclaimerText: {
    fontSize: 12,
    color: Colors.textTertiary,
    lineHeight: 18,
    textAlign: 'center',
  },
});
