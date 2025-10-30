import React, { useEffect, useState, useMemo } from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, useVideoConfig, Img, Audio, staticFile, Sequence, OffthreadVideo } from "remotion";
import {getAudioData, getVideoMetadata} from '@remotion/media-utils';

// 运镜效果类型枚举
type CameraEffect = 'zoom-in' | 'zoom-out' | 'move-up' | 'move-down' | 'shake' | 'static';

// 添加文件类型枚举
type MediaType = 'image' | 'video';

// 工具函数：根据URL判断是图片还是视频
const getMediaType = (url: string): MediaType => {
  const lowerUrl = url.toLowerCase();
  
  // 定义图片和视频的扩展名和标识符
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'];
  const videoExtensions = ['mp4', 'mov', 'avi', 'mkv', 'webm', 'm4v', 'flv', 'wmv'];
  
  // 1. 检查URL中是否包含视频格式标识（不限于文件名末尾）
  for (const ext of videoExtensions) {
    if (lowerUrl.includes(`.${ext}`)) {
      return 'video';
    }
  }
  
  // 2. 检查URL中是否包含图片格式标识
  for (const ext of imageExtensions) {
    if (lowerUrl.includes(`.${ext}`)) {
      return 'image';
    }
  }
  
  // 3. 检查查询参数中的format参数
  try {
    const urlObj = new URL(url);
    const format = urlObj.searchParams.get('format');
    if (format) {
      const formatExt = format.replace('.', '').toLowerCase();
      if (videoExtensions.includes(formatExt)) {
        return 'video';
      }
      if (imageExtensions.includes(formatExt)) {
        return 'image';
      }
    }
  } catch {
    // URL解析失败，继续其他判断
  }
  
  // 4. 根据URL路径和关键词进行推断
  if (lowerUrl.includes('video') || 
      lowerUrl.includes('movie') || 
      lowerUrl.includes('film') ||
      lowerUrl.includes('media') && lowerUrl.includes('mp4')) {
    return 'video';
  }
  
  if (lowerUrl.includes('image') || 
      lowerUrl.includes('img') || 
      lowerUrl.includes('photo') ||
      lowerUrl.includes('picture') ||
      lowerUrl.includes('jpeg') ||
      lowerUrl.includes('png')) {
    return 'image';
  }
  
  // 5. 检查特定的CDN或服务域名模式
  if (lowerUrl.includes('dreamina') || 
      lowerUrl.includes('byteimg') ||
      lowerUrl.includes('aigc_resize')) {
    return 'image';
  }
  
  if (lowerUrl.includes('doubao-seedance') ||
      lowerUrl.includes('content-generation') ||
      lowerUrl.includes('tos-cn-beijing') && lowerUrl.includes('mp4')) {
    return 'video';
  }
  
  // 默认返回图片（保守策略）
  return 'image';
};

interface NovelShowcaseProps {
  // 运镜效果数组 - 每张背景图片对应一个运镜效果
  cameraEffects?: CameraEffect[];
  
  // 音频数组 - mp3 URL数组（可选）
  speaker_audio?: string[];
  
  // 字幕数组
  subtitles?: string[];
  
  // 背景图片数组 - 1张图片对应1个运镜效果，每个运镜效果对应4个字幕和音频
  backgroundImages?: string[];
  
  // 每个音频的时长（秒）- 如果不提供，默认每个5秒
  audioDurations?: number[];
  
  // 样式配置
  backgroundColor?: string;
  subtitleColor?: string;
  subtitleBackgroundColor?: string;
  subtitleFontSize?: number;
}

