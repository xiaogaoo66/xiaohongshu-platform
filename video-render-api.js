import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { bundle } from "@remotion/bundler";
import { renderMedia, getCompositions } from "@remotion/renderer";
import path from "path";
import fs from "fs";
import { setTimeout } from 'timers';

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(cors());
app.use(express.json());

// 任务队列和状态管理
class TaskQueue {
  constructor() {
    this.tasks = new Map(); // 存储任务信息
    this.queue = []; // 待处理任务队列
    this.isProcessing = false; // 是否正在处理任务
    this.propsTemplates = new Map(); // 存储props模板
  }

  // 添加任务到队列
  addTask(taskConfig) {
    const taskId = uuidv4();
    const task = {
      id: taskId,
      status: 'pending', // pending, processing, completed, failed
      progress: 0,
      createdAt: new Date(),
      startedAt: null,
      completedAt: null,
      config: taskConfig,
      outputPath: null,
      outputFileName: null,
      error: null
    };

    this.tasks.set(taskId, task);
    this.queue.push(taskId);
    
    console.log(`📝 新任务已添加到队列: ${taskId}`);
    console.log(`📊 当前队列长度: ${this.queue.length}`);
    
    // 如果当前没有正在处理的任务，开始处理
    if (!this.isProcessing) {
      this.processNextTask();
    }

    return taskId;
  }

  // 获取任务信息
  getTask(taskId) {
    return this.tasks.get(taskId);
  }

  // 获取所有任务信息
  getAllTasks() {
    return Array.from(this.tasks.values());
  }

