const fs = require('fs');
let code = fs.readFileSync('app/reading-session-play.tsx', 'utf8');

// 1. Hourglass
const hgSearch = `<View style={{ alignItems: 'center', justifyContent: 'center', marginTop: isFullScreen ? 0 : 20, marginBottom: isFullScreen ? 0 : 20, transform: [{ scale: isFullScreen ? 1.3 : 1 }] }}>
                <BlurView intensity={20} tint="dark" style={[styles.timerContainer, { paddingHorizontal: 50, paddingVertical: 16, marginBottom: 20, borderRadius: 30, backgroundColor: 'rgba(0,0,0,0.3)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }]}>
                  <Text style={[styles.timerText, { fontSize: 44, color: '#fbbf24' }]}>{formatTime(displaySeconds)}</Text>
                  <View style={[styles.statusBadge, { marginTop: 6, backgroundColor: 'transparent' }]}>
                    <View style={isActive ? styles.activeDot : styles.pausedDot} />
                    <Text style={isActive ? styles.statusTextActive : styles.statusTextPaused}>{isActive ? 'Okunuyor' : 'Duraklatıldı'}</Text>
                  </View>
                </BlurView>

                <View style={{ width: 160, height: 300 }}>`;
const hgReplace = `<View style={{ alignItems: 'center', justifyContent: 'center', marginTop: isFullScreen ? 0 : 20, marginBottom: isFullScreen ? 0 : 20, transform: [{ scale: isFullScreen ? 1.3 : 1 }] }}>
                <View style={{ width: 160, height: 300 }}>`;

const hgEndSearch = `                      </Svg>
                    );
                  })()}

                </View>
              </View>
            ) : timerMode === 'circular' ? (`;

const hgEndReplace = `                      </Svg>
                    );
                  })()}

                </View>
                
                <BlurView intensity={20} tint="dark" style={[styles.timerContainer, { paddingHorizontal: 50, paddingVertical: 16, marginTop: 20, borderRadius: 30, backgroundColor: 'rgba(0,0,0,0.3)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }]}>
                  <Text style={[styles.timerText, { fontSize: 44, color: '#fbbf24' }]}>{formatTime(displaySeconds)}</Text>
                  <View style={[styles.statusBadge, { marginTop: 6, backgroundColor: 'transparent' }]}>
                    <View style={isActive ? styles.activeDot : styles.pausedDot} />
                    <Text style={isActive ? styles.statusTextActive : styles.statusTextPaused}>{isActive ? 'Okunuyor' : 'Duraklatıldı'}</Text>
                  </View>
                </BlurView>

              </View>
            ) : timerMode === 'ring' ? (`;

code = code.replace(hgSearch, hgReplace);
code = code.replace(hgEndSearch, hgEndReplace);

// 2. Add 'orb' state
code = code.replace(/const \[timerMode, setTimerMode\] = useState<'digital' \| 'circular' \| 'hourglass' \| 'minimal'>\('hourglass'\);/, `const [timerMode, setTimerMode] = useState<'hourglass' | 'ring' | 'orb' | 'digital'>('hourglass');`);

// 3. Replace the timer modes rendering logic.
// Find the whole circular block.
const ringStart = `) : timerMode === 'ring' ? (`;
const ringEnd = `              </View>
            ) : (
              <BlurView intensity={20} tint="dark" style={[styles.timerContainer, { transform: [{ scale: isFullScreen ? 1.5 : 1 }] }]}>`;

