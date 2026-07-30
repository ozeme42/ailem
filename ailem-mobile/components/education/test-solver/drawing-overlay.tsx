import React, { useState, useRef, useEffect } from 'react';
import { View, PanResponder, PanResponderInstance } from 'react-native';
import Svg, { Path } from 'react-native-svg';

export interface Line {
  path: string;
  color: string;
  strokeWidth: number;
}

interface DrawingOverlayProps {
  isDrawingMode: boolean;
  currentColor?: string;
  strokeWidth?: number;
  lines: Line[];
  setLines: React.Dispatch<React.SetStateAction<Line[]>>;
}

export function DrawingOverlay({ 
  isDrawingMode, 
  currentColor = '#EF4444', 
  strokeWidth = 3, 
  lines, 
  setLines 
}: DrawingOverlayProps) {
  const [currentPath, setCurrentPath] = useState<string>('');
  const currentPathRef = useRef<string>('');
  const isDrawingModeRef = useRef<boolean>(isDrawingMode);
  const currentColorRef = useRef<string>(currentColor);
  const strokeWidthRef = useRef<number>(strokeWidth);
  
  // Keep refs updated for PanResponder
  useEffect(() => {
    isDrawingModeRef.current = isDrawingMode;
  }, [isDrawingMode]);

  useEffect(() => {
    currentColorRef.current = currentColor;
  }, [currentColor]);

  useEffect(() => {
    strokeWidthRef.current = strokeWidth;
  }, [strokeWidth]);

  const panResponder = useRef<PanResponderInstance>(
    PanResponder.create({
      onStartShouldSetPanResponder: () => isDrawingModeRef.current,
      onMoveShouldSetPanResponder: () => isDrawingModeRef.current,
      onPanResponderGrant: (evt) => {
        if (!isDrawingModeRef.current) return;
        const { locationX, locationY } = evt.nativeEvent;
        const newPath = `M${locationX},${locationY}`;
        currentPathRef.current = newPath;
        setCurrentPath(newPath);
      },
      onPanResponderMove: (evt) => {
        if (!isDrawingModeRef.current) return;
        const { locationX, locationY } = evt.nativeEvent;
        const updatedPath = `${currentPathRef.current} L${locationX},${locationY}`;
        currentPathRef.current = updatedPath;
        setCurrentPath(updatedPath);
      },
      onPanResponderRelease: () => {
        if (!isDrawingModeRef.current) return;
        if (currentPathRef.current) {
          setLines((prev) => [...prev, { 
            path: currentPathRef.current, 
            color: currentColorRef.current, 
            strokeWidth: strokeWidthRef.current 
          }]);
        }
        currentPathRef.current = '';
        setCurrentPath('');
      },
      onPanResponderTerminate: () => {
        currentPathRef.current = '';
        setCurrentPath('');
      }
    })
  ).current;

  return (
    <View 
      className="absolute inset-0 z-10" 
      pointerEvents={isDrawingMode ? 'auto' : 'none'}
      {...panResponder.panHandlers}
    >
      <Svg style={{ flex: 1 }}>
        {lines.map((line, index) => (
          <Path
            key={index}
            d={line.path}
            stroke={line.color}
            strokeWidth={line.strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
        {currentPath ? (
          <Path
            d={currentPath}
            stroke={currentColor}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}
      </Svg>
    </View>
  );
}