  // Props模板管理方法
  savePropsTemplate(templateName, props, description = '') {
    const templateId = uuidv4();
    const template = {
      id: templateId,
      name: templateName,
      props,
      description,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.propsTemplates.set(templateId, template);
    console.log(`💾 Props模板已保存: ${templateName} (ID: ${templateId})`);
    return templateId;
  }

  // 获取Props模板
  getPropsTemplate(templateId) {
    return this.propsTemplates.get(templateId);
  }

  // 根据名称获取Props模板
  getPropsTemplateByName(templateName) {
    return Array.from(this.propsTemplates.values()).find(template => template.name === templateName);
  }

  // 获取所有Props模板
  getAllPropsTemplates() {
    return Array.from(this.propsTemplates.values());
  }

  // 更新Props模板
  updatePropsTemplate(templateId, updates) {
    const template = this.propsTemplates.get(templateId);
    if (!template) {
      return null;
    }

    const updatedTemplate = {
      ...template,
      ...updates,
      updatedAt: new Date()
    };

    this.propsTemplates.set(templateId, updatedTemplate);
    console.log(`📝 Props模板已更新: ${template.name} (ID: ${templateId})`);
    return updatedTemplate;
  }

  // 删除Props模板
  deletePropsTemplate(templateId) {
    const template = this.propsTemplates.get(templateId);
    if (!template) {
      return false;
    }

    this.propsTemplates.delete(templateId);
    console.log(`🗑️ Props模板已删除: ${template.name} (ID: ${templateId})`);
    return true;
  }

  // 使用Props模板创建任务
  addTaskWithTemplate(templateId, overrideConfig = {}) {
    const template = this.getPropsTemplate(templateId);
    if (!template) {
      throw new Error(`Props模板不存在: ${templateId}`);
    }

    const taskConfig = {
      outputLocation: "./out",
      fileName: `${template.name}-${Date.now()}.mp4`,
      customProps: template.props,
      composition: "CombinedShowcase",  // 修改默认组合名称
      ...overrideConfig // 允许覆盖配置
    };

    return this.addTask(taskConfig);
  }

  // 处理下一个任务
  async processNextTask() {
    if (this.queue.length === 0) {
      this.isProcessing = false;
      console.log("✅ 队列为空，等待新任务...");
      return;
    }

    this.isProcessing = true;
    const taskId = this.queue.shift();
    const task = this.tasks.get(taskId);

    if (!task) {
      console.error(`❌ 任务 ${taskId} 不存在`);
      this.processNextTask();
      return;
    }

    console.log(`🎬 开始处理任务: ${taskId}`);
    
    // 更新任务状态
    task.status = 'processing';
    task.startedAt = new Date();
    this.tasks.set(taskId, task);

    try {
      // 执行视频渲染
      const result = await this.renderVideo(task);
      
      // 任务完成
      task.status = 'completed';
      task.progress = 100;
      task.completedAt = new Date();
      task.outputPath = result.outputPath;
      task.outputFileName = result.fileName;
      this.tasks.set(taskId, task);
      
      console.log(`✅ 任务完成: ${taskId}`);
      console.log(`📁 输出文件: ${result.fileName}`);
      
    } catch (error) {
      // 任务失败 - 添加更详细的错误信息
      task.status = 'failed';
      task.error = error.message;
      task.completedAt = new Date();
      this.tasks.set(taskId, task);
      
      console.error(`❌ 任务失败: ${taskId}`);
      console.error(`❌ 错误类型: ${error.name}`);
      console.error(`❌ 错误信息: ${error.message}`);
      console.error(`❌ 任务配置:`, JSON.stringify(task.config, null, 2));
      
      // 如果是超时错误，提供解决建议
      if (error.message.includes('Timeout')) {
        console.error(`💡 解决建议:`);
        console.error(`   1. 检查视频长度是否过长（当前超时设置: 5分钟）`);
        console.error(`   2. 优化组件性能，减少复杂动画`);
        console.error(`   3. 降低视频分辨率或帧率`);
        console.error(`   4. 增加 timeoutInMilliseconds 值`);
      }
      
      if (error.stack) {
        console.error(`❌ 错误堆栈:`, error.stack);
      }
    }

    // 处理下一个任务
    setTimeout(() => this.processNextTask(), 1000);
  }

  // 渲染视频
  async renderVideo(task) {
    const { config } = task;
    const {
      outputLocation = "./out",
      fileName,
      customProps = {},
      composition = "CombinedShowcase"  // 修改默认组合为存在的组合
    } = config;

    console.log(`💻 开始CPU渲染任务: ${task.id}`);
    console.log(`🎭 目标组合: ${composition}`);
    console.log(`📋 task:`, task);
    
    // 确保输出目录存在
    const outputDir = path.resolve(outputLocation);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // 生成文件名
    const timestamp = Date.now();
    const outputFileName = fileName || `video-${timestamp}.mp4`;
    const outputPath = path.resolve(outputDir, outputFileName);

    // 1. 打包项目
    console.log(`📦 正在打包项目...`);
    const bundleLocation = await bundle({
      entryPoint: path.resolve("./src/index.ts"),
      onProgress: (progress) => {
        const bundleProgress = Math.round(progress * 20); // 打包占总进度的20%
        task.progress = bundleProgress;
        this.tasks.set(task.id, task);
        console.log(`📦 打包进度: ${bundleProgress}%`);
      },
    });

    // 2. 获取组合 - 只使用API传入的props
    console.log(`🎭 获取组合信息...`);
    console.log(`📋 传递给getCompositions的props:`, customProps);
    const compositions = await getCompositions(bundleLocation, {
      inputProps: customProps
    });

    const comp = compositions.find((c) => c.id === composition);
    if (!comp) {
      console.error(`❌ 可用的组合:`, compositions.map(c => c.id));
      throw new Error(`未找到名为 '${composition}' 的组合。可用组合: ${compositions.map(c => c.id).join(', ')}`);
    }

    console.log(`✅ 找到组合: ${comp.id}`);
    console.log(`📏 视频尺寸: ${comp.width}x${comp.height}`);
    console.log(`🎬 帧率: ${comp.fps}`);
    console.log(`📋 组合默认Props (将被忽略):`, comp.defaultProps);
    console.log(`📋 最终使用的Props (仅API传入):`, task);

    // 3. 渲染视频 - 只使用API传入的props，不与默认props合并
    console.log(`🎬 开始渲染，总帧数: ${comp.durationInFrames}，预计时长: ${Math.round(comp.durationInFrames / comp.fps)}秒`);
    
    await renderMedia({
      composition: comp,
      serveUrl: bundleLocation,
      codec: "h264",
      outputLocation: outputPath,
      inputProps: customProps,  // 只使用API传入的props，不进行任何合并
      
      // CPU优化渲染配置
      concurrency: 1, // CPU服务器使用单线程渲染，避免资源竞争
      jpegQuality: 90,
      scale: 1,
      pixelFormat: "yuv420p",
      
      // 超时配置
      timeoutInMilliseconds: 300000 * 3,
      
      // CPU优化的Chromium配置 - 解决开始几帧问题
      chromiumOptions: {
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-extensions",
          "--disable-plugins",
          "--disable-background-timer-throttling",
          "--disable-renderer-backgrounding",
          "--disable-backgrounding-occluded-windows",
          "--disable-features=TranslateUI",
          "--disable-ipc-flooding-protection",
          "--max_old_space_size=4096",
          "--disable-software-rasterizer",
          "--disable-gpu", // 明确禁用GPU
          "--disable-gpu-compositing",
          "--disable-gpu-rasterization",
          "--disable-gpu-sandbox",
          "--disable-web-security",
          "--allow-running-insecure-content",
          // 解决开始几帧问题的关键配置
          "--disable-features=VizDisplayCompositor",
          "--disable-features=AudioServiceOutOfProcess",
          "--autoplay-policy=no-user-gesture-required",
          "--disable-background-media-suspend",
          "--disable-media-suspend",
          "--force-prefers-reduced-motion",
          "--disable-smooth-scrolling",
          "--disable-threaded-animation",
          "--disable-checker-imaging",
          "--disable-new-content-rendering-timeout"
        ],
        headless: true,
        // 增加页面加载等待时间，确保完全初始化
        slowMo: 100
      },
      
      // 音视频同步配置 - 解决开始几帧音频卡顿问题
      enforceAudioTrack: false, // 禁用强制音频轨道，避免音频初始化延迟
      muted: false,
      
      // 帧渲染配置
      everyNthFrame: 1,
      numberOfGifLoops: null,
      
      // 关键：添加延迟启动，让浏览器和媒体完全初始化
      delayRenderTimeoutInMilliseconds: 30000, // 30秒延迟渲染超时
      
      // 禁用一些可能导致初始帧问题的功能
      disallowParallelEncoding: true, // 禁用并行编码，确保顺序渲染
      
      // 添加预热帧，跳过可能不稳定的开始几帧
      frameRange: [3, comp.durationInFrames - 1], // 从第4帧开始渲染，跳过前3帧，结束帧需要减1
      
      // 进度回调
      onProgress: ({ progress, renderedFrames, encodedFrames }) => {
        const renderProgress = 20 + Math.round(progress * 80); // 渲染占80%
        task.progress = renderProgress;
        this.tasks.set(task.id, task);
        console.log(`💻 任务 ${task.id} CPU渲染进度: ${renderProgress}% (帧 ${renderedFrames}/${comp.durationInFrames})`);
        
        // 输出更详细的进度信息
        if (renderedFrames % 100 === 0 || progress === 1) {
          console.log(`🎯 详细进度 - 已渲染: ${renderedFrames}, 已编码: ${encodedFrames}, 总帧数: ${comp.durationInFrames}`);
        }
      },
    });

    return {
      outputPath,
      fileName: outputFileName
    };
  }


}