const newOrbAndDigital = `) : timerMode === 'ring' ? (
              <View style={{ alignItems: 'center', justifyContent: 'center', transform: [{ scale: isFullScreen ? 1.3 : 1 }] }}>
                <Svg width="240" height="240" viewBox="0 0 240 240" style={{ position: 'absolute' }}>
                  <Circle cx="120" cy="120" r="105" stroke="rgba(255,255,255,0.1)" strokeWidth="6" fill="none" />
                  <AnimatedCircle 
                    cx="120" 
                    cy="120" 
                    r="105" 
                    stroke={isActive ? "#34d399" : "#f59e0b"} 
                    strokeWidth="6" 
                    fill="none" 
                    strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 105}
                    strokeDashoffset={circleAnim.interpolate({
                      inputRange: [0, 60],
                      outputRange: timerDirection === 'down' ? [0, 2 * Math.PI * 105] : [2 * Math.PI * 105, 0],
                      extrapolate: 'clamp'
                    })}
                    transform="rotate(-90 120 120)"
                  />
                </Svg>
                <BlurView intensity={20} tint="dark" style={[styles.timerContainer, { width: 180, height: 180, borderRadius: 90, justifyContent: 'center', borderWidth: 0 }]}>
                  <Text style={[styles.timerText, { fontSize: 42 }]}>{formatTime(displaySeconds)}</Text>
                  <View style={styles.statusBadge}>
                    <View style={isActive ? styles.activeDot : styles.pausedDot} />
                    <Text style={isActive ? styles.statusTextActive : styles.statusTextPaused}>{isActive ? 'Okunuyor' : 'Duraklatıldı'}</Text>
                  </View>
                </BlurView>
              </View>
            ) : timerMode === 'orb' ? (
              <View style={{ alignItems: 'center', justifyContent: 'center', transform: [{ scale: isFullScreen ? 1.3 : 1 }] }}>
                {(() => {
                  const fillPct = timerDirection === 'down' ? (targetMinutes * 60 - seconds) / (targetMinutes * 60) : (seconds % 60) / 60;
                  const validFillPct = isNaN(fillPct) ? 0 : Math.max(0, Math.min(1, fillPct));
                  const liqY = 240 - validFillPct * 240;
                  return (
                    <Svg width="240" height="240" viewBox="0 0 240 240" style={{ position: 'absolute' }}>
                      <Defs>
                        <ClipPath id="orb-clip">
                          <Circle cx="120" cy="120" r="110" />
                        </ClipPath>
                        <LinearGradient id="orb-liq" x1="0" y1="0" x2="0" y2="1">
                          <Stop offset="0%" stopColor="#34d399" />
                          <Stop offset="100%" stopColor="#10b981" />
                        </LinearGradient>
                      </Defs>
                      <Circle cx="120" cy="120" r="110" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
                      <Rect x="0" y={liqY} width="240" height="240" fill="url(#orb-liq)" clipPath="url(#orb-clip)" opacity="0.9" />
                      <Ellipse cx="70" cy="60" rx="15" ry="30" fill="white" opacity="0.15" transform="rotate(-30 70 60)" />
                    </Svg>
                  );
                })()}
                <BlurView intensity={20} tint="dark" style={[styles.timerContainer, { width: 180, height: 180, borderRadius: 90, justifyContent: 'center', borderWidth: 0, backgroundColor: 'transparent' }]}>
                  <Text style={[styles.timerText, { fontSize: 42, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: {width:0, height:2}, textShadowRadius: 4 }]}>{formatTime(displaySeconds)}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: 'rgba(0,0,0,0.2)' }]}>
                    <View style={isActive ? styles.activeDot : styles.pausedDot} />
                    <Text style={isActive ? styles.statusTextActive : styles.statusTextPaused}>{isActive ? 'Okunuyor' : 'Duraklatıldı'}</Text>
                  </View>
                </BlurView>
              </View>
            ) : (
              <BlurView intensity={20} tint="dark" style={[styles.timerContainer, { transform: [{ scale: isFullScreen ? 1.5 : 1 }] }]}>`;

code = code.substring(0, code.indexOf(ringStart)) + newOrbAndDigital + code.substring(code.indexOf(ringEnd) + ringEnd.length);


// 4. Update the bottom menu
const searchMenu = `                  {[
                    { id: 'hourglass', label: 'Kum Saati', icon: Hourglass },
                    { id: 'circular', label: 'Dairesel', icon: Circle },
                    { id: 'digital', label: 'Dijital', icon: Hash },
                    { id: 'minimal', label: 'Minimal', icon: Minimize2 }
                  ].map(item => {`;
const replaceMenu = `                  {[
                    { id: 'hourglass', label: 'Kum Saati', icon: Hourglass },
                    { id: 'ring', label: 'Halka', icon: Circle },
                    { id: 'orb', label: 'Küre', icon: Circle },
                    { id: 'digital', label: 'Dijital', icon: Hash }
                  ].map(item => {`;
code = code.replace(searchMenu, replaceMenu);

fs.writeFileSync('app/reading-session-play.tsx', code);
console.log('Script completed successfully.');
