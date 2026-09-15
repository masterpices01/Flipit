import React, { useState, useRef, useEffect } from 'react';
import { 
  StyleSheet, View, Text, TouchableOpacity, 
  PanResponder, Animated, Platform, ScrollView, 
  useWindowDimensions 
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import Slider from '@react-native-community/slider';

const FloatingSettingsPanel = ({ settings, setSettings, onRestart, moves }) => {
  const [isVisible, setIsVisible] = useState(false);
  const { height: windowHeight } = useWindowDimensions();
  const pan = useRef(new Animated.ValueXY({ x: 20, y: 50 })).current;
  const isWeb = Platform.OS === 'web';
  const BG_COLORS = ['#999', '#b8b8b8', '#888', '#aaa'];

  // [Fix] 1. 建立一個本地狀態來暫存滑桿的數值，避免拖曳時頻繁觸發 App 重繪
  const [localSettings, setLocalSettings] = useState(settings);

  // [Fix] 2. 當外部 settings 改變時 (例如重置遊戲)，同步回本地狀態
  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        pan.setOffset({ x: pan.x._value, y: pan.y._value });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
      onPanResponderRelease: () => {
        pan.flattenOffset();
      },
    })
  ).current;

  // [Fix] 3. 封裝一個通用的更新函式：只有在「放開手」時才通知 App 更新
  const handleSliderComplete = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  // [Fix] 4. 拖曳過程中只更新本地 UI
  const handleSliderChange = (key, value) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
  };

  if (!isVisible) return (
    <TouchableOpacity style={styles.trigger} onPress={() => setIsVisible(true)}>
      <Text style={{fontSize: 24}}>⚙️</Text>
    </TouchableOpacity>
  );

  return (
    <Animated.View style={[
      styles.panel, 
      { 
        transform: [{ translateX: pan.x }, { translateY: pan.y }],
        maxHeight: windowHeight * 0.9 
      }
    ]}>
      <View {...(!isWeb ? panResponder.panHandlers : {})} style={styles.header}>
        <Text style={styles.headerTitle}>Settings (Moves: {moves})</Text>
        <TouchableOpacity 
        onPress={() => {
            console.log("Close button pressed"); // 偵錯用
            setIsVisible(false);
          }}
        style={styles.closeBtn}
        hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }} // 擴大感應範圍
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
        {/* Board Scale */}
        {/* 使用 localSettings 來顯示數值 */}
        <Text style={styles.label}>Board Scale: {(localSettings.boardSizeScale * 100).toFixed(0)}%</Text>
        <Slider
          style={styles.slider}
          minimumValue={0.5}
          maximumValue={1.5}
          step={0.1}
          value={localSettings.boardSizeScale} // 綁定本地變數
          onValueChange={(v) => handleSliderChange('boardSizeScale', v)} // 拖曳時只動本地
          onSlidingComplete={(v) => handleSliderComplete('boardSizeScale', v)} // 放開時才動全域
        />

        {/* Board Aspect Ratio */}
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

        {/* Modal Scale */}
        <Text style={styles.label}>Modal/Popup Scale: {(localSettings.modalScale * 100).toFixed(0)}%</Text>
        <Slider
          style={styles.slider}
          minimumValue={0.5}
          maximumValue={1.5}
          value={localSettings.modalScale}
          onValueChange={(v) => handleSliderChange('modalScale', v)}
          onSlidingComplete={(v) => handleSliderComplete('modalScale', v)}
        />

        <Text style={styles.label}>Background Color:</Text>
        <View style={styles.colorRow}>
          {BG_COLORS.map(c => (
            <TouchableOpacity 
              key={c} 
              // 顏色切換是一次性的點擊，可以直接更新 App settings
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

        <Text style={styles.label}>Screen Orientation:</Text>
        <View style={styles.pickerContainer}>
          <Picker 
            selectedValue={settings.orientation || 'DEFAULT'} 
            onValueChange={(v) => setSettings(prev => ({...prev, orientation: v}))}
            style={styles.picker}
            dropdownIconColor="#000"
            mode="dropdown"
          >
            <Picker.Item label="Auto (Default)" value="DEFAULT" color="#000" />
            <Picker.Item label="Portrait Lock" value="PORTRAIT" color="#000" />
            <Picker.Item label="Landscape Lock" value="LANDSCAPE" color="#000" />
          </Picker>
        </View>

        <TouchableOpacity style={styles.restartBtn} onPress={onRestart}>
          <Text style={styles.restartText}>Restart Game</Text>
        </TouchableOpacity>
      </ScrollView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  trigger: { 
    position: 'absolute', top: 40, right: 20, width: 50, height: 50, 
    backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 25, 
    justifyContent: 'center', alignItems: 'center', zIndex: 1000,
  },
  panel: { 
    position: 'absolute', width: '30%', minWidth: 300, top:"0%", backgroundColor: '#fff', 
    borderRadius: 12, elevation: 10, shadowOpacity: 0.3, zIndex: 1001,
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
    zIndex: 999, // 確保在最上層
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 30, // 給予固定最小寬度
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