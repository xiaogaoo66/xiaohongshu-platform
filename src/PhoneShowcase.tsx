import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig, Img, Audio, staticFile, Sequence } from "remotion";

interface PhoneShowcaseProps {
  // 手机基本信息
  phoneName: string;
  phoneImage: string;
  
  // 相机参数
  mainCamera: string;

  
  // 屏幕参数
  screenSize: string;
  screenResolution: string;
  screenRefreshRate: string;
  
  // 机身参数
  bodyMaterial: string;
  frameType: string;
  
  // 重量和厚度
  weight: string;
  thickness: string;
  
  // 处理器
  processor: string;
  
  // 电池参数
  batteryCapacity: string;
  wiredChargingPower: string;
  wirelessChargingPower: string;
  
  // 价格
  price12_256: string;
  price16_512?: string;
  price16_1TB?: string;
  
  // 样式
  backgroundColor?: string;
  textColor?: string;
  speaker_audio?: string;
}

export const PhoneShowcase: React.FC<PhoneShowcaseProps> = ({
  // 默认值
  phoneName = "OPPO Find X8 Ultra",
  phoneImage = "https://m.360buyimg.com/rank/jfs/t1/230277/11/5147/428304/65670a2eFed2b836c/6e6c735cfba1138e.png",
  mainCamera = "50MP",
  screenSize = "6.82 英寸 (对角线) OLED",
  screenResolution = "2K 京东方 直屏",
  screenRefreshRate = "120Hz",
  bodyMaterial = "玻璃背板",
  frameType = "金属中框",
  weight = "226g",
  thickness = "8.78mm",
  processor = "高通骁龙8 Elite",
  batteryCapacity = "6100mAh",
  wiredChargingPower = "100W有线充电",
  wirelessChargingPower = "50W无线充电",
  price12_256 = "¥ 5499",
  price16_512 = "¥ 6999",
  price16_1TB = "¥ 7999",
  backgroundColor = "#000000",
  textColor = "#ffffff",
  speaker_audio = "/result.wav",
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // 动画效果 - 整体淡入
  const opacity = interpolate(frame, [0, 30], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // 左侧内容从左滑入
  const leftContentX = spring({
    frame,
    fps,
    config: {
      damping: 20,
      stiffness: 100,
    },
    from: -300,
    to: 0,
  });

  // 右侧手机图片从右滑入，稍微延迟
  const rightContentX = spring({
    frame: frame - fps * 0.2,
    fps,
    config: {
      damping: 20,
      stiffness: 100,
    },
    from: 300,
    to: 0,
  });

  return (
    <AbsoluteFill style={{ 
      background: `linear-gradient(135deg, ${backgroundColor || "#000022"} 0%, #001133 50%, #000066 100%)`,
      opacity 
    }}>
      <Sequence from={1 *fps}>
        <Audio 
          src={speaker_audio ? (speaker_audio.startsWith('http') ? speaker_audio : staticFile(speaker_audio)) : staticFile(speaker_audio)} 
          volume={1}
        />
      </Sequence>
      {/* 背景装饰元素 - 固定位置 */}
      <div style={{
        position: "absolute",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        zIndex: 1
      }}>
        {/* 大型渐变圆 - 固定位置 */}
        <div style={{
          position: "absolute",
          top: height * 0.2,
          left: width * 0.1,
          width: width * 0.4,
          height: width * 0.4,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(0,150,255,0.15) 0%, rgba(0,0,0,0) 70%)",
          filter: "blur(40px)",
        }} />
        
        <div style={{
          position: "absolute",
          top: height * 0.6,
          left: width * 0.6,
          width: width * 0.6,
          height: width * 0.6,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(100,0,255,0.1) 0%, rgba(0,0,0,0) 70%)",
          filter: "blur(50px)",
        }} />

        <div style={{
          position: "absolute",
          top: height * 0.3,
          left: width * 0.3,
          width: width * 0.3,
          height: width * 0.3,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255,50,150,0.08) 0%, rgba(0,0,0,0) 70%)",
          filter: "blur(30px)",
        }} />

        {/* 网格线效果 */}
        <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          backgroundImage: `
            linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
          opacity: 0.4,
        }} />
      </div>

      <div style={{ 
        display: "flex", 
        width: "100%", 
        height: "100%",
        color: textColor,
        fontFamily: "Arial, sans-serif",
        position: "relative",
        zIndex: 2
      }}>
        {/* 左侧硬件数据展示区域 - 改为40%宽度，优化垂直布局和内容分布 */}
        <div style={{ 
          width: "60%", 
          padding: "30px 20px 30px 40px", 
          transform: `translateX(${leftContentX}px)`,
          display: "flex",
          flexDirection: "column",
          overflowY: "auto"
        }}>
          {/* 手机名称 */}
          <div style={{ 
            fontSize: 48, 
            fontWeight: "bold", 
            marginBottom: 30,
            textShadow: "2px 2px 4px rgba(0,0,0,0.5)"
          }}>
            {phoneName}
          </div>
          
          {/* 上部参数区域 - 分为两列布局 */}
          <div style={{ 
            display: "flex",
            flexWrap: "wrap", 
            gap: "20px",
            marginBottom: 20
          }}>
            {/* 处理器 */}
            <div style={{ 
              width: "calc(50% - 10px)", 
              backgroundColor: "rgba(255,255,255,0.08)",
              borderRadius: 12,
              padding: 15,
              backdropFilter: "blur(5px)",
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)"
            }}>
              <div style={{ fontSize: 28, fontWeight: "bold", marginBottom: 8 }}>处理器</div>
              <div style={{ fontSize: 22, display: "flex", alignItems: "center" }}>
                <div style={{ 
                  width: 40, 
                  height: 40, 
                  backgroundColor: "#ff0000", 
                  borderRadius: 8,
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  marginRight: 12
                }}>
                  <span style={{ color: "#ffffff", fontSize: 18 }}>S</span>
                </div>
                {processor}
              </div>
            </div>

            {/* 屏幕参数 */}
            <div style={{ 
              width: "calc(50% - 10px)", 
              backgroundColor: "rgba(255,255,255,0.08)",
              borderRadius: 12,
              padding: 15,
              backdropFilter: "blur(5px)",
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)"
            }}>
              <div style={{ fontSize: 28, fontWeight: "bold", marginBottom: 8 }}>屏幕参数</div>
              <div style={{ fontSize: 22 }}>{screenSize}</div>
              <div style={{ fontSize: 22 }}>{screenResolution}</div>
              <div style={{ fontSize: 22, fontWeight: "bold" }}>{screenRefreshRate}</div>
            </div>
            
            {/* 重量和厚度 */}
            <div style={{ 
              width: "calc(50% - 10px)", 
              backgroundColor: "rgba(255,255,255,0.08)",
              borderRadius: 12,
              padding: 15,
              backdropFilter: "blur(5px)",
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)"
            }}>
              <div style={{ fontSize: 28, fontWeight: "bold", marginBottom: 8 }}>尺寸</div>
              <div style={{ fontSize: 22, marginBottom: 4 }}>重量: {weight}</div>
              <div style={{ fontSize: 22 }}>厚度: {thickness}</div>
            </div>
            
            {/* 机身材质 */}
            <div style={{ 
              width: "calc(50% - 10px)", 
              backgroundColor: "rgba(255,255,255,0.08)",
              borderRadius: 12,
              padding: 15,
              backdropFilter: "blur(5px)",
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)"
            }}>
              <div style={{ fontSize: 28, fontWeight: "bold", marginBottom: 8 }}>机身材质</div>
              <div style={{ fontSize: 22 }}>{bodyMaterial}</div>
              <div style={{ fontSize: 22 }}>{frameType}</div>
            </div>
          </div>
          
          {/* 影像模组 - 占据更多空间，突出重要性 */}
          <div style={{ 
            marginBottom: 20,
            backgroundColor: "rgba(255,255,255,0.08)",
            borderRadius: 12,
            padding: 15,
            backdropFilter: "blur(5px)",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)"
          }}>
            <div style={{ fontSize: 28, fontWeight: "bold", marginBottom: 8 }}>影像模组</div>
            <div style={{ 
              display: "flex", 
              flexWrap: "wrap",
              fontSize: 18,
              gap: "10px"
            }}>
              {mainCamera}
            </div>
          </div>
          
          {/* 电池参数 */}
          <div style={{ 
            marginBottom: 20,
            backgroundColor: "rgba(255,255,255,0.08)",
            borderRadius: 12,
            padding: 15,
            backdropFilter: "blur(5px)",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)"
          }}>
            <div style={{ fontSize: 28, fontWeight: "bold", marginBottom: 8 }}>电池参数</div>
            <div style={{ fontSize: 24, marginBottom: 5 }}>{batteryCapacity}</div>
            <div style={{ fontSize: 20, display: "flex", alignItems: "center", marginBottom: 5 }}>
              <span style={{ marginRight: 10 }}>⚡</span> {wiredChargingPower}
            </div>
            <div style={{ fontSize: 20, display: "flex", alignItems: "center" }}>
              <span style={{ marginRight: 10 }}>🔄</span> {wirelessChargingPower}
            </div>
          </div>
          
          {/* 价格 */}
          <div style={{ 
            backgroundColor: "rgba(255,255,255,0.08)",
            borderRadius: 12,
            padding: 15,
            backdropFilter: "blur(5px)",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)"
          }}>
            <div style={{ fontSize: 28, fontWeight: "bold", marginBottom: 10 }}>参考价（价格来源JD）</div>
            <div style={{ 
              display: "flex", 
              flexWrap: "wrap", 
              gap: "10px",
              justifyContent: "space-between" 
            }}>
              <div style={{ 
                fontSize: 20, 
                padding: "8px 12px", 
                backgroundColor: "rgba(255,255,255,0.1)", 
                borderRadius: 8,
                flex: "1 1 auto",
                minWidth: "calc(33% - 10px)",
                textAlign: "center"
              }}>
                12+256GB<br />
                <span style={{ fontSize: 26, fontWeight: "bold" }}>{price12_256}</span>
              </div>
              {price16_512 && (
                <div style={{ 
                  fontSize: 20, 
                  padding: "8px 12px", 
                  backgroundColor: "rgba(255,255,255,0.1)", 
                  borderRadius: 8,
                  flex: "1 1 auto",
                  minWidth: "calc(33% - 10px)",
                  textAlign: "center"
                }}>
                  16+512GB<br />
                  <span style={{ fontSize: 26, fontWeight: "bold" }}>{price16_512}</span>
                </div>
              )}
              {price16_1TB && (
                <div style={{ 
                  fontSize: 20, 
                  padding: "8px 12px", 
                  backgroundColor: "rgba(255,255,255,0.1)", 
                  borderRadius: 8,
                  flex: "1 1 auto",
                  minWidth: "calc(33% - 10px)",
                  textAlign: "center"
                }}>
                  16+1TB<br />
                  <span style={{ fontSize: 26, fontWeight: "bold" }}>{price16_1TB}</span>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* 右侧手机图片展示 - 改为60%宽度，增加背景效果 */}
        <div style={{ 
          width: "60%", 
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          transform: `translateX(${rightContentX}px)`,
          position: "relative"
        }}>
          <div style={{
            position: "absolute",
            width: "50%",
            height: "70%",
            background: "radial-gradient(circle, rgba(255,255,255,0.15) 0%, rgba(0,0,0,0) 70%)",
            borderRadius: "50%",
            zIndex: 1,
            filter: "blur(20px)"
          }} />
          <Img 
            src={phoneImage} 
            alt={phoneName} 
            style={{ 
              maxHeight: "85%", 
              maxWidth: "85%", 
              objectFit: "contain",
              filter: "drop-shadow(0px 0px 30px rgba(255,255,255,0.2))",
              position: "relative",
              zIndex: 2
            }}
          />
          
          {/* 光晕效果 - 固定大小不再缩放 */}
          <div style={{
            position: "absolute",
            bottom: "15%",
            width: "80%",
            height: "20%",
            background: "radial-gradient(ellipse at center, rgba(255,255,255,0.1) 0%, rgba(0,0,0,0) 70%)",
            borderRadius: "50%",
            filter: "blur(15px)",
            zIndex: 1
          }} />
        </div>
      </div>
    </AbsoluteFill>
  );
}; 