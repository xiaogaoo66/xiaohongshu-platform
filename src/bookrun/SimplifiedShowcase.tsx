import React, { useEffect, useState, useMemo } from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, useVideoConfig, Img, Audio, staticFile, Sequence, OffthreadVideo, delayRender, continueRender } from "remotion";
import {getAudioData, getVideoMetadata} from '@remotion/media-utils';

/**
 * 媒体闪烁和加载失败问题修复说明：
 * 1. 使用 delayRender/continueRender 确保所有图片和视频预加载完成后再开始渲染
 * 2. 为每个显示的图片添加隐藏的预加载 <Img> 标签
 * 3. 避免使用 backgroundImage CSS 属性，统一使用 <Img> 标签
 * 4. 简化图片加载逻辑，减少状态更新频率以避免频繁重新渲染
 * 5. 添加图片加载超时处理（3秒超时）
 * 6. 为 <Img> 组件添加 onError 和 placeholder 处理
 * 7. 批量更新图片加载状态，减少组件重新渲染次数
 * 8. 新增视频预加载机制，使用原生video元素预加载metadata，解决网络MP4闪烁问题
 * 9. 视频预加载超时设置为5秒，确保网络视频有足够时间加载
 * 10. 只有在图片和视频都预加载完成后才开始渲染背景媒体
 * 11. 参考文档：https://www.remotion.dev/docs/troubleshooting/background-image
 */

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

interface SimplifiedShowcaseProps {
  // 单个运镜效果
  cameraEffects?: string;
  
  // 音频数组 - mp3 URL数组（可选）
  speaker_audio?: string[];
  
  // 字幕数组
  subtitles?: string[];
  
  // 背景媒体数组 - 支持图片和视频混合
  backgroundImages?: string[];
  
  // 字幕样式
  font_style?: string;
}

