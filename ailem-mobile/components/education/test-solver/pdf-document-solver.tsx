import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, TextInput, Platform, Modal, ScrollView, LayoutAnimation, UIManager, PanResponder, Animated, Dimensions } from 'react-native';
import { Layers, Maximize, Minimize, PenTool, Trash2, ChevronDown, ChevronUp } from 'lucide-react-native';
import { WebView } from 'react-native-webview';
import { DrawingOverlay, Line } from './drawing-overlay';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const C = {
  RED: '#EF4444',
  INDIGO: '#6366F1'
};

export function PdfDocumentSolver({
  test,
  studentAnswers,
  studentTextAnswers,
  handleAnswer,
  handleTextAnswer,
  isReviewMode,
}: any) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isAnswerAreaVisible, setIsAnswerAreaVisible] = useState(true);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [drawingColor, setDrawingColor] = useState('#EF4444');
  const [drawingStrokeWidth, setDrawingStrokeWidth] = useState(3);
  const [lines, setLines] = useState<Line[]>([]);

  const windowHeight = Dimensions.get('window').height;
  const expandedHeight = windowHeight - 200;

  // Height Control
  const pdfHeight = useRef(new Animated.Value(400)).current;
  const lastHeight = useRef(400);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (evt, gestureState) => {
        let newHeight = lastHeight.current + gestureState.dy;
        if (newHeight < 200) newHeight = 200;
        if (newHeight > 800) newHeight = 800; // max reasonable height
        pdfHeight.setValue(newHeight);
      },
      onPanResponderRelease: (evt, gestureState) => {
        let newHeight = lastHeight.current + gestureState.dy;
        if (newHeight < 200) newHeight = 200;
        if (newHeight > 800) newHeight = 800;
        lastHeight.current = newHeight;
      }
    })
  ).current;

  if (!test) return null;

  const pdfUrl = test.fileUrl || "";
  const googleViewerUrl = `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(pdfUrl)}`;
  const source = Platform.OS === 'android' ? { uri: googleViewerUrl } : { uri: pdfUrl };

  const Toolbar = () => (
    <View className="absolute top-4 right-4 z-20 flex-col items-center gap-3">
      <TouchableOpacity 
        onPress={() => setIsFullscreen(!isFullscreen)} 
        className="w-10 h-10 bg-white/95 rounded-full items-center justify-center shadow-lg border border-slate-200"
      >
        {isFullscreen ? <Minimize size={20} color="#1e293b" /> : <Maximize size={20} color="#1e293b" />}
      </TouchableOpacity>
      
      <TouchableOpacity 
        onPress={() => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setIsAnswerAreaVisible(!isAnswerAreaVisible);
        }} 
        className={`w-10 h-10 rounded-full items-center justify-center shadow-lg border ${isAnswerAreaVisible ? 'bg-indigo-50 border-indigo-200' : 'bg-white/95 border-slate-200'}`}
      >
        <Layers size={20} color={isAnswerAreaVisible ? C.INDIGO : "#1e293b"} />
      </TouchableOpacity>

      <View className="w-px h-2 bg-slate-300" />
  
      <TouchableOpacity 
        onPress={() => setIsDrawingMode(!isDrawingMode)} 
        className={`w-10 h-10 rounded-full items-center justify-center shadow-lg border ${isDrawingMode ? 'bg-indigo-500 border-indigo-600' : 'bg-white/95 border-slate-200'}`}
      >
        <PenTool size={20} color={isDrawingMode ? 'white' : '#1e293b'} />
      </TouchableOpacity>
  
      {isDrawingMode && (
        <View className="bg-white/95 rounded-full p-2 items-center gap-3 shadow-lg border border-slate-200">
          {['#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#1E293B'].map(c => (
            <TouchableOpacity 
              key={c} 
              onPress={() => setDrawingColor(c)} 
              className="w-7 h-7 rounded-full" 
              style={{ backgroundColor: c, borderWidth: drawingColor === c ? 2 : 0, borderColor: '#333' }} 
            />
          ))}
          <View className="w-6 h-px bg-slate-200 my-1" />
          {/* Stroke Width selectors */}
          {[1, 2, 4, 8].map(w => (
            <TouchableOpacity
              key={w}
              onPress={() => setDrawingStrokeWidth(w)}
              className="w-7 h-7 rounded-full items-center justify-center bg-slate-50"
              style={{ borderWidth: drawingStrokeWidth === w ? 2 : 0, borderColor: drawingColor }}
            >
              <View style={{ width: w + 2, height: w + 2, borderRadius: w, backgroundColor: '#334155' }} />
            </TouchableOpacity>
          ))}
          <View className="w-6 h-px bg-slate-200 my-1" />
          <TouchableOpacity onPress={() => setLines([])} className="w-8 h-8 rounded-full bg-red-50 items-center justify-center">
            <Trash2 size={16} color="#EF4444" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderFormFields = () => {
    return Array.from({ length: test.questionCount || 20 }).map((_, i) => {
      const startNum = test.startNumber || 1;
      const qNum = (startNum + i).toString();
      
      if (test.openEnded) {
        const tAns = studentTextAnswers?.[qNum] || "";
        return (
          <View key={qNum} className="py-2 border-b border-slate-100 dark:border-slate-850 pb-2.5 space-y-2">
            <Text className={`font-black text-sm ${isFullscreen ? 'text-slate-300' : 'text-slate-500 dark:text-slate-400'}`}>Soru {qNum}</Text>
            <TextInput
              value={tAns}
              onChangeText={(text) => handleTextAnswer(qNum, text)}
              editable={!isReviewMode}
              multiline
              placeholder="Cevabınızı buraya yazın..."
              placeholderTextColor="#94a3b8"
              className={`border px-4 py-3 rounded-2xl min-h-[80px] ${
                isFullscreen 
                  ? 'bg-slate-800 border-slate-700 text-white' 
                  : 'bg-slate-50 dark:bg-slate-850 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white'
              }`}
              textAlignVertical="top"
            />
          </View>
        );
      }

      // Multiple Choice (Optical)
      const sAns = studentAnswers[qNum] || "";
      const cAns = test.answerKey?.[qNum];

      return (
        <View key={qNum} className="flex-row items-center justify-between py-2 border-b border-slate-100 dark:border-slate-850 pb-2.5">
          <View className="w-8 flex-row items-center">
            <Text className={`font-black text-sm ${isFullscreen ? 'text-slate-300' : 'text-slate-500 dark:text-slate-400'}`}>{qNum}.</Text>
          </View>
          
          <View className="flex-1 flex-row justify-end gap-2">
            {['A', 'B', 'C', 'D', 'E'].map(opt => {
              const isSelected = sAns === opt;
              const isCorrectOpt = isReviewMode && opt === cAns;
              const isWrongOpt = isReviewMode && isSelected && opt !== cAns;

              return (
                <TouchableOpacity
                  key={opt}
                  disabled={isReviewMode}
                  onPress={() => handleAnswer(qNum, isSelected ? '' : opt)}
                  className={`w-9 h-9 rounded-full border flex items-center justify-center font-bold text-xs ${
                    !isReviewMode
                      ? isSelected
                        ? 'bg-indigo-500 border-indigo-500 text-white'
                        : isFullscreen
                          ? 'bg-slate-800 border-slate-700 text-slate-300'
                          : 'bg-white border-slate-200 dark:bg-slate-800 dark:border-slate-700 text-slate-500'
                      : isCorrectOpt
                        ? 'bg-emerald-500 border-emerald-500 text-white'
                        : isWrongOpt
                          ? 'bg-rose-500 border-rose-500 text-white'
                          : isFullscreen
                            ? 'bg-slate-800 border-slate-800 text-slate-500 opacity-40'
                            : 'bg-slate-50 border-slate-100 dark:bg-slate-850 dark:border-slate-800 text-slate-300 opacity-40'
                  }`}
                >
                  <Text className={`font-black ${isSelected || (isReviewMode && (isCorrectOpt || isWrongOpt)) ? 'text-white' : (isFullscreen ? 'text-slate-300' : 'text-slate-600 dark:text-slate-350')}`}>
                    {opt}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>
      );
    });
  };

  const renderContent = () => (
    <View className={isFullscreen ? "flex-1 bg-black/95 pt-12 pb-6 px-4" : "space-y-4"}>
      
      {/* PDF View with Toolbar and DrawingOverlay */}
      {pdfUrl ? (
        <Animated.View 
          style={isFullscreen ? { flex: 1, marginBottom: isAnswerAreaVisible ? 16 : 0 } : { height: isAnswerAreaVisible ? pdfHeight : expandedHeight }} 
          className="w-full rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white relative"
        >
          <Toolbar />
          
          {Platform.OS === 'web' ? (
            <iframe src={pdfUrl} style={{ width: '100%', height: '100%', border: 'none' }} />
          ) : (
            <WebView 
              source={source} 
              style={{ flex: 1, width: '100%', height: '100%' }}
              scalesPageToFit={true}
              nestedScrollEnabled={true}
            />
          )}

          <DrawingOverlay 
            isDrawingMode={isDrawingMode}
            currentColor={drawingColor}
            strokeWidth={drawingStrokeWidth}
            lines={lines}
            setLines={setLines}
          />
        </Animated.View>
      ) : null}

      {/* Resize Handle (Only visible when not fullscreen AND answer area is visible) */}
      {!isFullscreen && isAnswerAreaVisible && (
        <View 
          className="items-center justify-center z-10" 
          hitSlop={{ top: 20, bottom: 20, left: 40, right: 40 }}
          {...panResponder.panHandlers}
        >
          <View className="w-10 h-1 bg-slate-400 dark:bg-slate-500 rounded-full" />
        </View>
      )}

      {/* Answer Area Form */}
      {isAnswerAreaVisible && (
        <ScrollView 
          className={`max-h-72 ${isFullscreen ? 'bg-slate-900' : 'bg-white dark:bg-slate-900'} border border-slate-200 dark:border-slate-800 rounded-3xl p-4`} 
          nestedScrollEnabled
        >
          <View className="space-y-2 pb-6">
             {renderFormFields()}
          </View>
        </ScrollView>
      )}
    </View>
  );

  return (
    <>
      {isFullscreen ? (
        <Modal visible animationType="fade" onRequestClose={() => setIsFullscreen(false)} transparent>
          {renderContent()}
        </Modal>
      ) : (
        renderContent()
      )}
    </>
  );
}
