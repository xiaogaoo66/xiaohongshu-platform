import { AbsoluteFill, OffthreadVideo, staticFile, useCurrentFrame, interpolate, useVideoConfig, Audio } from "remotion";

interface VideoBackgroundCompositionProps {
  title: string;
  subtitle?: string;
  fadeInDuration: number;
  startTitleColor: string;
  speaker_audio: string;
}

export const VideoBackgroundComposition: React.FC<VideoBackgroundCompositionProps> = ({
  title = "Hello World",
  subtitle = "",
  speaker_audio = "",   
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // 计算文字透明度 - 从完全透明逐渐显示
  const textOpacity = interpolate(
    frame,
    [0, 2 * fps], // 2秒内完成渐变
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }
  );

  // 文字在淡入时稍微放大
  const textScale = interpolate(
    frame,
    [0, 2 * fps], // 2秒内完成缩放
    [0.8, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }
  );

  return (
    <AbsoluteFill>
      {/* 视频背景 */}
      <OffthreadVideo
        src={ staticFile("/background-video.mp4")}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
        muted // 添加静音属性以避免某些浏览器的自动播放限制
      />
      <Audio src={speaker_audio ? (speaker_audio.startsWith('http') ? speaker_audio : staticFile(speaker_audio)) : staticFile(speaker_audio)} volume={1} />
      
      {/* 文字覆盖层 */}
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
        }}
      >
        {/* 主标题 */}
        <div
          style={{
            fontSize: 80,
            fontWeight: "bold",
            color: "#ffffff",
            textAlign: "center",
            opacity: textOpacity,
            transform: `scale(${textScale})`,
            marginBottom: subtitle ? 40 : 0,
            textShadow: "3px 3px 6px rgba(0,0,0,0.8)",
            maxWidth: "90%",
            lineHeight: 1.2,
          }}
        >
          {title}
        </div>
        
        {/* 副标题 */}
        {subtitle && (
          <div
            style={{
              fontSize: 40,
              color: "#ffffff",
              textAlign: "center",
              opacity: textOpacity,
              transform: `scale(${textScale})`,
              textShadow: "2px 2px 4px rgba(0,0,0,0.8)",
              maxWidth: "80%",
              lineHeight: 1.3,
            }}
          >
            {subtitle}
          </div>
        )}
      </AbsoluteFill>
      
      {/* 可选的渐变蒙版，让文字更易读 */}
      <AbsoluteFill
        style={{
          background: "linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.1), rgba(0,0,0,0.3))",
          opacity: 0.6,
        }}
      />
    </AbsoluteFill>
  );
}; 