export const SimplifiedShowcase: React.FC<SimplifiedShowcaseProps> = ({
  cameraEffects = "static",
  speaker_audio = [],
  subtitles = [],
  backgroundImages = [],
  font_style = "white-black-outline",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  // 使用 state 存储音频数据
  const [audioDataArray, setAudioDataArray] = useState<(number | null)[]>([]);
  
  // 存储每个媒体项的元数据
  const [mediaMetadata, setMediaMetadata] = useState<{ [key: string]: number }>({});
  
  // 媒体预加载状态
  const [imagesLoaded, setImagesLoaded] = useState<boolean>(false);
  const [videosLoaded, setVideosLoaded] = useState<boolean>(false);
  const [renderHandle, setRenderHandle] = useState<string | null>(null);
  const [imageLoadStatus, setImageLoadStatus] = useState<{ [key: string]: 'loading' | 'success' | 'failed' }>({});
  const [videoLoadStatus, setVideoLoadStatus] = useState<{ [key: string]: 'loading' | 'success' | 'failed' }>({});
  
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
  
  // 图片预加载 useEffect - 解决闪烁问题
  useEffect(() => {
    if (!backgroundImages || backgroundImages.length === 0) {
      setImagesLoaded(true);
      return;
    }

    // 获取所有图片URL
    const imageUrls = backgroundImages.filter(url => getMediaType(url) === 'image');
    
    if (imageUrls.length === 0) {
      setImagesLoaded(true);
      return;
    }

    // 简化状态初始化
    const initialStatus: { [key: string]: 'loading' | 'success' | 'failed' } = {};
    imageUrls.forEach(url => {
      initialStatus[url] = 'loading';
    });
    setImageLoadStatus(initialStatus);

    // 只在有图片需要加载时才延迟渲染
    const handle = delayRender('Loading background images');
    setRenderHandle(handle);

    const preloadImages = async () => {
      try {
        // 批量状态更新，减少重新渲染
        const statusUpdates: { [key: string]: 'loading' | 'success' | 'failed' } = {};
        
        const imagePromises = imageUrls.map((imageUrl) => {
          return new Promise<void>((resolve) => {
            const img = new Image();
            
            // 简化的加载逻辑
            const timeoutId = setTimeout(() => {
              console.warn(`Image loading timeout: ${imageUrl}`);
              statusUpdates[imageUrl] = 'failed';
              resolve(); // 超时也继续
            }, 3000); // 进一步减少到3秒超时
            
            img.onload = () => {
              clearTimeout(timeoutId);
              statusUpdates[imageUrl] = 'success';
              resolve();
            };
            
            img.onerror = () => {
              clearTimeout(timeoutId);
              console.warn(`Failed to preload image: ${imageUrl}`);
              statusUpdates[imageUrl] = 'failed';
              resolve(); // 失败也继续，避免阻塞
            };
            
            img.src = imageUrl.startsWith('http') ? imageUrl : staticFile(imageUrl);
          });
        });

        await Promise.all(imagePromises);
        
        // 批量更新状态，减少重新渲染
        setImageLoadStatus(prev => ({ ...prev, ...statusUpdates }));
        setImagesLoaded(true);
        continueRender(handle);
      } catch (error) {
        console.warn('Error preloading images:', error);
        setImagesLoaded(true);
        continueRender(handle);
      }
    };

    preloadImages();

    return () => {
      if (handle) {
        try {
          continueRender(handle);
        } catch {
          // Handle已经被continue了，忽略错误
        }
      }
    };
  }, [backgroundImages]);

  // 视频预加载 useEffect - 解决视频闪烁问题
  useEffect(() => {
    if (!backgroundImages || backgroundImages.length === 0) {
      setVideosLoaded(true);
      return;
    }

    // 获取所有视频URL
    const videoUrls = backgroundImages.filter(url => getMediaType(url) === 'video');
    
    if (videoUrls.length === 0) {
      setVideosLoaded(true);
      return;
    }

    // 初始化视频加载状态
    const initialStatus: { [key: string]: 'loading' | 'success' | 'failed' } = {};
    videoUrls.forEach(url => {
      initialStatus[url] = 'loading';
    });
    setVideoLoadStatus(initialStatus);

    // 延迟渲染直到视频预加载完成
    const handle = delayRender('Loading background videos');
    setRenderHandle(handle);

    const preloadVideos = async () => {
      const statusUpdates: { [key: string]: 'loading' | 'success' | 'failed' } = {};
      
      const videoPromises = videoUrls.map((url) => {
        return new Promise<void>((resolve) => {
          const video = document.createElement('video');
          video.crossOrigin = 'anonymous';
          video.preload = 'metadata';
          
          const timeout = setTimeout(() => {
            statusUpdates[url] = 'failed';
            console.warn(`Video preload timeout: ${url}`);
            resolve();
          }, 5000); // 5秒超时
          
          video.onloadedmetadata = () => {
            clearTimeout(timeout);
            statusUpdates[url] = 'success';
            console.log(`Video preloaded successfully: ${url}`);
            resolve();
          };
          
          video.onerror = () => {
            clearTimeout(timeout);
            statusUpdates[url] = 'failed';
            console.warn(`Video preload failed: ${url}`);
            resolve();
          };
          
          video.src = url;
        });
      });
      
      try {
        await Promise.all(videoPromises);
        setVideoLoadStatus(statusUpdates);
        setVideosLoaded(true);
        continueRender(handle);
      } catch (error) {
        console.error('Video preloading error:', error);
        setVideoLoadStatus(statusUpdates);
        setVideosLoaded(true);
        continueRender(handle);
      }
    };

    preloadVideos();

    return () => {
      if (handle) {
        try {
          continueRender(handle);
        } catch {
          // Handle已经被continue了，忽略错误
        }
      }
    };
  }, [backgroundImages]);

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
  const audioDurations = useMemo(() => {
    // 如果有音频，优先使用音频时长
    if (speaker_audio.length > 0) {
      return speaker_audio.map((_, index) => {
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
  }, [speaker_audio, backgroundImages, audioDataArray, mediaMetadata]);

  // 计算每个音频片段的累计开始帧
  const audioStartFrames = audioDurations.reduce((acc, duration, index) => {
    if (index === 0) {
      acc.push(0);
    } else {
      acc.push(acc[index - 1] + audioDurations[index - 1] * fps);
    }
    return acc;
  }, [] as number[]);
  
  // 总时长（所有音频的总和）
  const totalDuration = audioDurations.reduce((sum, duration) => sum + duration, 0);
  const totalDurationInFrames = totalDuration * fps;
  
  // 找到当前帧对应的音频片段索引
  const getCurrentAudioSegmentIndex = () => {
    for (let i = 0; i < audioDurations.length; i++) {
      const segmentStartFrame = audioStartFrames[i];
      const segmentEndFrame = segmentStartFrame + audioDurations[i] * fps;
      
      if (frame >= segmentStartFrame && frame < segmentEndFrame) {
        return i;
      }
    }
    return Math.min(audioDurations.length - 1, Math.max(0, audioDurations.length - 1));
  };
  
  const currentAudioSegmentIndex = getCurrentAudioSegmentIndex();
  
  // 计算整体运镜效果进度（基于总时长）
  const overallProgress = Math.max(0, Math.min(1, frame / totalDurationInFrames));
  
  // 计算当前音频片段在其时长内的帧位置
  const currentAudioStartFrame = audioStartFrames[currentAudioSegmentIndex] || 0;
  const frameInCurrentAudio = frame - currentAudioStartFrame;
  const currentAudioDurationInFrames = audioDurations[currentAudioSegmentIndex] * fps;
  
  // 使用 useMemo 缓存当前媒体信息，减少重复计算
  const currentMedia = useMemo(() => {
    if (!backgroundImages || backgroundImages.length === 0) return null;
    
    // 如果只有一个媒体，一直显示它
    if (backgroundImages.length === 1) {
      return {
        url: backgroundImages[0],
        type: getMediaType(backgroundImages[0]),
        duration: mediaMetadata[backgroundImages[0]] || 0,
        index: 0
      };
    }
    
    // 多个媒体时，根据音频片段索引循环显示
    const mediaIndex = currentAudioSegmentIndex % backgroundImages.length;
    const mediaUrl = backgroundImages[mediaIndex];
    
    return {
      url: mediaUrl,
      type: getMediaType(mediaUrl),
      duration: mediaMetadata[mediaUrl] || 0,
      index: mediaIndex
    };
  }, [backgroundImages, currentAudioSegmentIndex, mediaMetadata]);
  
  // 将字符串运镜效果转换为枚举类型
  const getCameraEffectType = (effectStr: string): CameraEffect => {
    switch (effectStr.toLowerCase()) {
      case 'zoom-in':
        return 'zoom-in';
      case 'zoom-out':
        return 'zoom-out';
      case 'move-up':
        return 'move-up';
      case 'move-down':
        return 'move-down';
      case 'shake':
        return 'shake';
      case 'static':
      default:
        return 'static';
    }
  };
  
  const currentCameraEffect = getCameraEffectType(cameraEffects);
  
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
        const scale = 1.8;
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
        const scale = 1.8;
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
  
  // 字体样式映射函数
  const getFontStyleConfig = (styleStr: string) => {
    switch (styleStr.toLowerCase()) {
      case 'white-black-outline':
        return {
          color: '#ffffff',
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
        };
      case 'white-yellow-outline':
        return {
          color: '#ffffff',
          textShadow: `
            -2px -2px 0 #FFD700,
            2px -2px 0 #FFD700,
            -2px 2px 0 #FFD700,
            2px 2px 0 #FFD700,
            -2px 0 0 #FFD700,
            2px 0 0 #FFD700,
            0 -2px 0 #FFD700,
            0 2px 0 #FFD700,
            0 0 4px rgba(255,215,0,0.5)
          `,
        };
      case 'black-white-outline':
        return {
          color: '#000000',
          textShadow: `
            -2px -2px 0 #fff,
            2px -2px 0 #fff,
            -2px 2px 0 #fff,
            2px 2px 0 #fff,
            -2px 0 0 #fff,
            2px 0 0 #fff,
            0 -2px 0 #fff,
            0 2px 0 #fff,
            0 0 4px rgba(255,255,255,0.5)
          `,
        };
      case 'yellow-black-outline':
        return {
          color: '#FFD700',
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
        };
      case 'red-white-outline':
        return {
          color: '#FF0000',
          textShadow: `
            -2px -2px 0 #fff,
            2px -2px 0 #fff,
            -2px 2px 0 #fff,
            2px 2px 0 #fff,
            -2px 0 0 #fff,
            2px 0 0 #fff,
            0 -2px 0 #fff,
            0 2px 0 #fff,
            0 0 4px rgba(255,255,255,0.5)
          `,
        };
      default:
        return {
          color: '#ffffff',
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
        };
    }
  };
  
  // 获取当前运镜效果样式
  const cameraStyle = getCameraTransform(currentCameraEffect, overallProgress);
  
  // 使用 useMemo 缓存样式对象，避免重复创建
  const baseMediaStyle = useMemo(() => ({
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
  
  // 仅对图片应用运镜效果的样式
  const getMediaStyleForType = useMemo(() => {
    return (mediaType: MediaType) => {
      // 只有图片才应用运镜效果
      if (mediaType === 'image') {
        return {
          ...baseMediaStyle,
          ...cameraStyle,
        };
      }
      
      // 视频不应用运镜效果
      return baseMediaStyle;
    };
  }, [baseMediaStyle, cameraStyle]);
  
  // 获取字体样式配置
  const fontStyleConfig = getFontStyleConfig(font_style);
  
  // 字幕透明度动画
  let subtitleInputRange: number[];
  let subtitleOutputRange: number[];
  if (currentAudioDurationInFrames <= 30) {
    // 音频太短，淡入淡出合并
    subtitleInputRange = [0, currentAudioDurationInFrames / 2, currentAudioDurationInFrames];
    subtitleOutputRange = [0, 1, 0];
  } else {
    subtitleInputRange = [0, 15, currentAudioDurationInFrames - 15, currentAudioDurationInFrames];
    subtitleOutputRange = [0, 1, 1, 0];
  }
  const subtitleOpacity = interpolate(
    frameInCurrentAudio,
    subtitleInputRange,
    subtitleOutputRange,
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }
  );

  // 渲染背景媒体 - 优化版本
  const renderBackgroundMedia = () => {
    if (!currentMedia) return null;
    
    const mediaStyle = getMediaStyleForType(currentMedia.type);
    
    if (currentMedia.type === 'video' && currentMedia.duration > 0) {
      // 视频：连续播放，不重头开始
      
      // 计算从总体开始到当前音频片段开始的累计时间（秒）
      const cumulativeTimeInSeconds = audioStartFrames[currentAudioSegmentIndex] / fps;
      
      // 计算视频应该从哪个时间点开始播放（考虑视频时长的循环）
      const videoStartTime = cumulativeTimeInSeconds % currentMedia.duration;
      
      // 视频需要播放的时长是当前音频片段的时长
      const playDuration = audioDurations[currentAudioSegmentIndex];
      
      // 如果视频剩余时长不够播放整个音频片段，需要循环
      const remainingVideoTime = currentMedia.duration - videoStartTime;
      
      // 修复精度问题：确保 startFrom 是整数帧
      const startFromFrame = Math.round(videoStartTime * fps);
      
      if (remainingVideoTime >= playDuration) {
        // 视频剩余时长足够，直接播放一段
        return (
          <Sequence
            key={`video-${currentMedia.index}-${currentAudioSegmentIndex}`}
            from={currentAudioStartFrame}
            durationInFrames={currentAudioDurationInFrames}
          >
            <div style={mediaStyle}>
              <OffthreadVideo
                src={currentMedia.url.startsWith('http') ? currentMedia.url : staticFile(currentMedia.url)}
                startFrom={startFromFrame}
                muted={true}
                style={mediaContentStyle}
              />
            </div>
          </Sequence>
        );
      } else {
        // 需要循环播放视频 - 优化版本
        const sequences = [];
        let remainingAudioFrames = currentAudioDurationInFrames;
        let currentSequenceStart = currentAudioStartFrame;
        let currentVideoStart = videoStartTime;
        let sequenceIndex = 0;
        
        while (remainingAudioFrames > 0) {
          const remainingVideoFrames = Math.round((currentMedia.duration - currentVideoStart) * fps);
          const sequenceDuration = Math.min(remainingVideoFrames, remainingAudioFrames);
          const currentStartFromFrame = Math.round(currentVideoStart * fps);
          
          sequences.push(
            <Sequence
              key={`video-${currentMedia.index}-${currentAudioSegmentIndex}-${sequenceIndex}`}
              from={currentSequenceStart}
              durationInFrames={sequenceDuration}
            >
              <div style={mediaStyle}>
                <OffthreadVideo
                  src={currentMedia.url.startsWith('http') ? currentMedia.url : staticFile(currentMedia.url)}
                  startFrom={currentStartFromFrame}
                  muted={true}
                  style={mediaContentStyle}
                />
              </div>
            </Sequence>
          );
          
          remainingAudioFrames -= sequenceDuration;
          currentSequenceStart += sequenceDuration;
          currentVideoStart = 0; // 下一轮从视频开头开始
          sequenceIndex++;
        }
        
        return sequences;
      }
    } else {
      // 图片：在整个音频段显示
      const imageSrc = currentMedia.url.startsWith('http') ? currentMedia.url : staticFile(currentMedia.url);
      
      return (
        <Sequence
          key={`image-${currentMedia.index}-${currentAudioSegmentIndex}`}
          from={currentAudioStartFrame}
          durationInFrames={currentAudioDurationInFrames}
        >
          {/* 隐藏的预加载图片 - 确保图片完全加载，防止闪烁 */}
          <Img
            src={imageSrc}
            style={{
              opacity: 0,
              position: 'absolute',
              left: '-100%',
              width: '1px',
              height: '1px',
            }}
            onError={(e) => {
              console.warn(`Hidden preload image failed to load: ${imageSrc}`);
            }}
          />
          <div style={mediaStyle}>
            <Img
              src={imageSrc}
              alt="背景图片"
              style={mediaContentStyle}
              onError={(e) => {
                console.error(`Main image failed to load: ${imageSrc}`);
                // 可以在这里设置一个默认图片或者错误状态
              }}
              placeholder={(
                <div style={{
                  ...mediaContentStyle,
                  backgroundColor: '#333',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontSize: '24px'
                }}>
                  图片加载失败
                </div>
              )}
            />
          </div>
        </Sequence>
      );
    }
  };

  return (
    <AbsoluteFill style={{ 
      background: "#000000",
      overflow: 'hidden'
    }}>
      {/* 音频序列 - 只有当有音频时才渲染 */}
      {speaker_audio.length > 0 && speaker_audio.map((audioUrl: string, index: number) => (
        <Sequence
          key={`audio-${index}`}
          from={audioStartFrames[index]}
          durationInFrames={audioDurations[index] * fps}
        >
          <Audio
            src={audioUrl.startsWith('http') ? audioUrl : staticFile(audioUrl)}
            volume={1}
          />
        </Sequence>
      ))}
      
      {/* 背景媒体 - 只有在图片和视频都预加载完成后才渲染 */}
      {imagesLoaded && videosLoaded && renderBackgroundMedia()}
      
      {/* 字幕显示 */}
      {subtitles[currentAudioSegmentIndex] && (
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
            backgroundColor: 'transparent',
            borderRadius: '8px',
            fontSize: 32,
            fontWeight: 'bold',
            lineHeight: '1.5',
            maxWidth: '100%',
            wordWrap: 'break-word',
            ...fontStyleConfig,
          }}>
            {subtitles[currentAudioSegmentIndex]}
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
          <div>当前音频片段: {currentAudioSegmentIndex + 1}/{audioDurations.length}</div>
          <div>音频片段时长: {audioDurations[currentAudioSegmentIndex]}秒</div>
          <div>运镜效果: {currentCameraEffect}</div>
          <div>运镜进度: {(overallProgress * 100).toFixed(1)}%</div>
          <div>字体样式: {font_style}</div>
          <div>音频数量: {speaker_audio.length}</div>
          <div>背景媒体数量: {backgroundImages?.length || 0}</div>
          <div>图片预加载状态: {imagesLoaded ? '✅ 已完成' : '⏳ 加载中'}</div>
          <div>视频预加载状态: {videosLoaded ? '✅ 已完成' : '⏳ 加载中'}</div>
          {Object.keys(imageLoadStatus).length > 0 && (
            <div style={{ fontSize: '12px', marginTop: '5px' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>图片状态:</div>
              {Object.entries(imageLoadStatus).map(([url, status]) => {
                const fileName = url.split('/').pop() || url;
                const statusIcon = status === 'success' ? '✅' : status === 'failed' ? '❌' : '⏳';
                return (
                  <div key={url} style={{ marginBottom: '2px' }}>
                    {statusIcon} {fileName.length > 30 ? fileName.substring(0, 30) + '...' : fileName}
                  </div>
                );
              })}
            </div>
          )}
          {Object.keys(videoLoadStatus).length > 0 && (
            <div style={{ fontSize: '12px', marginTop: '5px' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>视频状态:</div>
              {Object.entries(videoLoadStatus).map(([url, status]) => {
                const fileName = url.split('/').pop() || url;
                const statusIcon = status === 'success' ? '✅' : status === 'failed' ? '❌' : '⏳';
                return (
                  <div key={url} style={{ marginBottom: '2px' }}>
                    {statusIcon} {fileName.length > 30 ? fileName.substring(0, 30) + '...' : fileName}
                  </div>
                );
              })}
            </div>
          )}
          {currentMedia && (
            <>
              <div>媒体类型: {currentMedia.type}</div>
              <div>媒体URL: {currentMedia.url.split('/').pop()}</div>
              {currentMedia.type === 'video' && (
                <div>视频时长: {currentMedia.duration.toFixed(1)}秒</div>
              )}
            </>
          )}
        </div>
      )}
    </AbsoluteFill>
  );
};