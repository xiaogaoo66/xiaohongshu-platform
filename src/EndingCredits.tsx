import { AbsoluteFill, OffthreadVideo, staticFile, useCurrentFrame, interpolate, useVideoConfig, Audio, spring, Img } from "remotion";

interface EndingCreditsProps {
  avatarUrl: string;
  name: string;
  role?: string;
  speaker_audio?: string;
  backgroundColor?: string;
  textColor?: string;
}

export const EndingCredits: React.FC<EndingCreditsProps> = ({
  avatarUrl,
  name,
  role = "",
  speaker_audio = "",
  backgroundColor = "rgba(0, 0, 0, 0.5)",
  textColor = "#ffffff",
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // 头像动画参数
  const avatarScale = spring({
    frame: frame - 15,
    fps,
    config: {
      mass: 1,
      stiffness: 100,
      damping: 15,
    },
    from: 0,
    to: 1,
  });

  // 名称淡入
  const nameOpacity = interpolate(
    frame,
    [45, 60], // 1.5秒后开始显示名称
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }
  );

  // 角色淡入
  const roleOpacity = interpolate(
    frame,
    [60, 75], // 2秒后开始显示角色
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }
  );

  // 淡出动画
  const fadeOut = interpolate(
    frame,
    [durationInFrames - 30, durationInFrames], // 最后1秒淡出
    [1, 0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }
  );

  return (
    <AbsoluteFill>
      {/* 视频背景 */}
      <OffthreadVideo
        src={staticFile("/background-video.mp4")}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
        muted
      />
      
      {/* 音频 */}
      {speaker_audio && (
        <Audio 
          src={speaker_audio.startsWith('http') ? speaker_audio : staticFile(speaker_audio)} 
          volume={1} 
        />
      )}
      
      {/* 半透明背景遮罩 */}
      <AbsoluteFill
        style={{
          backgroundColor,
          opacity: 0.7 * fadeOut,
        }}
      />
      
      {/* 内容容器 */}
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          opacity: fadeOut,
        }}
      >
        {/* 头像容器 */}
        <div
          style={{
            width: 250,
            height: 250,
            borderRadius: "50%",
            overflow: "hidden",
            border: `5px solid ${textColor}`,
            transform: `scale(${avatarScale})`,
            boxShadow: "0 10px 30px rgba(0, 0, 0, 0.3)",
            marginBottom: 40,
          }}
        >
          <Img
            src={avatarUrl.startsWith('http') ? avatarUrl : staticFile(avatarUrl)}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
            alt={name}
          />
        </div>
        
        {/* 名称 */}
        <div
          style={{
            fontSize: 80,
            fontWeight: "bold",
            color: textColor,
            textAlign: "center",
            opacity: nameOpacity,
            textShadow: "2px 2px 8px rgba(0, 0, 0, 0.5)",
            marginBottom: role ? 20 : 0,
          }}
        >
          {name}
        </div>
        
        {/* 角色/职位 */}
        {role && (
          <div
            style={{
              fontSize: 40,
              color: textColor,
              textAlign: "center",
              opacity: roleOpacity,
              textShadow: "1px 1px 4px rgba(0, 0, 0, 0.5)",
            }}
          >
            {role}
          </div>
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
}; 