// 创建任务队列实例
const taskQueue = new TaskQueue();

// API路由

// 提交任务
app.post('/api/tasks', (req, res) => {
  try {
    const {
      outputLocation,
      fileName,
      customProps,
      props,  // 新增props参数
      composition
    } = req.body;

    // 验证必要参数 - 支持props或customProps或fileName
    if (!props && !customProps && !fileName) {
      return res.status(400).json({
        success: false,
        error: '请提供 props、customProps 或 fileName 参数'
      });
    }

    // 优先使用props，然后是customProps
    const finalProps = props;

    const taskConfig = {
      outputLocation: outputLocation || "./out",
      fileName,
      customProps: finalProps,
      composition: composition || "CombinedShowcase"  // 修改默认组合名称
    };

    const taskId = taskQueue.addTask(taskConfig);

    res.json({
      success: true,
      taskId,
      message: '任务已提交到队列',
      queueLength: taskQueue.queue.length,
      receivedProps: finalProps  // 返回接收到的props确认
    });

    console.log(`📨 API: 新任务提交 ${taskId}`);
    console.log(`📋 接收到的props:`, finalProps);

  } catch (error) {
    console.error('提交任务错误:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 查询任务状态
app.get('/api/tasks/:taskId', (req, res) => {
  try {
    const { taskId } = req.params;
    const task = taskQueue.getTask(taskId);

    if (!task) {
      return res.status(404).json({
        success: false,
        error: '任务不存在'
      });
    }

    // 计算队列位置
    const queuePosition = task.status === 'pending' 
      ? taskQueue.queue.indexOf(taskId) + 1 
      : 0;

    const response = {
      success: true,
      task: {
        id: task.id,
        status: task.status,
        progress: task.progress,
        queuePosition,
        createdAt: task.createdAt,
        startedAt: task.startedAt,
        completedAt: task.completedAt,
        outputFileName: task.outputFileName,
        error: task.error
      }
    };

    res.json(response);

  } catch (error) {
    console.error('查询任务错误:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 获取所有任务状态
app.get('/api/tasks', (req, res) => {
  try {
    const tasks = taskQueue.getAllTasks().map(task => ({
      id: task.id,
      status: task.status,
      progress: task.progress,
      createdAt: task.createdAt,
      startedAt: task.startedAt,
      completedAt: task.completedAt,
      outputFileName: task.outputFileName,
      error: task.error
    }));

    res.json({
      success: true,
      tasks,
      queueLength: taskQueue.queue.length,
      isProcessing: taskQueue.isProcessing
    });

  } catch (error) {
    console.error('获取任务列表错误:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'running',
    timestamp: new Date(),
    queueLength: taskQueue.queue.length,
    isProcessing: taskQueue.isProcessing
  });
});

// 启动服务器
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 视频渲染API服务已启动`);
  console.log(`🌐 服务地址: http://0.0.0.0:${PORT}`);
  console.log(`🌐 本地访问: http://localhost:${PORT}`);
  console.log(`📚 API文档:`);
  console.log(`   POST /api/tasks - 提交渲染任务`);
  console.log(`   GET /api/tasks/:taskId - 查询任务状态`);
  console.log(`   GET /api/tasks - 获取所有任务`);
  console.log(`   GET /api/health - 健康检查`);
  console.log(`\n🎯 等待任务提交...`);
});

export { app, taskQueue };