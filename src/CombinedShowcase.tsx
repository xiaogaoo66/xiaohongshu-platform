import {
    AbsoluteFill,
    Sequence,
    Audio,
    useVideoConfig,
    interpolate,
    useCurrentFrame,
    staticFile
} from 'remotion';
import { useAudioData } from "@remotion/media-utils";

import { PhoneShowcase } from './PhoneShowcase';
import { VideoBackgroundComposition } from "./VideoBackgroundComposition";
import { EndingCredits } from './EndingCredits';

interface PhoneProps {
    phoneName: string;
    phoneImage: string;
    mainCamera: string;
    screenSize: string;
    screenResolution: string;
    screenRefreshRate: string;
    bodyMaterial: string;
    frameType: string;
    weight: string;
    thickness: string;
    processor: string;
    batteryCapacity: string;
    wiredChargingPower: string;
    wirelessChargingPower: string;
    price12_256: string;
    price16_512?: string;
    price16_1TB?: string;
    backgroundColor?: string;
    textColor?: string;
    duration?: number;
    speaker_audio?: string;
    endingAvatarUrl?: string;
    endingName?: string;
    endingRole?: string;
    endingSpeakerAudio?: string;
    endingBackgroundColor?: string;
    endingTextColor?: string;
    endingDuration?: number;
}

interface CombinedShowcaseProps {
    // 背景音乐
    backgroundMusic: string;

    // 开场组件属性
    startTitle: string;
    startSubtitle?: string;
    startTitleColor?: string;
    startBackgroundColor?: string;
    startDuration?: number;
    speaker_audio: string;

    // 手机展示组件列表
    phones: PhoneProps[];

    // 转场效果时间（秒）
    transitionDuration?: number;

    // 结束字幕属性
    endingAvatarUrl?: string;
    endingName?: string;
    endingRole?: string;
    endingSpeakerAudio?: string;
    endingBackgroundColor?: string;
    endingTextColor?: string;
    endingDuration?: number;
    includeEnding?: boolean;
    
    // 总时长计算回调
    onDurationCalculated?: (totalDurationInFrames: number) => void;
}

