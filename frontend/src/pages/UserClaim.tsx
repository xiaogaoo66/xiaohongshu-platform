import React, { useState, useMemo } from 'react'
import { Button, Card, Image, message, Spin, Typography, Space, Statistic, Row, Col } from 'antd'
import { DownloadOutlined, CopyOutlined, GiftOutlined, ReloadOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { contentAPI } from '../services/api'
import { Content } from '../types'
import copy from 'copy-to-clipboard'
import './UserClaim.css'

const { Title, Paragraph } = Typography

const UserClaim: React.FC = () => {
  const [claimedContent, setClaimedContent] = useState<Content | null>(null)
  const queryClient = useQueryClient()

  // 获取剩余内容数量
  const { data: contentCountData, isLoading: countLoading, error: countError } = useQuery({
    queryKey: ['contentCount'],
    queryFn: async () => {
      try {
        const response = await contentAPI.getContentCount()
        // 确保返回的数据格式正确
        if (response?.data) {
          return response.data
        }
        return { count: 0 }
      } catch (error: any) {
        // 静默处理错误，返回默认值
        console.warn('获取内容数量失败:', error)
        return { count: 0 }
      }
    },
    refetchInterval: 5000, // 每5秒刷新一次
    retry: false, // 禁用自动重试，避免频繁请求
    // 即使查询失败也继续使用默认值
    staleTime: 1000,
  })
  
  // 从返回的对象中提取 count，兼容可能的数字格式
  const contentCount = useMemo(() => {
    if (countError) return 0
    if (typeof contentCountData === 'number') return contentCountData
    if (contentCountData && typeof contentCountData === 'object') {
      return (contentCountData as any)?.count || 0
    }
    return 0
  }, [contentCountData, countError])

  // 领取内容
  const claimMutation = useMutation({
    mutationFn: () => contentAPI.claimContent().then(res => res.data),
    onSuccess: (data: Content) => {
      setClaimedContent(data)
      message.success('内容领取成功！')
      queryClient.invalidateQueries({ queryKey: ['contentCount'] })
    },
    onError: (error: any) => {
      if (error.response?.status === 404) {
        message.warning('暂时没有可领取的内容，请稍后再试')
      } else {
        message.error('领取失败，请稍后重试')
      }
    },
  })

  const handleClaim = () => {
    claimMutation.mutate()
  }

  const handleCopyCaption = () => {
    if (claimedContent?.caption) {
      copy(claimedContent.caption)
      message.success('文案已复制到剪贴板')
    }
  }

  const handleDownloadImage = (imageUrl: string) => {
    // 在新标签页中打开图片，用户可以右键保存
    window.open(imageUrl, '_blank')
  }

  const handleDownloadAll = () => {
    if (claimedContent?.images) {
      claimedContent.images.forEach((imageUrl, index) => {
        setTimeout(() => {
          handleDownloadImage(imageUrl)
        }, index * 500) // 延迟下载避免浏览器阻止
      })
    }
  }

  if (countLoading) {
    return (
      <div className="claim-container">
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <Spin size="large" />
        </div>
      </div>
    )
  }

  return (
    <div className="claim-container">
      {/* 统计信息 */}
      <div className="stats-card">
        <Row gutter={16}>
          <Col span={8}>
            <Statistic
              title="剩余内容"
              value={contentCount || 0}
              valueStyle={{ color: '#fff' }}
              prefix={<GiftOutlined />}
            />
          </Col>
          <Col span={8}>
            <Statistic
              title="今日已领取"
              value={Math.floor(Math.random() * 50) + 10} // 模拟数据
              valueStyle={{ color: '#fff' }}
              prefix={<DownloadOutlined />}
            />
          </Col>
          <Col span={8}>
            <Statistic
              title="总内容数"
              value={(contentCount || 0) + Math.floor(Math.random() * 100) + 50} // 模拟数据
              valueStyle={{ color: '#fff' }}
              prefix={<ReloadOutlined />}
            />
          </Col>
        </Row>
      </div>

      {claimedContent ? (
        // 已领取内容展示
        <Card className="claim-content">
          <Title level={2} style={{ textAlign: 'center', marginBottom: '24px' }}>
            🎉 恭喜您获得精美内容！
          </Title>
          
          {/* 图片展示 */}
          <div className="claim-images">
            {claimedContent.images.map((imageUrl, index) => (
              <div key={index} style={{ position: 'relative' }}>
                <Image
                  src={imageUrl}
                  alt={`内容图片 ${index + 1}`}
                  className="claim-image"
                  preview={{
                    mask: <DownloadOutlined />,
                  }}
                />
                <Button
                  type="primary"
                  icon={<DownloadOutlined />}
                  size="small"
                  style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                  }}
                  onClick={() => handleDownloadImage(imageUrl)}
                />
              </div>
            ))}
          </div>

          {/* 文案内容 */}
          <div className="claim-caption">
            <Title level={4}>📝 文案内容：</Title>
            <Paragraph>{claimedContent.caption}</Paragraph>
            <Button
              type="primary"
              icon={<CopyOutlined />}
              onClick={handleCopyCaption}
              style={{ marginTop: '12px' }}
            >
              复制文案
            </Button>
          </div>

          {/* 操作按钮 */}
          <Space size="large" style={{ width: '100%', justifyContent: 'center' }}>
            <Button
              type="primary"
              size="large"
              icon={<DownloadOutlined />}
              onClick={handleDownloadAll}
            >
              下载所有图片
            </Button>
            <Button
              size="large"
              icon={<ReloadOutlined />}
              onClick={() => setClaimedContent(null)}
            >
              继续领取
            </Button>
          </Space>
        </Card>
      ) : (
        // 领取按钮
        <Card className="claim-content">
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <GiftOutlined style={{ fontSize: '4rem', color: '#1890ff', marginBottom: '24px' }} />
            <Title level={2}>小红书内容领取</Title>
            <Paragraph style={{ fontSize: '16px', color: '#666', marginBottom: '32px' }}>
              点击下方按钮随机领取一组精美的小红书内容，包含图片和文案
            </Paragraph>
            
            {contentCount === 0 ? (
              <div className="no-content">
                <div className="no-content-icon">📦</div>
                <Title level={3}>暂无内容</Title>
                <Paragraph>当前没有可领取的内容，请稍后再试</Paragraph>
              </div>
            ) : (
              <Button
                type="primary"
                size="large"
                icon={<GiftOutlined />}
                loading={claimMutation.isPending}
                onClick={handleClaim}
                style={{
                  height: '60px',
                  fontSize: '18px',
                  padding: '0 40px',
                  borderRadius: '30px',
                }}
              >
                立即领取内容
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* 使用说明 */}
      <Card style={{ marginTop: '24px' }}>
        <Title level={4}>📋 使用说明</Title>
        <ul style={{ textAlign: 'left', lineHeight: '1.8' }}>
          <li>每次只能领取一组内容，包含多张图片和对应文案</li>
          <li>领取后的内容会自动从系统中删除，确保唯一性</li>
          <li>支持图片预览、下载和文案一键复制功能</li>
          <li>同一IP地址10秒内只能领取一次，防止恶意刷取</li>
          <li>内容仅供个人学习使用，请勿用于商业用途</li>
        </ul>
      </Card>
    </div>
  )
}

export default UserClaim
