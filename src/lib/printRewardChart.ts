import { FamilyMember, FamilyRewardSettings, BehaviorOption, getLevelInfo } from './data';

export const generateRewardChartHTML = (
  member: FamilyMember,
  settings: FamilyRewardSettings,
  behaviors: BehaviorOption[]
): string => {
  const target = settings.memberTargets?.[member.id];
  const rewardTitle = target?.bigRewardTitle || settings.bigRewardTitle || 'Büyük Ödül';
  const rewardEmoji = target?.bigRewardEmoji || settings.bigRewardEmoji || '🎁';
  const stickersNeeded = Math.min(20, Math.max(1, target?.stickersPerBigReward || settings.stickersPerBigReward || 10));
  const starsPerSticker = Math.max(1, settings.starsPerSticker || 10);
  const stickerEmoji = settings.stickerEmoji || '🌟';
  const levelInfo = getLevelInfo(member.totalStarsEarned || 0);

  const stickerRowsHtml = Array.from({ length: stickersNeeded }, (_, i) => {
    const stickerNum = i + 1;
    const miniTicksHtml = Array.from({ length: starsPerSticker }, (_, j) => {
      const starNum = j + 1;
      return `
        <div class="mini-tick-box">
          <span class="star-num">${starNum}</span>
          <span class="plus">+</span>
        </div>
      `;
    }).join('');

    return `
      <div class="sticker-row">
        <!-- Giant Sticker Box -->
        <div class="giant-sticker-box">
          <div class="sticker-num-badge">${stickerNum}. ETİKET</div>
          <div class="sticker-circle">
            <span class="sticker-emoji">${stickerEmoji}</span>
          </div>
          <div class="sticker-footer-text">Yapıştır</div>
        </div>

        <!-- Single Line Star Tracking -->
        <div class="stars-single-row-container">
          <div class="stars-row-title">⭐ ${stickerNum}. Etiket İçin Yıldızlar:</div>
          <div class="stars-single-row">
            ${miniTicksHtml}
          </div>
        </div>
      </div>
    `;
  }).join('');

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>${member.name} - Etiket ve Yıldız Çizelgesi</title>
    <style>
      @page { size: A4 portrait; margin: 5mm; }
      html, body { margin: 0; padding: 0; color: #2D1B69; background: #fff; font-family: 'Segoe UI', Arial, sans-serif; height: 100%; }
      * { box-sizing: border-box; }
      
      .chart-container {
        border: 3.5px solid #A259FF;
        border-radius: 16px;
        padding: 12px;
        background: #FFFFFF;
        height: 277mm;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
      }

      /* Header */
      .header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-bottom: 2px dashed #A259FF;
        padding-bottom: 8px;
        margin-bottom: 8px;
        flex-shrink: 0;
      }
      .avatar-box {
        font-size: 34px;
        background: #F0E6FF;
        width: 56px;
        height: 56px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2.5px solid #A259FF;
      }
      .title-box { text-align: center; flex: 1; margin: 0 10px; }
      .title-box h1 { margin: 0; font-size: 20px; color: #4A154B; letter-spacing: 0.5px; }
      .title-box p { margin: 2px 0 0 0; font-size: 11px; color: #6B46C1; font-weight: 700; }
      
      /* Big Reward Target Banner */
      .reward-target-banner {
        background: linear-gradient(135deg, #FFD700 0%, #FF8C00 100%);
        color: #fff;
        border-radius: 12px;
        padding: 9px 14px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 8px;
        box-shadow: 0 3px 8px rgba(255, 140, 0, 0.2);
        flex-shrink: 0;
      }
      .target-info { font-size: 16px; font-weight: 900; text-shadow: 1px 1px 2px rgba(0,0,0,0.2); }
      .target-badge {
        background: rgba(255,255,255,0.35);
        padding: 5px 12px;
        border-radius: 14px;
        font-size: 11.5px;
        font-weight: 900;
        border: 1.5px solid rgba(255,255,255,0.7);
      }

      .section-header {
        font-size: 11px;
        font-weight: 900;
        color: #5A2A82;
        margin-bottom: 4px;
        letter-spacing: 0.5px;
        flex-shrink: 0;
      }

      /* Sticker Rows Container - Fills Page Vertically */
      .sticker-list-container {
        display: flex;
        flex-direction: column;
        justify-content: space-evenly;
        flex: 1;
        gap: 6px;
        padding: 4px 0;
      }

      .sticker-row {
        display: flex;
        align-items: center;
        background: #F8F4FF;
        padding: 6px 10px;
        border-radius: 12px;
        border: 1.5px solid #E9D8FD;
        gap: 10px;
        flex: 1;
        max-height: 22mm;
      }

      /* Giant Sticker Box */
      .giant-sticker-box {
        border: 2px dashed #A259FF;
        border-radius: 10px;
        width: 76px;
        height: 100%;
        min-height: 52px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        position: relative;
        background: #FFFFFF;
        flex-shrink: 0;
      }
      .sticker-num-badge {
        position: absolute;
        top: 2px;
        left: 3px;
        font-size: 8px;
        font-weight: 900;
        color: #6B46C1;
        background: #F0E6FF;
        padding: 1px 5px;
        border-radius: 5px;
      }
      .sticker-circle {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        border: 1.5px dashed #D6BCFA;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #FAF5FF;
        margin-top: 6px;
      }
      .sticker-emoji { font-size: 18px; opacity: 0.25; }
      .sticker-footer-text { font-size: 7px; color: #A0AEC0; font-weight: 700; margin-top: 2px; }

      /* STRICT Single Row Stars Container */
      .stars-single-row-container {
        flex: 1;
        display: flex;
        flex-direction: column;
        justify-content: center;
        min-width: 0;
      }
      .stars-row-title {
        font-size: 10px;
        font-weight: 800;
        color: #6B46C1;
        margin-bottom: 4px;
        white-space: nowrap;
      }
      .stars-single-row {
        display: grid;
        grid-template-columns: repeat(${starsPerSticker}, 1fr);
        gap: 3px;
        width: 100%;
      }
      .mini-tick-box {
        border: 1.5px solid #CBD5E0;
        border-radius: 5px;
        height: 26px;
        background: white;
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
      }
      .mini-tick-box .star-num {
        position: absolute;
        top: 1px;
        left: 2px;
        font-size: 6.5px;
        font-weight: 800;
        color: #A0AEC0;
      }
      .mini-tick-box .plus {
        font-size: 12px;
        font-weight: 900;
        color: #CBD5E0;
        margin-top: 2px;
      }

      /* Footer */
      .footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 6px;
        padding-top: 6px;
        border-top: 1.5px dashed #CBD5E0;
        font-size: 9.5px;
        color: #718096;
        flex-shrink: 0;
      }
      .signature-box {
        border-bottom: 1.5px dashed #718096;
        width: 130px;
        display: inline-block;
        margin-left: 6px;
      }
    </style>
  </head>
  <body>
    <div class="chart-container">
      
      <!-- Header -->
      <div class="header">
        <div class="avatar-box">${member.avatar || (member.role === 'Kız Çocuk' ? '👧' : '👦')}</div>
        <div class="title-box">
          <h1>⭐ ${member.name.toUpperCase()}'İN YILDIZ VE ETİKET ÇİZELGESİ ⭐</h1>
          <p>${levelInfo.emoji} ${levelInfo.label} • Her ${starsPerSticker} Yıldız (+), 1 ${stickerEmoji} Etiket Kazandırır!</p>
        </div>
        <div class="avatar-box" style="background:#FFE600; border-color:#FF8C00;">${rewardEmoji}</div>
      </div>

      <!-- Big Reward Target Banner -->
      <div class="reward-target-banner">
        <div class="target-info">
          🎯 BÜYÜK ÖDÜL HEDEFİM: ${rewardEmoji} ${rewardTitle.toUpperCase()}
        </div>
        <div class="target-badge">
          HEDEF: ${stickersNeeded} ${stickerEmoji} ETİKET
        </div>
      </div>

      <!-- Single Line Star Tracking Per Sticker -->
      <div class="section-header">
        <span>${stickerEmoji}</span> FİZİKİ ETİKET VE YILDIZ ÇİZELGESİ (Yıldızlarını Tek Satırda İşaretle, Etiketi Yapıştır!)
      </div>
      <div class="sticker-list-container">
        ${stickerRowsHtml}
      </div>

      <!-- Footer / Signature -->
      <div class="footer">
        <div>💡 <i>Kendi Başarı Çizelgen! Yıldızlarını tek satırda işaretle, 10 olunca etiketi yapıştır ve ödülü kap!</i></div>
        <div><b>Ebeveyn İmzası:</b> <span class="signature-box"></span></div>
      </div>

    </div>
  </body>
  </html>
  `;
};

export const printRewardChartOnWeb = (
  member: FamilyMember,
  settings: FamilyRewardSettings,
  behaviors: BehaviorOption[]
) => {
  const html = generateRewardChartHTML(member, settings, behaviors);
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  }
};