export const NovelShowcase: React.FC<NovelShowcaseProps> = ({
  cameraEffects = [],
  speaker_audio = [],
  subtitles = [],
  backgroundImages = [],
  audioDurations = [],
  backgroundColor = "#000000",
  subtitleColor = "#ffffff",
  subtitleBackgroundColor = "transparent",
  subtitleFontSize = 32,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  // 使用 state 存储音频数据
  const [audioDataArray, setAudioDataArray] = useState<(number | null)[]>([]);
  
  // 存储每个媒体项的元数据
  const [mediaMetadata, setMediaMetadata] = useState<{ [key: string]: number }>({});
  
  // 使用 useEffect 异步获取音频数据
  useEffect(() => {
    const loadAudioData = async () => {
      const dataPromises = speaker_audio.map(async (audio: string) => {
        try {
          const path = audio.startsWith('http') ? audio : staticFile(audio);
          const audioData = await getAudioData(path);
          return audioData.durationInSeconds;
        } catch (error) {
          console.warn(`Failed to load audio data for ${audio}:`, error);
          return null;
        }
      });
      
      const durations = await Promise.all(dataPromises);
      setAudioDataArray(durations);
    };
    
    if (speaker_audio.length > 0) {
      loadAudioData();
    }
  }, [speaker_audio]);
  
  // 异步获取媒体元数据
  useEffect(() => {
    if (backgroundImages && backgroundImages.length > 0) {
      const loadMediaMetadata = async () => {
        const metadata: { [key: string]: number } = {};
        
        for (const mediaUrl of backgroundImages) {
          try {
            const mediaType = getMediaType(mediaUrl);
            const path = mediaUrl.startsWith('http') ? mediaUrl : staticFile(mediaUrl);
            
            if (mediaType === 'video') {
              const videoData = await getVideoMetadata(path);
              metadata[mediaUrl] = videoData.durationInSeconds;
            } else {
              // 图片默认5秒
              metadata[mediaUrl] = 5;
            }
          } catch (error) {
            console.warn(`Failed to load media metadata for ${mediaUrl}:`, error);
            metadata[mediaUrl] = getMediaType(mediaUrl) === 'video' ? 3 : 5; // 视频默认3秒，图片5秒
          }
        }
        
        setMediaMetadata(metadata);
      };
      loadMediaMetadata();
    }
  }, [backgroundImages]);
  
  // 计算时长数组
  const segmentDurations = useMemo(() => {
    // 如果有音频，优先使用音频时长
    if (speaker_audio.length > 0) {
      return speaker_audio.map((_, index) => {
        if (audioDurations && audioDurations.length > index) {
          return audioDurations[index];
        }
        return audioDataArray[index] || 3;
      });
    }
    
    // 如果没有音频，使用背景媒体时长
    if (backgroundImages.length > 0) {
      return backgroundImages.map((imageUrl) => {
        return mediaMetadata[imageUrl] || (getMediaType(imageUrl) === 'video' ? 3 : 5);
      });
    }
    
    // 默认情况
    return [5];
  }, [speaker_audio, backgroundImages, audioDurations, audioDataArray, mediaMetadata]);

  // 计算每个片段的累计开始帧
  const segmentStartFrames = segmentDurations.reduce((acc, duration, index) => {
    if (index === 0) {
      acc.push(0);
    } else {
      acc.push(acc[index - 1] + segmentDurations[index - 1] * fps);
    }
    return acc;
  }, [] as number[]);
  
  // 计算每个运镜效果的信息
  const cameraEffectInfos = useMemo(() => {
    if (speaker_audio.length > 0) {
      // 有音频时：每个运镜效果对应4个音频片段
      return cameraEffects.map((effect, effectIndex) => {
        const audioStartIndex = effectIndex * 4;
        const audioEndIndex = Math.min(audioStartIndex + 4, segmentDurations.length);
        
        // 计算这个运镜效果对应的音频片段
        const audioSegments = segmentDurations.slice(audioStartIndex, audioEndIndex);
        
        // 计算运镜效果的开始帧
        const startFrame = audioStartIndex < segmentStartFrames.length ? segmentStartFrames[audioStartIndex] : 0;
        
        // 计算运镜效果的时长（对应的所有音频片段的总时长）
        const duration = audioSegments.reduce((sum, segmentDuration) => sum + segmentDuration, 0);
        const durationInFrames = duration * fps;
        
        return {
          effect,
          startFrame,
          duration, // 秒
          durationInFrames,
          audioStartIndex,
          audioEndIndex,
          audioSegments,
        };
      });
    } else {
      // 没有音频时：每个运镜效果对应一个背景媒体
      return cameraEffects.map((effect, effectIndex) => {
        const mediaIndex = effectIndex % backgroundImages.length;
        const duration = segmentDurations[mediaIndex] || 5;
        const startFrame = effectIndex < segmentStartFrames.length ? segmentStartFrames[effectIndex] : 0;
        const durationInFrames = duration * fps;
        
        return {
          effect,
          startFrame,
          duration,
          durationInFrames,
          audioStartIndex: effectIndex,
          audioEndIndex: effectIndex + 1,
          audioSegments: [duration],
        };
      });
    }
  }, [cameraEffects, segmentDurations, segmentStartFrames, speaker_audio.length, backgroundImages.length, fps]);
  
  // 找到当前帧对应的片段索引
  const getCurrentSegmentIndex = () => {
    for (let i = 0; i < segmentDurations.length; i++) {
      const segmentStartFrame = segmentStartFrames[i];
      const segmentEndFrame = segmentStartFrame + segmentDurations[i] * fps;
      
      if (frame >= segmentStartFrame && frame < segmentEndFrame) {
        return i;
      }
    }
    return Math.min(segmentDurations.length - 1, Math.max(0, segmentDurations.length - 1));
  };
  
  // 找到当前帧对应的运镜效果索引
  const getCurrentCameraEffectIndex = () => {
    for (let i = 0; i < cameraEffectInfos.length; i++) {
      const effectInfo = cameraEffectInfos[i];
      const effectEndFrame = effectInfo.startFrame + effectInfo.durationInFrames;
      
      if (frame >= effectInfo.startFrame && frame < effectEndFrame) {
        return i;
      }
    }
    return Math.min(cameraEffectInfos.length - 1, Math.max(0, cameraEffectInfos.length - 1));
  };
  
  const currentSegmentIndex = getCurrentSegmentIndex();
  const currentCameraEffectIndex = getCurrentCameraEffectIndex();
  
  // 获取当前运镜效果信息
  const currentCameraEffectInfo = cameraEffectInfos[currentCameraEffectIndex] || {
    effect: 'static' as CameraEffect,
    startFrame: 0,
    duration: 5,
    durationInFrames: 5 * fps,
    audioStartIndex: 0,
    audioEndIndex: 1,
    audioSegments: [5],
  };
  
  // 计算在当前运镜效果中的帧位置和进度
  const frameInCurrentEffect = frame - currentCameraEffectInfo.startFrame;
  const effectProgress = frameInCurrentEffect / currentCameraEffectInfo.durationInFrames;
  
  // 计算当前片段在其时长内的帧位置
  const currentSegmentStartFrame = segmentStartFrames[currentSegmentIndex] || 0;
  const frameInCurrentSegment = frame - currentSegmentStartFrame;
  const currentSegmentDurationInFrames = segmentDurations[currentSegmentIndex] * fps;
  
  // 计算背景图片索引
  const backgroundImageIndex = speaker_audio.length > 0 ? currentCameraEffectIndex : currentSegmentIndex;
  const currentBackgroundImage = backgroundImages[backgroundImageIndex % backgroundImages.length] || backgroundImages[0] || '';
  
  // 运镜效果处理函数
  const getCameraTransform = (effect: CameraEffect, progress: number) => {
    // 确保progress在0-1之间
    const clampedProgress = Math.max(0, Math.min(1, progress));
    
    switch (effect) {
      case 'zoom-in': {
        const scale = interpolate(clampedProgress, [0, 1], [1, 1.2], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        return {
          transform: `scale(${scale})`,
          transformOrigin: 'center center'
        };
      }
        
      case 'zoom-out': {
        const scale = interpolate(clampedProgress, [0, 1], [1.2, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        return {
          transform: `scale(${scale})`,
          transformOrigin: 'center center'
        };
      }
        
      case 'move-up': {
        // 对于1:1图片在16:9视频中，从最下面移动到最上面
        const scale = 1.8; // 确保图片覆盖整个区域且有足够移动空间
        const translateY = interpolate(clampedProgress, [0, 1], [200, -200], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        return {
          transform: `scale(${scale}) translateY(${translateY}px)`,
          transformOrigin: 'center center'
        };
      }
        
      case 'move-down': {
        // 对于1:1图片在16:9视频中，从最上面移动到最下面
        const scale = 1.8; // 确保图片覆盖整个区域且有足够移动空间
        const translateY = interpolate(clampedProgress, [0, 1], [-200, 200], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        return {
          transform: `scale(${scale}) translateY(${translateY}px)`,
          transformOrigin: 'center center'
        };
      }
        
      case 'shake': {
        const shakeX = Math.sin(clampedProgress * 50) * 3;
        const shakeY = Math.cos(clampedProgress * 50) * 3;
        return {
          transform: `translate(${shakeX}px, ${shakeY}px)`,
        };
      }
        
      case 'static':
      default:
        return {
          transform: 'none',
        };
    }
  };
  
  // 获取当前运镜效果样式
  const cameraStyle = getCameraTransform(currentCameraEffectInfo.effect, effectProgress);
  
  // 使用 useMemo 缓存样式对象，避免重复创建
  const backgroundContainerStyle = useMemo(() => ({
    position: 'absolute' as const,
    width: '100%',
    height: '100%',
  }), []);
  
  const mediaContentStyle = useMemo(() => ({
    width: '100%',
    height: '100%',
    objectFit: 'contain' as const,
    objectPosition: 'center' as const,
  }), []);
  
  // 字幕透明度动画
  const subtitleOpacity = interpolate(frameInCurrentSegment, [0, 15, currentSegmentDurationInFrames - 15, currentSegmentDurationInFrames], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // 渲染背景媒体
  const renderBackgroundMedia = () => {
    if (!currentBackgroundImage) return null;
    
    const mediaType = getMediaType(currentBackgroundImage);
    const mediaDuration = mediaMetadata[currentBackgroundImage] || (mediaType === 'video' ? 3 : 5);
    
    if (mediaType === 'video' && mediaDuration > 0) {
      // 视频
      return (
        <Sequence
          key={`video-${backgroundImageIndex}-${currentSegmentIndex}`}
          from={currentSegmentStartFrame}
          durationInFrames={currentSegmentDurationInFrames}
        >
          <div style={{
            ...backgroundContainerStyle,
            ...cameraStyle,
          }}>
            <OffthreadVideo
              src={currentBackgroundImage.startsWith('http') ? currentBackgroundImage : staticFile(currentBackgroundImage)}
              muted={true}
              style={mediaContentStyle}
            />
          </div>
        </Sequence>
      );
    } else {
      // 图片
      return (
        <Sequence
          key={`image-${backgroundImageIndex}-${currentSegmentIndex}`}
          from={currentSegmentStartFrame}
          durationInFrames={currentSegmentDurationInFrames}
        >
          <div style={{
            ...backgroundContainerStyle,
            ...cameraStyle,
          }}>
            <Img
              src={currentBackgroundImage.startsWith('http') ? currentBackgroundImage : staticFile(currentBackgroundImage)}
              alt="背景图片"
              style={mediaContentStyle}
            />
          </div>
        </Sequence>
      );
    }
  };

  return (
    <AbsoluteFill style={{ 
      background: backgroundColor,
      overflow: 'hidden' // 确保运镜效果不会超出边界
    }}>
      {/* 音频序列 - 只有当有音频时才渲染 */}
      {speaker_audio.length > 0 && speaker_audio.map((audioUrl: string, index: number) => (
        <Sequence
          key={`audio-${index}`}
          from={segmentStartFrames[index]}
          durationInFrames={segmentDurations[index] * fps}
        >
          <Audio
            src={audioUrl.startsWith('http') ? audioUrl : staticFile(audioUrl)}
            volume={1}
          />
        </Sequence>
      ))}
      
      {/* 背景媒体 */}
      {renderBackgroundMedia()}
      
      {/* 字幕显示 */}
      {subtitles[currentSegmentIndex] && (
        <div style={{
          position: 'absolute',
          bottom: '15%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '80%',
          textAlign: 'center',
          opacity: subtitleOpacity,
          zIndex: 10,
        }}>
          <div style={{
            display: 'inline-block',
            padding: '16px 24px',
            backgroundColor: subtitleBackgroundColor,
            borderRadius: '8px',
            fontSize: subtitleFontSize,
            color: subtitleColor,
            fontWeight: 'bold',
            lineHeight: '1.5',
            textShadow: `
              -2px -2px 0 #000,
              2px -2px 0 #000,
              -2px 2px 0 #000,
              2px 2px 0 #000,
              -2px 0 0 #000,
              2px 0 0 #000,
              0 -2px 0 #000,
              0 2px 0 #000,
              0 0 4px rgba(0,0,0,0.5)
            `,
            maxWidth: '100%',
            wordWrap: 'break-word',
          }}>
            {subtitles[currentSegmentIndex]}
          </div>
        </div>
      )}
      
      {/* 调试信息 (可选，生产环境可删除) */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{
          position: 'absolute',
          top: 20,
          left: 20,
          color: 'white',
          fontSize: 14,
          backgroundColor: 'rgba(0,0,0,0.7)',
          padding: '10px',
          borderRadius: '4px',
          zIndex: 100,
        }}>
          <div>当前帧: {frame}</div>
          <div>当前片段: {currentSegmentIndex + 1}/{segmentDurations.length}</div>
          <div>片段时长: {segmentDurations[currentSegmentIndex]}秒</div>
          <div>背景图片: {backgroundImageIndex + 1}/{backgroundImages.length}</div>
          <div>运镜效果: {currentCameraEffectInfo.effect} (第{currentCameraEffectIndex + 1}个)</div>
          <div>运镜效果时长: {currentCameraEffectInfo.duration.toFixed(1)}秒</div>
          <div>运镜进度: {(effectProgress * 100).toFixed(1)}%</div>
          <div>音频数量: {speaker_audio.length}</div>
          <div>背景媒体数量: {backgroundImages.length}</div>
        </div>
      )}
    </AbsoluteFill>
  );
};
