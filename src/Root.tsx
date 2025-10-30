import "./index.css";
import { Composition } from "remotion";
import { VideoBackgroundComposition } from "./VideoBackgroundComposition";
import { PhoneShowcase } from "./PhoneShowcase";
import { CombinedShowcase } from "./CombinedShowcase";

import { NovelShowcase } from "./bookrun/MidScense";
import { SimplifiedShowcase } from "./bookrun/SimplifiedShowcase";
import {
  CombinedSimplifiedShowcase,
  combinedSimplifiedShowcaseSchema,
  calculateMetadata as combinedSimplifiedShowcaseCalculateMetadata,
} from "./bookrun/CombinedSimplifiedShowcase";

// 定义CombinedShowcase属性的接口
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
}

interface CombinedShowcaseProps {
  backgroundMusic: string;
  startTitle: string;
  startSubtitle?: string;
  startTitleColor?: string;
  startBackgroundColor?: string;
  speaker_audio: string;
  startDuration?: number;
  transitionDuration?: number;
  phones: PhoneProps[];
  endingAvatarUrl?: string;
  endingName?: string;
  endingRole?: string;
  endingSpeakerAudio?: string;
  endingBackgroundColor?: string;
  endingTextColor?: string;
  endingDuration?: number;
  includeEnding?: boolean;
  onDurationCalculated?: (totalDurationInFrames: number) => void;
}

