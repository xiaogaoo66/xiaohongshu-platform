# 小说展示镜头模板 (NovelShowcase)

## 概述

`NovelShowcase` 是一个专为小说内容展示设计的 Remotion 组件，提供丰富的运镜效果、音频播放和字幕显示功能。

## 主要特性

- ✅ **多种运镜效果**：缩放、移动、震动等8种效果
- ✅ **音频序列播放**：支持多个音频文件按顺序播放
- ✅ **字幕同步显示**：字幕与音频时长完全同步
- ✅ **背景图片切换**：1张图片对应1个运镜效果，每个运镜效果对应4个字幕和音频
- ✅ **样式自定义**：可自定义字幕颜色、背景色、字体大小等
- ✅ **调试信息**：开发模式下显示调试信息
- ✅ **黑边优化**：move类型运镜效果自动缩放避免黑边问题
- ✅ **字幕描边**：白色字体配黑色描边，透明背景，确保在任何背景下都清晰可见

## 参数说明

### 必需参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `cameraEffects` | `CameraEffect[]` | 运镜效果数组，每张背景图片对应一个运镜效果 |
| `speaker_audio` | `string[]` | 音频文件URL数组 |
| `subtitles` | `string[]` | 字幕文本数组 |
| `backgroundImages` | `string[]` | 背景图片URL数组 |

### 可选参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `audioDurations` | `number[]` | `[5, 5, 5, ...]` | 每个音频的时长（秒） |
| `backgroundColor` | `string` | `"#000000"` | 背景颜色 |
| `subtitleColor` | `string` | `"#ffffff"` | 字幕文字颜色 |
| `subtitleBackgroundColor` | `string` | `"transparent"` | 字幕背景颜色 |
| `subtitleFontSize` | `number` | `32` | 字幕字体大小 |

## 运镜效果类型

| 效果名称 | 描述 | 适用场景 |
|----------|------|----------|
| `zoom-in` | 缓慢放大 | 聚焦、强调 |
| `zoom-out` | 缓慢缩小 | 展现全貌 |
| `move-up` | 向上移动 | 上升、希望 |
| `move-down` | 向下移动 | 下降、沉重 |
| `move-left` | 向左移动 | 回忆、过去 |
| `move-right` | 向右移动 | 未来、前进 |
| `shake` | 轻微震动 | 紧张、恐惧 |
| `static` | 静止 | 平静、沉思 |

## 使用示例

### 基本使用

```typescript
import { NovelShowcase } from "./MidScense";

export const MyNovelVideo = () => {
  return (
    <NovelShowcase
      cameraEffects={[
        "zoom-in",    // 第1个运镜效果：缩放进入 (对应前4个音频和字幕)
      ]}
      speaker_audio={[
        "/audio1.mp3",
        "/audio2.mp3",
        "/audio3.mp3",
        "/audio4.mp3",
      ]}
      subtitles={[
        "在一个月黑风高的夜晚，",
        "主人公独自走在荒凉的小径上，",
        "突然传来了一声尖叫，",
        "他转身看向声音的方向，",
      ]}
      backgroundImages={[
        "/background1.jpg", // 对应第1个运镜效果
      ]}
      audioDurations={[3, 4, 3, 5]}
    />
  );
};
```

### 多背景图片使用

```typescript
export const MultipleBackgroundExample = () => {
  return (
    <NovelShowcase
      cameraEffects={[
        "zoom-in",    // 第1个运镜效果：缩放进入 (对应前4个音频和字幕)
        "move-right", // 第2个运镜效果：向右移动 (对应后4个音频和字幕)
      ]}
      speaker_audio={[
        "/audio1.mp3", "/audio2.mp3", "/audio3.mp3", "/audio4.mp3",
        "/audio5.mp3", "/audio6.mp3", "/audio7.mp3", "/audio8.mp3",
      ]}
      subtitles={[
        "第一幕：开始", "情节发展", "转折点", "第一幕结束",
        "第二幕：开始", "高潮部分", "情感冲突", "第二幕结束",
      ]}
      backgroundImages={[
        "/scene1.jpg", // 对应第1个运镜效果 (前4个字幕和音频)
        "/scene2.jpg", // 对应第2个运镜效果 (后4个字幕和音频)
      ]}
    />
  );
};
```

### 样式自定义

```typescript
export const CustomStyledExample = () => {
  return (
    <NovelShowcase
      cameraEffects={["move-up"]} // 1个运镜效果
      speaker_audio={["/audio1.mp3", "/audio2.mp3", "/audio3.mp3", "/audio4.mp3"]}
      subtitles={["自定义样式", "更大的字体", "向上移动", "运镜效果"]}
      backgroundImages={["/background.jpg"]}
      backgroundColor="#1a1a2e"
      subtitleColor="#eee"
      subtitleBackgroundColor="transparent"
      subtitleFontSize={48}
    />
  );
};
```

