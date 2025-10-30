# 视频渲染 API 使用指南

这是一个基于队列的视频渲染API服务，支持任务提交、进度查询和队列管理。

## 🚀 快速开始

### 1. 安装依赖
```bash
npm install
```

### 2. 启动API服务
```bash
npm run start-api
```
服务将在 `http://localhost:3001` 启动

### 3. 测试API
```bash
npm run test-api
```

## 📚 API 接口文档

### 基础URL
```
http://localhost:3001/api
```

### 1. 健康检查
**GET** `/health`

检查API服务是否正常运行。

**响应示例:**
```json
{
  "success": true,
  "status": "running",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "queueLength": 0,
  "isProcessing": false
}
```

### 2. 提交渲染任务
**POST** `/tasks`

提交一个新的视频渲染任务到队列。

**请求体:**
```json
{
  "fileName": "my-video.mp4",
  "outputLocation": "./out",
  "composition": "MyComp",
  "props": {
    "title": "我的标题",
    "subtitle": "我的副标题",
    "titleColor": "#ff6b6b",
    "backgroundColor": "#2c3e50"
  }
}
```

**参数说明:**
- `fileName` (可选): 输出文件名，默认为 `video-{timestamp}.mp4`
- `outputLocation` (可选): 输出目录，默认为 `./out`
- `composition` (可选): Remotion组合名称，默认为 `MyComp`
- `props` (可选): 自定义属性对象，也可以使用 `customProps` (向后兼容)

**响应示例:**
```json
{
  "success": true,
  "taskId": "123e4567-e89b-12d3-a456-426614174000",
  "message": "任务已提交到队列",
  "queueLength": 1,
  "receivedProps": {
    "title": "我的标题",
    "subtitle": "我的副标题",
    "titleColor": "#ff6b6b",
    "backgroundColor": "#2c3e50"
  }
}
```

### 3. 查询任务状态
**GET** `/tasks/:taskId`

查询指定任务的状态和进度。

**响应示例:**
```json
{
  "success": true,
  "task": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "status": "processing",
    "progress": 45,
    "queuePosition": 0,
    "createdAt": "2024-01-01T12:00:00.000Z",
    "startedAt": "2024-01-01T12:01:00.000Z",
    "completedAt": null,
    "outputFileName": "my-video.mp4",
    "error": null
  }
}
```

**任务状态说明:**
- `pending`: 等待处理
- `processing`: 正在处理
- `completed`: 已完成
- `failed`: 失败

### 4. 获取所有任务
**GET** `/tasks`

获取所有任务的状态列表。

**响应示例:**
```json
{
  "success": true,
  "tasks": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "status": "completed",
      "progress": 100,
      "createdAt": "2024-01-01T12:00:00.000Z",
      "startedAt": "2024-01-01T12:01:00.000Z",
      "completedAt": "2024-01-01T12:03:00.000Z",
      "outputFileName": "my-video.mp4",
      "error": null
    }
  ],
  "queueLength": 0,
  "isProcessing": false
}
```

## 💻 使用示例

### JavaScript / Node.js 示例

```javascript
// 提交任务 (使用新的props参数)
const response = await fetch('http://localhost:3001/api/tasks', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    fileName: 'my-custom-video.mp4',
    props: {
      title: '欢迎来到我的频道',
      subtitle: '订阅获取更多精彩内容',
      titleColor: '#ff6b6b',
      backgroundColor: '#2c3e50'
    }
  })
});

const result = await response.json();
console.log('任务ID:', result.taskId);
console.log('接收到的Props:', result.receivedProps);

// 查询任务状态
const statusResponse = await fetch(`http://localhost:3001/api/tasks/${result.taskId}`);
const statusResult = await statusResponse.json();
console.log('任务状态:', statusResult.task.status);
console.log('进度:', statusResult.task.progress + '%');
```

### cURL 示例

```bash
# 提交任务 (使用新的props参数)
curl -X POST http://localhost:3001/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "fileName": "test-video.mp4",
    "props": {
      "title": "测试视频",
      "subtitle": "这是一个测试",
      "titleColor": "#ff6b6b",
      "backgroundColor": "#2c3e50"
    }
  }'

# 查询任务状态（替换为实际的taskId）
curl http://localhost:3001/api/tasks/123e4567-e89b-12d3-a456-426614174000

# 获取所有任务
curl http://localhost:3001/api/tasks
```

## 🎯 队列管理特性

### 串行处理
- 任务按提交顺序串行处理，确保系统资源合理利用
- 同时只处理一个渲染任务，避免资源竞争

### 实时进度跟踪
- 每个任务都有详细的进度信息（0-100%）
- 包含打包进度（20%）和渲染进度（80%）
- 支持实时查询队列位置

### 状态管理
- 完整的任务生命周期跟踪
- 自动错误处理和状态更新
- 持久化任务信息直到服务重启

## 🔧 高级配置

### GPU 加速配置
API 自动使用 GPU 加速配置，包括：
- ANGLE D3D11 渲染器
- 硬件加速选项
- 优化的 Chrome 参数

### 自定义输出目录
```json
{
  "outputLocation": "/path/to/custom/directory",
  "fileName": "custom-name.mp4"
}
```

### 自定义 Remotion 组合
```json
{
  "composition": "MyCustomComposition",
  "customProps": {
    "customProperty": "customValue"
  }
}
```

## ⚠️ 注意事项

1. **服务依赖**: 确保 Remotion 项目的 `src/index.ts` 文件存在且正确配置
2. **输出目录**: 输出目录会自动创建，确保有写入权限
3. **内存使用**: 长时间运行可能积累大量任务信息，建议定期重启服务
4. **并发限制**: 当前版本仅支持串行处理，如需并发请修改 `concurrency` 配置

## 🐛 故障排除

### API 服务无法启动
- 检查端口 3001 是否被占用
- 确保所有依赖已正确安装
- 检查 Node.js 版本兼容性

### 任务失败
- 查看控制台错误日志
- 确认 Remotion 组合名称正确
- 检查 customProps 格式是否正确
- 验证 GPU 驱动是否最新

### 渲染速度慢
- 检查 GPU 是否被正确使用
- 调整 `concurrency` 参数（在 video-render-api.js 中）
- 确保系统有足够的内存和存储空间

## 📝 开发建议

1. 使用 `npm run test-api` 进行功能测试
2. 监控 API 日志了解任务处理情况
3. 根据硬件性能调整渲染参数
4. 实现客户端轮询逻辑监控任务进度
5. 考虑添加任务取消功能（如需要）

## 🔄 更新日志

- v1.0.0: 初始版本，支持基本的队列管理和任务处理
- 未来计划: 任务优先级、批量操作、WebSocket 实时推送 