export const RemotionRoot: React.FC = () => {
  // CombinedShowcase的默认属性
  const combinedShowcaseProps: CombinedShowcaseProps = {
    backgroundMusic: "/preview.mp3",
    startTitle: "2025年7月国补机指南",
    startSubtitle: "Cyrus的好物推荐频道",
    startTitleColor: "#ffffff",
    startBackgroundColor: "#000033",
    speaker_audio: "/result.wav",
    startDuration: 15,
    transitionDuration: 2,
    endingDuration: 10,
    includeEnding: true,
    phones: [
      {
        phoneName: "Apple/苹果 iPhone 16 Pro",
        phoneImage:
          "https://m.360buyimg.com/rank/jfs/t1/268230/25/12615/18760/6788aef4F2cab40db/b7b4fbecd8dd72bc.png",
        mainCamera: "48MP",
        screenSize: "6.1英寸",
        screenResolution: "2556x1179px",
        screenRefreshRate: "自适应120Hz ProMotion",
        bodyMaterial: "白色钛金属背板",
        frameType: "钛金属中框",
        weight: "194g",
        thickness: "8.25mm",
        processor: "A18 Pro 仿生芯片",
        batteryCapacity: "3561mAh",
        wiredChargingPower: "25W有线充电",
        wirelessChargingPower: "15W无线充电",
        price12_256: "¥ 5999",
        price16_512: "暂无",
        price16_1TB: "暂无",
        backgroundColor: "#111122",
        textColor: "#ffffff",
        speaker_audio:
          "https://dl.dropboxusercontent.com/scl/fi/6hmccdf5g3e3eq6ohihe5/audio_0.mp3?rlkey=z6pk4zx8kiz7t2ndqkp2nsais&raw=1",
      },
      {
        phoneName: "Apple iPhone 16 Pro Max",
        phoneImage:
          "https://m.360buyimg.com/rank/jfs/t1/253885/10/12184/18190/6788af05F60dd569e/7c789425f6bd2d68.png",
        mainCamera: "48MP 主摄 + 48MP 超广角",
        screenSize: "6.9英寸 Super Retina XDR",
        screenResolution: "2868x1320px",
        screenRefreshRate: "120Hz ProMotion",
        bodyMaterial: "白色钛金属背板",
        frameType: "钛金属中框",
        weight: "227g",
        thickness: "8.3mm",
        processor: "A18 Pro 仿生芯片",
        batteryCapacity: "4685mAh",
        wiredChargingPower: "35W有线充电",
        wirelessChargingPower: "25W无线充电",
        price12_256: "¥ 8599",
        price16_512: "暂无",
        price16_1TB: "暂无",
        backgroundColor: "#111122",
        textColor: "#ffffff",
        speaker_audio:
          "https://dl.dropboxusercontent.com/scl/fi/yt9prt1e66fhvubrsyfin/audio_1.mp3?rlkey=s8nl5otqejfgj5nsxhujxsjs2&raw=1",
      },
      {
        phoneName: "小米REDMI K80至尊版",
        phoneImage:
          "https://m.360buyimg.com/rank/jfs/t1/297175/10/18921/27752/685d2c9cF524c36cb/20ae1c96b916f690.png",
        mainCamera: "50MP+50MP+50MP",
        screenSize: "6.73英寸 AMOLED",
        screenResolution: "3200x1440px",
        screenRefreshRate: "120Hz LTPO",
        bodyMaterial: "素皮材质背板",
        frameType: "铝合金中框",
        weight: "235g",
        thickness: "9.2mm",
        processor: "天玑9400+",
        batteryCapacity: "7410mAh",
        wiredChargingPower: "90W有线快充",
        wirelessChargingPower: "50W无线快充",
        price12_256: "¥ 2599",
        price16_512: "暂无",
        price16_1TB: "暂无",
        backgroundColor: "#001133",
        textColor: "#ffffff",
        speaker_audio:
          "https://dl.dropboxusercontent.com/scl/fi/4zn0s1u7wezw7gmjhsepc/audio_2.mp3?rlkey=squ9bljgopv8c7dkds0z6ikqy&raw=1",
      },
    ],
    endingAvatarUrl:
      "https://m.360buyimg.com/rank/jfs/t1/237566/20/32231/60942/67ad8a94F9b435723/c41cf97242b4e847.png",
    endingName: "关注我！持续分享更多好物",
    endingRole: "Cyrus的好物分享 - 用心推荐每一款值得拥有的好物",
    endingSpeakerAudio: "/ending.wav",
    endingBackgroundColor: "rgba(0, 10, 30, 0.5)",
    endingTextColor: "#ffffff",
  };

  return (
    <>
      <Composition
        id="VideoBackground"
        component={VideoBackgroundComposition}
        durationInFrames={4500} // 5秒视频
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          title: "2025年7月国补机指南",
          subtitle: "Cyrus的好物推荐频道",
          textColor: "#ffffff",
          videoSrc: "./background-video.mp4", // 请将您的视频文件放在public文件夹中
          speaker_audio: "/result.wav",
          fadeInDuration: 2,
          delayStart: 0.5,
        }}
      />
      <Composition
        id="PhoneShowcase"
        component={PhoneShowcase}
        durationInFrames={450} // 15秒视频
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          phoneName: "OPPO Find X8 Ultra",
          phoneImage:
            "https://m.360buyimg.com/rank/jfs/t1/230277/11/5147/428304/65670a2eFed2b836c/6e6c735cfba1138e.png", // 请将手机图片放在public文件夹中
          mainCamera: "50MP",
          screenSize: "6.82英寸",
          screenResolution: "3168x1440px",
          screenRefreshRate: "120Hz",
          bodyMaterial: "玻璃背板",
          frameType: "铝合金中框",
          weight: "226g",
          thickness: "8.78mm",
          processor: "高通骁龙8 Elite",
          batteryCapacity: "6100mAh (双芯电池3050mAh*2)",
          wiredChargingPower: "100W有线充电",
          wirelessChargingPower: "50W无线充电",
          price12_256: "¥ 6499",
          price16_512: "¥ 6999",
          price16_1TB: "¥ 7999",
          backgroundColor: "#000000",
          textColor: "#ffffff",
        }}
      />
      <Composition
        id="NovelShowcase"
        component={NovelShowcase}
        durationInFrames={6600} // 30秒视频 (8个音频 × 平均4秒 = 32秒，预留足够时长)
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{}}
      />
      <Composition
        id="CombinedShowcase"
        component={CombinedShowcase}
        durationInFrames={3300} // 使用预估的足够长的时长
        fps={30}
        width={1920}
        height={1080}
        defaultProps={combinedShowcaseProps}
      />
      <Composition
        id="SimplifiedShowcase-ZoomIn"
        component={SimplifiedShowcase}
        durationInFrames={900} // 30秒 (假设3个音频，每个10秒)
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{}}
      />
      <Composition
        id="SimplifiedShowcase-MoveUp"
        component={SimplifiedShowcase}
        durationInFrames={750} // 25秒
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{}}
      />
      <Composition
        id="SimplifiedShowcase-ZoomOut"
        component={SimplifiedShowcase}
        durationInFrames={600} // 20秒
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{}}
      />
      <Composition
        id="SimplifiedShowcase-Shake"
        component={SimplifiedShowcase}
        durationInFrames={450} // 15秒
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{}}
      />
      <Composition
        id="SimplifiedShowcase-MoveDown"
        component={SimplifiedShowcase}
        durationInFrames={800} // 约27秒
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{}}
      />
      <Composition
        id="CombinedSimplifiedShowcase-Demo"
        component={CombinedSimplifiedShowcase}
        durationInFrames={5000} // 80秒 (根据片段数量和音频自动计算)
        fps={30}
        // width={1920}
        // height={1080}
        width={1080}
        height={1920}
        schema={combinedSimplifiedShowcaseSchema}
        calculateMetadata={combinedSimplifiedShowcaseCalculateMetadata}
        defaultProps={{
          backgroundMusic: ["https://tc.bowu.chat/uploads/audios/1KkTelG9.mp3"],
          coverImageUrl:
            "https://internal-api-drive-stream.feishu.cn/space/api/box/stream/download/authcode/?code=ZDA5YzE3NTMzMGYwNjAyNWE5MTcxNjg4MzViYWY5MmNfMzU1YzQ3OWZlNDZlZGY3OTZkMzZjZGFiMmMyOWUwMjlfSUQ6NzU0NzM0ODMwMzA5MjMzNDYyMF8xNzU3OTUxMTQ3OjE3NTgwMzc1NDdfVjM",
          episodeNumber: 0,
          segments: [
            {
              cameraEffects: "",
              subtitles: [],
              backgroundImages: [
                // 已移除包含凭证的临时签名URL，请在运行时从安全来源（如后端或.env）注入真实地址
                "https://example.com/video/sample1.mp4",
              ],
              font_style: "white-black-outline",
              speaker_audio: [],
            },
          ],
        }}
      />
      <Composition
        id="SimplifiedShowcase-NoAudio"
        component={SimplifiedShowcase}
        durationInFrames={900} // 30秒（3张图片，每张10秒；或者视频的实际时长）
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          cameraEffects: "zoom-in",
          // 没有 speaker_audio，测试只依赖背景媒体时长的情况
          subtitles: [
            "第一张图片展示5秒",
            "第二张图片展示5秒",
            "第三张图片展示5秒",
          ],
          backgroundImages: [
            "https://p9-dreamina-sign.byteimg.com/tos-cn-i-tb4s082cfz/c18e4c54eddb4c008c96f893fe5a7475~tplv-tb4s082cfz-aigc_resize_mark:0:0.jpeg?lk3s=43402efa&x-expires=1754784000&x-signature=Ku7iHFRAWzpfqvYJorPLDykmREk%3D&format=.jpeg",
            "https://p9-dreamina-sign.byteimg.com/tos-cn-i-tb4s082cfz/c18e4c54eddb4c008c96f893fe5a7475~tplv-tb4s082cfz-aigc_resize_mark:0:0.jpeg?lk3s=43402efa&x-expires=1754784000&x-signature=Ku7iHFRAWzpfqvYJorPLDykmREk%3D&format=.jpeg",
            "https://p9-dreamina-sign.byteimg.com/tos-cn-i-tb4s082cfz/c18e4c54eddb4c008c96f893fe5a7475~tplv-tb4s082cfz-aigc_resize_mark:0:0.jpeg?lk3s=43402efa&x-expires=1754784000&x-signature=Ku7iHFRAWzpfqvYJorPLDykmREk%3D&format=.jpeg",
          ],
          font_style: "white-black-outline",
        }}
      />
      <Composition
        id="NovelShowcase-NoAudio"
        component={NovelShowcase}
        durationInFrames={1500} // 50秒（假设有一些视频和图片混合）
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          cameraEffects: ["zoom-in", "move-up", "zoom-out"],
          // 没有 speaker_audio，测试只依赖背景媒体时长的情况
          subtitles: [
            "第一个媒体的字幕",
            "第二个媒体的字幕",
            "第三个媒体的字幕",
          ],
          backgroundImages: [
            // 示例占位图与视频，避免将含凭证的签名URL提交到仓库
            "https://example.com/images/placeholder-1.jpg",
            "https://example.com/video/sample2.mp4",
            "https://example.com/images/placeholder-2.jpg",
          ],
          backgroundColor: "#1a1a1a",
          subtitleColor: "#ffffff",
          subtitleBackgroundColor: "transparent",
          subtitleFontSize: 52,
        }}
      />
    </>
  );
};
