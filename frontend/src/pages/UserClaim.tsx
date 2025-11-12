import React, { useState, useMemo, useEffect } from 'react'
import { Button, Card, Image, message, Spin, Typography, Statistic, Row, Col } from 'antd'
import { CopyOutlined, GiftOutlined, ReloadOutlined, DownloadOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { contentAPI } from '../services/api'
import { Content } from '../types'
import copy from 'copy-to-clipboard'
import './UserClaim.css'

const { Title, Paragraph } = Typography

const UserClaim: React.FC = () => {
  const [claimedContent, setClaimedContent] = useState<Content | null>(null)
  const [, setLoadedImagesCount] = useState(0) // 使用函数式更新，不需要读取当前值
  const [hasConfirmedDelete, setHasConfirmedDelete] = useState(false)
  const [downloadingIndex, setDownloadingIndex] = useState<number | null>(null)
  const queryClient = useQueryClient()
  const isAndroid = useMemo(
    () => typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent),
    []
  )

  const handleDownloadImage = async (imageUrl: string, index: number) => {
    if (!imageUrl) {
      return
    }

    try {
      setDownloadingIndex(index)
      const response = await fetch(imageUrl, { mode: 'cors' })

      if (!response.ok) {
        throw new Error(`Failed to download image: ${response.status}`)
      }

      const blob = await response.blob()
      const blobUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      const urlParts = imageUrl.split('.')
      const extension = urlParts.length > 1 ? urlParts[urlParts.length - 1].split('?')[0] : 'jpg'
      const fileName = `content-${claimedContent?.id || 'image'}-${index + 1}.${extension}`

      link.href = blobUrl
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(blobUrl)
      message.success('图片已开始下载')
    } catch (error) {
      console.error('下载图片失败:', error)
      message.error('下载失败，请稍后再试')
    } finally {
      setTimeout(() => {
        setDownloadingIndex(null)
      }, 300)
    }
  }


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
      setLoadedImagesCount(0) // 重置加载计数
      setHasConfirmedDelete(false) // 重置确认删除标志
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

  // 确认已领取（图片加载完成后自动调用，删除数据库和S3图片）
  const confirmClaimedMutation = useMutation({
    mutationFn: (contentId: string) => {
      // 前端验证：确保 contentId 有效
      if (!contentId || typeof contentId !== 'string' || contentId.trim() === '') {
        console.warn('⚠️ 尝试确认删除时 contentId 无效:', contentId)
        throw new Error('contentId 无效')
      }
      return contentAPI.confirmClaimed(contentId)
    },
    onSuccess: () => {
      console.log('✅ 内容已确认删除（数据库和S3图片）')
      queryClient.invalidateQueries({ queryKey: ['contentCount'] })
    },
    onError: (error: any) => {
      // 静默处理错误，不影响用户体验
      console.warn('确认删除失败:', error)
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

  const handleCopyTitle = () => {
    if (claimedContent?.title) {
      copy(claimedContent.title)
      message.success('标题已复制到剪贴板')
    }
  }

  // 图片加载完成后的处理（自动确认删除）
  const handleImageLoad = () => {
    if (!claimedContent?.id || hasConfirmedDelete) {
      return
    }

    setLoadedImagesCount(prev => {
      const newCount = prev + 1
      const totalImages = claimedContent.images?.length || 0
      
      // 当所有图片都加载完成后，确认删除
      if (newCount >= totalImages && totalImages > 0) {
        setHasConfirmedDelete(true)
        // 使用 setTimeout 确保用户能看到图片后再删除
        setTimeout(() => {
          confirmClaimedMutation.mutate(claimedContent.id)
        }, 2000) // 延迟2秒，确保用户能看到图片
      }
      
      return newCount
    })
  }

  // 继续领取：清空状态（图片已在加载完成后自动删除）
  const handleContinueClaim = () => {
    setClaimedContent(null)
    setLoadedImagesCount(0)
    setHasConfirmedDelete(false)
  }

  // 页面卸载时，如果还有已领取的内容，确认删除
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (claimedContent?.id) {
        // 使用 sendBeacon 确保请求能发送（即使页面正在关闭）
        const apiUrl = `${import.meta.env.VITE_API_BASE_URL || '/api'}/content/confirm-claimed`
        navigator.sendBeacon(
          apiUrl,
          JSON.stringify({ contentId: claimedContent.id })
        )
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      // 组件卸载时也尝试确认删除
      if (claimedContent?.id) {
        confirmClaimedMutation.mutate(claimedContent.id)
      }
    }
  }, [claimedContent])


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
              prefix={<GiftOutlined />}
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
              <div className="claim-image-wrapper" key={index}>
                <Image
                  src={imageUrl}
                  alt={`内容图片 ${index + 1}`}
                  className="claim-image"
                  preview={true}
                  onLoad={handleImageLoad}
                  placeholder={
                    <div
                      style={{
                        width: '100%',
                        height: '200px',
                        background: '#f0f0f0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '8px',
                      }}
                    >
                      <Spin />
                    </div>
                  }
                />
                {isAndroid && (
                  <div className="download-actions">
                    <Button
                      type="primary"
                      icon={<DownloadOutlined />}
                      block
                      loading={downloadingIndex === index}
                      onClick={() => handleDownloadImage(imageUrl, index)}
                    >
                      安卓下载
                    </Button>
                    <span className="download-hint">下载功能仅限安卓用户使用</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* 标题内容 */}
          {claimedContent.title && (
            <div className="claim-title" style={{ marginBottom: '24px' }}>
              <Title level={4}>📌 标题内容：</Title>
              <Title level={3} style={{ marginTop: '8px', marginBottom: 0 }}>
                {claimedContent.title}
              </Title>
              <Button
                type="primary"
                icon={<CopyOutlined />}
                onClick={handleCopyTitle}
                style={{ marginTop: '12px' }}
              >
                复制标题
              </Button>
            </div>
          )}

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
          <div style={{ textAlign: 'center', marginTop: '24px' }}>
            <Button
              size="large"
              icon={<ReloadOutlined />}
              onClick={handleContinueClaim}
            >
              继续领取
            </Button>
          </div>
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
          <li>点击图片可以放大预览；安卓用户请使用图片下方的下载按钮保存</li>
          <li>支持标题和文案一键复制功能</li>
          <li>同一IP地址10秒内只能领取一次，防止恶意刷取</li>
          <li>内容仅供个人学习使用，请勿用于商业用途</li>
        </ul>
      </Card>
    </div>
  )
}

export default UserClaim
