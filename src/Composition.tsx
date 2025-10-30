import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";

interface MyCompositionProps {
  title: string;
  subtitle?: string;
  titleColor: string;
  backgroundColor: string;
  duration?: number;
}

export const MyComposition: React.FC<MyCompositionProps> = ({
  title = "Hello Remotion",
  subtitle = "程序化生成视频",
  titleColor = "#ffffff",
  backgroundColor = "#000000",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // 弹簧动画 - 标题从左侧滑入
  const titleX = spring({
    frame,
    fps,
    config: {
      damping: 20,
      stiffness: 100,
    },
    from: -500,
    to: 0,
  });

  // 字幕从右侧滑入，延迟0.5秒
  const subtitleX = spring({
    frame: frame - fps * 0.5, // 延迟0.5秒
    fps,
    config: {
      damping: 25,
      stiffness: 120,
    },
    from: 500,
    to: 0,
  });

  // 透明度渐变
  const opacity = interpolate(frame, [0, 30], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor }}>
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          opacity,
        }}
      >
        {/* 主标题 */}
        <div
          style={{
            fontSize: 80,
            fontWeight: "bold",
            color: titleColor,
            textAlign: "center",
            transform: `translateX(${titleX}px)`,
            marginBottom: 40,
            textShadow: "2px 2px 4px rgba(0,0,0,0.5)",
          }}
        >
          {title}
        </div>
        
        {/* 副标题 */}
        {subtitle && (
          <div
            style={{
              fontSize: 40,
              color: titleColor,
              textAlign: "center",
              transform: `translateX(${subtitleX}px)`,
              opacity: frame > fps * 0.5 ? 1 : 0,
            }}
          >
            {subtitle}
          </div>
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
