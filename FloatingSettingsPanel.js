import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, View, Text, TouchableOpacity, 
  Animated, Platform, ScrollView, 
  useWindowDimensions 
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import Slider from '@react-native-community/slider';

const FloatingSettingsPanel = ({ settings, setSettings, onRestart, moves }) => {
  const [isVisible, setIsVisible] = useState(false);
  const { height: windowHeight } = useWindowDimensions();
  const BG_COLORS = ['#999', '#b8b8b8', '#888', '#aaa'];

  const [localSettings, setLocalSettings] = useState(settings);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleSliderComplete = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSliderChange = (key, value) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
  };

  if (!isVisible) return (
    <TouchableOpacity style={styles.trigger} onPress={() => setIsVisible(true)}>
      <Text style={{fontSize: 24}}>⚙️</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.centerWrapper} pointerEvents="box-none">
      <Animated.View style={[
        styles.panel, 
        { maxHeight: windowHeight * 0.9 }
      ]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Settings (Moves: {moves})</Text>
          <TouchableOpacity 
            onPress={() => setIsVisible(false)}
            style={styles.closeBtn}
            hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
            activeOpacity={0.6}
          >
            <Text style={{fontSize: 20, fontWeight: 'bold'}}>×</Text>
          </TouchableOpacity>
        </View>

        <ScrollView 
          style={styles.scrollBody} 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={true}
        >
          <Text style={styles.label}>Board Scale: {(localSettings.boardSizeScale * 100).toFixed(0)}%</Text>
          <Slider
            style={styles.slider}
            minimumValue={0.5}
            maximumValue={1.5}
            step={0.1}
            value={localSettings.boardSizeScale}
            onValueChange={(v) => handleSliderChange('boardSizeScale', v)}
            onSlidingComplete={(v) => handleSliderComplete('boardSizeScale', v)}
          />

          <Text style={styles.label}>Layout Aspect: {localSettings.boardAspect.toFixed(2)}</Text>
          <Slider
            style={styles.slider}
            minimumValue={1}
            maximumValue={2}
            step={0.1}
            value={localSettings.boardAspect}
            onValueChange={(v) => handleSliderChange('boardAspect', v)}
            onSlidingComplete={(v) => handleSliderComplete('boardAspect', v)}
          />

          <Text style={styles.label}>Modal/Popup Scale: {(localSettings.modalScale * 100).toFixed(0)}%</Text>
          <Slider
            style={styles.slider}
            minimumValue={0.5}
            maximumValue={1.5}
            step={0.1}
            value={localSettings.modalScale}
            onValueChange={(v) => handleSliderChange('modalScale', v)}
            onSlidingComplete={(v) => handleSliderComplete('modalScale', v)}
          />

          <Text style={styles.label}>Background Color:</Text>
          <View style={styles.colorRow}>
            {BG_COLORS.map(c => (
              <TouchableOpacity 
                key={c} 
                style={[styles.colorBox, {backgroundColor: c, borderWidth: settings.bgColor === c ? 2 : 0}]} 
                onPress={() => setSettings(prev => ({...prev, bgColor: c}))} 
              />
            ))}
          </View>

          <Text style={styles.label}>Difficulty (Pairs):</Text>
          <View style={styles.pickerContainer}>
            <Picker 
              selectedValue={settings.difficulty} 
              onValueChange={(v) => setSettings(prev => ({...prev, difficulty: Number(v)}))}
              style={styles.picker}
              dropdownIconColor="#000"
              mode="dropdown"
            >
              {[12, 16, 20, 24,28,30,36,42,48,54,60].map(n => <Picker.Item key={n} label={`${n} Cards`} value={n} color="#000" />)}
            </Picker>
          </View>

          <TouchableOpacity style={styles.restartBtn} onPress={onRestart}>
            <Text style={styles.restartText}>Restart Game</Text>
          </TouchableOpacity>
        </ScrollView>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  centerWrapper: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1001,
  },
  trigger: { 
    position: 'absolute', top: 40, right: 20, width: 50, height: 50, 
    backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 25, 
    justifyContent: 'center', alignItems: 'center', zIndex: 1000,
  },
  panel: { 
    width: '30%', minWidth: 300, backgroundColor: '#fff', 
    borderRadius: 12, elevation: 10, shadowOpacity: 0.3,
    overflow: 'hidden',
  },
  header: { 
    padding: 12, backgroundColor: '#f1f1f1', flexDirection: 'row', 
    justifyContent: 'space-between', alignItems: 'center',overflow: 'hidden',
  },
  headerTitle: { fontWeight: 'bold', fontSize: 13 },
  scrollBody: { flex: 1 },
  scrollContent: { padding: 15, paddingBottom: 30 },
  closeBtn: { 
    padding: 5,
    zIndex: 999,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 30,
   },
  label: { fontSize: 12, marginBottom: 5, marginTop: 10, fontWeight: '600', color: '#333' },
  slider: { width: '100%', height: 40 },
  colorRow: { flexDirection: 'row', gap: 10 },
  colorBox: { width: 30, height: 30, borderRadius: 15, borderColor: '#333' },
  restartBtn: { marginTop: 20, backgroundColor: '#e74c3c', padding: 10, borderRadius: 8, alignItems: 'center' },
  restartText: { color: '#fff', fontWeight: 'bold' },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fafafa',
    marginBottom: 5,
  },
  picker: {
    width: '100%',
    height: Platform.OS === 'ios' ? 120 : 50,
    color: '#000',
  }
});

export default FloatingSettingsPanel;