## 工作原理

1. **时间轴管理**：根据 `audioDurations` 计算每个片段的开始时间和持续时间
2. **音频播放**：使用 `Sequence` 组件按时间顺序播放音频文件
3. **字幕显示**：根据当前时间显示对应的字幕，带有淡入淡出效果
4. **背景切换**：每4个字幕切换一次背景图片
5. **运镜效果**：每张背景图片对应一个运镜效果，持续4个音频片段的时间
6. **运镜计算**：实时计算运镜效果进度，并应用相应的CSS变换
7. **黑边优化**：move类型运镜效果自动缩放避免黑边问题
8. **字幕渲染**：使用多方向text-shadow创建黑色描边效果，确保字幕在任何背景下都清晰可见

## 扩展运镜效果

要添加新的运镜效果，只需：

1. 在 `CameraEffect` 类型中添加新的效果名称
2. 在 `getCameraTransform` 函数中添加对应的 case 分支

```typescript
// 添加新效果类型
type CameraEffect = 'zoom-in' | 'zoom-out' | 'rotate' | 'fade' | ...;

// 在 getCameraTransform 函数中添加
case 'rotate': {
  const rotation = interpolate(progress, [0, 1], [0, 360]);
  return {
    transform: `rotate(${rotation}deg)`,
    transformOrigin: 'center center'
  };
}
```

## 运镜效果数组使用说明

- `cameraEffects` 数组的长度应该与 `backgroundImages` 数组的长度相同
- 每张背景图片对应一个运镜效果
- 每个运镜效果对应4个音频和字幕片段
- 如果数组长度不匹配，超出部分会使用 `'static'` 作为默认效果
- `move` 类型的运镜效果会自动缩放1.15倍以避免黑边问题

### 示例：2张背景图片，2个运镜效果，8个音频和字幕
```typescript
cameraEffects: [
  "zoom-in",     // 第1个运镜效果：缩放进入 - 对应背景图片1和前4个音频
  "move-right",  // 第2个运镜效果：向右移动 - 对应背景图片2和后4个音频
]

backgroundImages: [
  "/background1.jpg", // 对应第1个运镜效果
  "/background2.jpg", // 对应第2个运镜效果
]

// 8个音频和字幕会自动分配：
// 前4个 -> 第1个运镜效果 + 背景图片1
// 后4个 -> 第2个运镜效果 + 背景图片2
```

### 运镜效果优化

- **Move运镜效果改进**：`move-up`、`move-down`、`move-left`、`move-right` 会先缩放1.15倍再移动，避免出现黑边
- **移动范围扩大**：移动距离从50px增加到60px，提供更明显的运镜效果
- **统一变换原点**：所有运镜效果都以中心点为变换原点，确保效果自然

### 字幕样式优化

- **透明背景**：字幕背景默认设置为透明，不会遮挡背景图片
- **黑色描边**：使用多方向text-shadow创建黑色描边效果，确保字幕在任何背景下都清晰可见
- **白色字体**：使用白色字体配合黑色描边，提供最佳的视觉对比度

## 注意事项

1. **图片尺寸**：确保背景图片是 1024x1024 像素，运镜效果不会超出此范围
2. **音频格式**：建议使用 MP3 格式的音频文件
3. **文件路径**：文件可以是相对路径（使用 `staticFile`）或绝对URL
4. **时长计算**：总视频时长 = 所有音频时长之和
5. **调试模式**：开发环境下会显示调试信息，生产环境不显示
6. **数组长度**：`cameraEffects` 数组长度应该等于 `backgroundImages` 数组长度
7. **音频分配**：每个运镜效果对应4个音频和字幕，请确保音频数量是4的倍数
8. **字幕样式**：字幕默认使用透明背景和黑色描边，适合各种背景图片

## 性能优化建议

- 压缩音频文件以减少加载时间
- 优化背景图片大小（推荐 1024x1024 JPEG）
- 避免过多的音频片段（建议单个视频不超过20个片段）
- 使用CDN加速资源加载

## 故障排除

### 常见问题

1. **音频不播放**：检查音频文件路径和格式
2. **字幕不显示**：确认字幕数组与音频数组长度匹配
3. **背景图片不显示**：检查图片路径和网络连接
4. **运镜效果不生效**：确认传入的 `cameraEffect` 值正确
5. **字幕不够清晰**：检查字幕颜色设置，确保使用白色字体和黑色描边

### 调试技巧

- 在开发模式下查看左上角的调试信息
- 检查浏览器控制台的错误信息
- 使用 Remotion 的预览功能逐帧查看 