export const CombinedShowcase = ({
    backgroundMusic = '/preview.mp3',
    startTitle = "标题",
    startSubtitle = "副标题",
    startTitleColor = "#ffffff",
    speaker_audio = "/result.wav",
    phones = [] as PhoneProps[],
    transitionDuration = 2,
    endingAvatarUrl = "",
    endingName = "",
    endingRole = "",
    endingSpeakerAudio = "",
    endingBackgroundColor = "rgba(0, 0, 0, 0.5)",
    endingTextColor = "#ffffff",
    endingDuration = 5,
    includeEnding = false,
    onDurationCalculated
}: CombinedShowcaseProps) => {
    const { fps } = useVideoConfig();

    // 转换为帧数
    const transitionDurationInFrames = transitionDuration * fps;

    // 使用useAudioData获取开场音频数据
    const startAudioData = useAudioData(speaker_audio ? staticFile(speaker_audio) : staticFile("/result.wav"));

    // 计算开场音频时长（秒）和对应的帧数
    const startAudioDurationInSeconds = startAudioData ? startAudioData.durationInSeconds : 10; // 默认值为10秒
    const audioDurationInFrames = Math.round(startAudioDurationInSeconds * fps) + 3 * fps; //延迟3秒

    // 每个手机展示的默认持续时间（秒）
    const defaultPhoneDuration = 15;

    // 预先获取所有手机音频路径
    const phoneAudioPaths = phones.map(phone => {
        if (!phone.speaker_audio) {
            return null;
        }
        return phone.speaker_audio;
    });

    // 使用useAudioData获取结束字幕音频数据
    const endingAudioPath = endingSpeakerAudio ? (endingSpeakerAudio.startsWith('http') ? 
        endingSpeakerAudio : staticFile(endingSpeakerAudio)) : null;
    const endingAudioData = endingAudioPath ? useAudioData(endingAudioPath) : null;
    
    // 计算结束字幕的持续时间（秒）
    const calculatedEndingDuration = endingAudioData 
        ? endingAudioData.durationInSeconds + 3 // 音频时长加3秒
        : endingDuration; // 使用默认值
    
    const endingDurationInFrames = calculatedEndingDuration * fps;

    // 为每个手机音频路径获取音频数据
    const phonesAudioDataArray: Array<any> = [];
    for (const audioPath of phoneAudioPaths) {
        if (!audioPath) {
            phonesAudioDataArray.push(null);
            continue;
        }
        const path = audioPath.startsWith('http') ? audioPath : staticFile(audioPath);
        const data = useAudioData(path);
        phonesAudioDataArray.push(data);
    }

    // 计算每个手机的音频时长并添加3秒延迟
    const phonesDurations = phones.map((phone, index) => {
        // 使用预先获取的音频数据
        const phoneAudioData = phonesAudioDataArray[index];

        // 计算音频时长（秒）并添加3秒延迟
        const phoneAudioDuration = phoneAudioData
            ? phoneAudioData.durationInSeconds + 3
            : (phone.duration || defaultPhoneDuration);

        return phoneAudioDuration;
    });

    // 计算每个手机展示的开始时间（帧）
    const phoneStartFrames = phones.reduce<number[]>((acc, phone, index) => {
        if (index === 0) {
            // 第一个手机展示在开场动画之后
            acc.push(audioDurationInFrames - 1 * fps);
        } else {
            // 其他手机展示在前一个之后，考虑过渡时间
            const prevDuration = phonesDurations[index - 1];
            const prevEnd = acc[index - 1] + prevDuration * fps;
            const start = prevEnd - transitionDurationInFrames / 2;
            acc.push(start);
        }
        return acc;
    }, []);

    // 计算结束字幕的开始时间（帧）
    const endingStartFrame = phones.length > 0
        ? phoneStartFrames[phones.length - 1] + phonesDurations[phones.length - 1] * fps - transitionDurationInFrames / 2
        : audioDurationInFrames;
        
    // 计算总时长（帧数）
    const totalDurationInFrames = endingStartFrame + endingDurationInFrames;
    
    // 如果提供了回调函数，调用它传递总时长
    if (onDurationCalculated) {
        onDurationCalculated(totalDurationInFrames);
    }

    return (
        <AbsoluteFill>
            {/* 背景音乐，贯穿整个视频 */}
            <Audio src={backgroundMusic.startsWith('http') ? backgroundMusic : staticFile(backgroundMusic)} volume={0.1} />

            {/* 开场动画 */}
            <Sequence durationInFrames={audioDurationInFrames}>
                <VideoBackgroundComposition
                    title={startTitle}
                    subtitle={startSubtitle}
                    speaker_audio={speaker_audio}
                    fadeInDuration={2}
                    startTitleColor={startTitleColor}
                />
            </Sequence>

            {/* 手机展示序列，带转场效果 */}
            {phones.map((phone, index) => {
                // 每个手机展示的持续时间（帧）
                const phoneDurationInFrames = phonesDurations[index] * fps;
                const startFrame = phoneStartFrames[index];

                return (
                    <Sequence
                        key={index}
                        from={startFrame}
                        durationInFrames={phoneDurationInFrames}
                    >
                        <PhoneTransition
                            phone={phone}
                            duration={phonesDurations[index]}
                            isEntering={index > 0}
                            isExiting={index < phones.length - 1 || includeEnding}
                            transitionDuration={transitionDurationInFrames}
                        />
                    </Sequence>

                );
            })}

            {includeEnding}
            <Sequence
                from={endingStartFrame}
                durationInFrames={endingDurationInFrames}
            >
                <EndingCredits
                    avatarUrl={endingAvatarUrl}
                    name={endingName}
                    role={endingRole}
                    speaker_audio={endingSpeakerAudio}
                    backgroundColor={endingBackgroundColor}
                    textColor={endingTextColor}
                />
            </Sequence>
            

        </AbsoluteFill>
    );
};

interface PhoneTransitionProps {
    phone: PhoneProps;
    duration: number;
    isEntering: boolean;
    isExiting: boolean;
    transitionDuration: number;
}

// 用于处理手机展示的过渡动画
const PhoneTransition = ({
    phone,
    duration,
    isEntering,
    isExiting,
    transitionDuration
}: PhoneTransitionProps) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    // 入场动画
    const enterProgress = isEntering
        ? Math.min(1, frame / (transitionDuration / 2))
        : 1;

    // 出场动画（如果当前帧超过持续时间的一半）
    const exitProgress = isExiting && frame > (duration || 10) * fps - transitionDuration / 2
        ? Math.min(1, (frame - ((duration || 10) * fps - transitionDuration / 2)) / (transitionDuration / 2))
        : 0;

    // 淡入淡出效果
    const opacity = interpolate(
        exitProgress > 0 ? exitProgress : enterProgress,
        [0, 1],
        exitProgress > 0 ? [1, 0] : [0, 1],
        {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
        }
    );

    // 缩放效果
    const scale = interpolate(
        exitProgress > 0 ? exitProgress : enterProgress,
        [0, 1],
        exitProgress > 0 ? [1, 0.9] : [0.9, 1],
        {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
        }
    );

    return (
        <div
            style={{
                width: '100%',
                height: '100%',
                opacity,
                transform: `scale(${scale})`,
            }}
        >
            <PhoneShowcase {...phone} />
        </div>
    );
}; 