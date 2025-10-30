const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3000;

// 中间件
app.use(cors({
  origin: true, // 允许来自任意来源（仅内网调试用）
  credentials: true,
}));
app.use(express.json());

// 模拟数据
let contents = [
  {
    id: '1',
    images: [
      'https://picsum.photos/400/300?random=1',
      'https://picsum.photos/400/300?random=2',
      'https://picsum.photos/400/300?random=3'
    ],
    caption: '今天天气真好，适合出去走走！分享一些美好的生活瞬间给大家～ #生活 #美好 #分享',
    isClaimed: false,
    createdAt: new Date().toISOString()
  },
  {
    id: '2',
    images: [
      'https://picsum.photos/400/300?random=4',
      'https://picsum.photos/400/300?random=5'
    ],
    caption: '新发现了一家超棒的咖啡店！环境很温馨，咖啡也很香浓。推荐给大家～ #咖啡 #探店 #生活',
    isClaimed: false,
    createdAt: new Date().toISOString()
  },
  {
    id: '3',
    images: [
      'https://picsum.photos/400/300?random=6',
      'https://picsum.photos/400/300?random=7',
      'https://picsum.photos/400/300?random=8',
      'https://picsum.photos/400/300?random=9'
    ],
    caption: '周末在家做了一些小手工，感觉很有成就感！手工制作真的能让人心情变好呢～ #手工 #DIY #周末',
    isClaimed: false,
    createdAt: new Date().toISOString()
  }
];

// API 路由
app.get('/api/content/count', (req, res) => {
  const unclaimedCount = contents.filter(c => !c.isClaimed).length;
  res.json(unclaimedCount);
});

app.get('/api/content/claim', (req, res) => {
  const unclaimedContents = contents.filter(c => !c.isClaimed);
  
  if (unclaimedContents.length === 0) {
    return res.status(404).json({ message: '没有可领取的内容' });
  }
  
  // 随机选择一个内容
  const randomIndex = Math.floor(Math.random() * unclaimedContents.length);
  const selectedContent = unclaimedContents[randomIndex];
  
  // 标记为已领取
  selectedContent.isClaimed = true;
  selectedContent.claimedAt = new Date().toISOString();
  
  res.json(selectedContent);
});

// 管理员登录（简化版）
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  
  if (username === 'admin' && password === '123456') {
    res.json({
      access_token: 'mock-jwt-token-12345'
    });
  } else {
    res.status(401).json({ message: '用户名或密码错误' });
  }
});

// 获取所有内容（管理员）
app.get('/api/admin/content', (req, res) => {
  res.json(contents.filter(c => !c.isClaimed));
});

// 获取统计信息（管理员）
app.get('/api/admin/stats', (req, res) => {
  const total = contents.length;
  const claimed = contents.filter(c => c.isClaimed).length;
  const unclaimed = total - claimed;
  
  res.json({ total, claimed, unclaimed });
});

// 创建内容（管理员）
app.post('/api/admin/content', (req, res) => {
  const { images, caption } = req.body;
  
  const newContent = {
    id: Date.now().toString(),
    images,
    caption,
    isClaimed: false,
    createdAt: new Date().toISOString()
  };
  
  contents.push(newContent);
  res.json(newContent);
});

// 删除内容（管理员）
app.delete('/api/admin/content/:id', (req, res) => {
  const { id } = req.params;
  const index = contents.findIndex(c => c.id === id);
  
  if (index === -1) {
    return res.status(404).json({ message: '内容不存在' });
  }
  
  contents.splice(index, 1);
  res.json({ message: '删除成功' });
});

// 上传预签名URL（模拟）
app.post('/api/upload/presigned-url', (req, res) => {
  const { filename, contentType } = req.body;
  
  res.json({
    presignedUrl: 'https://example.com/upload',
    key: `uploads/${Date.now()}-${filename}`,
    url: `https://picsum.photos/400/300?random=${Date.now()}`
  });
});

app.listen(PORT, () => {
  console.log(`🚀 后端服务运行在 http://localhost:${PORT}`);
  console.log(`📊 当前有 ${contents.filter(c => !c.isClaimed).length} 个内容可领取`);
});
