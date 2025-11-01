import React, { useState } from 'react'
import {
  Layout,
  Card,
  Button,
  Table,
  Modal,
  Form,
  Input,
  Upload,
  message,
  Space,
  Typography,
  Statistic,
  Image,
  Popconfirm,
  Tag,
  Divider,
} from 'antd'
import {
  PlusOutlined,
  UploadOutlined,
  DeleteOutlined,
  EyeOutlined,
  BarChartOutlined,
  LogoutOutlined,
  HomeOutlined,
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { contentAPI, uploadAPI } from '../services/api'
import { Content as ContentType } from '../types'
import './AdminDashboard.css'

const { Header, Content, Sider } = Layout
const { Title, Text } = Typography
const { TextArea } = Input

const AdminDashboard: React.FC = () => {
  const [isUploadModalVisible, setIsUploadModalVisible] = useState(false)
  const [uploadForm] = Form.useForm()
  const [selectedImages, setSelectedImages] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // 获取内容列表
  const { data: contents, isLoading: contentsLoading } = useQuery({
    queryKey: ['adminContents'],
    queryFn: () => contentAPI.getContents().then(res => res.data).catch(() => []),
    retry: false, // 禁用自动重试
  })

  // 获取统计信息
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['adminStats'],
    queryFn: () => contentAPI.getStats().then(res => res.data).catch(() => ({ total: 0, claimed: 0, unclaimed: 0 })),
    retry: false, // 禁用自动重试
  })

  // 删除内容
  const deleteMutation = useMutation({
    mutationFn: (id: string) => contentAPI.deleteContent(id),
    onSuccess: () => {
      message.success('内容删除成功')
      queryClient.invalidateQueries({ queryKey: ['adminContents'] })
      queryClient.invalidateQueries({ queryKey: ['adminStats'] })
    },
    onError: () => {
      message.error('删除失败')
    },
  })

  // 创建内容
  const createMutation = useMutation({
    mutationFn: (data: { images: string[]; caption: string }) =>
      contentAPI.createContent(data),
    onSuccess: () => {
      message.success('内容创建成功')
      setIsUploadModalVisible(false)
      uploadForm.resetFields()
      setSelectedImages([])
      queryClient.invalidateQueries({ queryKey: ['adminContents'] })
      queryClient.invalidateQueries({ queryKey: ['adminStats'] })
    },
    onError: () => {
      message.error('创建失败')
    },
  })

  const handleLogout = () => {
    localStorage.removeItem('admin_token')
    navigate('/admin/login')
  }

  const handleImageUpload = async (file: File) => {
    try {
      setUploading(true)
      
      // 检查文件大小（5MB）
      if (file.size > 5 * 1024 * 1024) {
        message.error('图片大小不能超过5MB')
        return
      }

      const response = await uploadAPI.getPresignedUrl(file.name, file.type)
      
      if (!response.data) {
        throw new Error('服务器未返回有效的上传地址')
      }
      
      const { presignedUrl, url, useBase64 } = response.data
      
      // 如果后端返回 useBase64，使用 Base64 编码（临时方案）
      if (useBase64 || !presignedUrl) {
        // 转换为 Base64
        const reader = new FileReader()
        reader.onload = (e) => {
          const base64String = e.target?.result as string
          setSelectedImages(prev => [...prev, base64String])
          message.success('图片上传成功（使用 Base64 编码）')
          setUploading(false)
        }
        reader.onerror = () => {
          message.error('图片读取失败')
          setUploading(false)
        }
        reader.readAsDataURL(file)
        return
      }
      
      if (!presignedUrl || !url) {
        throw new Error('上传地址格式不正确')
      }
      
      // 上传到S3
      const uploadResponse = await fetch(presignedUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      })

      if (!uploadResponse.ok) {
        throw new Error(`上传失败: ${uploadResponse.status} ${uploadResponse.statusText}`)
      }

      setSelectedImages(prev => [...prev, url])
      message.success('图片上传成功')
    } catch (error: any) {
      console.error('图片上传错误:', error)
      const errorMessage = error.response?.data?.message || error.message || '图片上传失败'
      message.error(errorMessage)
    } finally {
      setUploading(false)
    }
  }

  const handleRemoveImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = (values: { caption: string }) => {
    if (selectedImages.length === 0) {
      message.warning('请至少上传一张图片')
      return
    }
    createMutation.mutate({
      images: selectedImages,
      caption: values.caption,
    })
  }

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 100,
      render: (id: string) => <Text code>{id.slice(0, 8)}...</Text>,
    },
    {
      title: '图片',
      dataIndex: 'images',
      key: 'images',
      width: 120,
      render: (images: string[]) => (
        <Image.PreviewGroup>
          <Space>
            {images.slice(0, 3).map((image, index) => (
              <Image
                key={index}
                src={image}
                width={40}
                height={40}
                style={{ objectFit: 'cover', borderRadius: 4 }}
              />
            ))}
            {images.length > 3 && <Text>+{images.length - 3}</Text>}
          </Space>
        </Image.PreviewGroup>
      ),
    },
    {
      title: '文案',
      dataIndex: 'caption',
      key: 'caption',
      ellipsis: true,
      render: (caption: string) => (
        <Text ellipsis={{ tooltip: caption }} style={{ maxWidth: 200 }}>
          {caption}
        </Text>
      ),
    },
    {
      title: '状态',
      dataIndex: 'isClaimed',
      key: 'isClaimed',
      width: 100,
      render: (isClaimed: boolean) => (
        <Tag color={isClaimed ? 'red' : 'green'}>
          {isClaimed ? '已领取' : '未领取'}
        </Tag>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      render: (date: string) => new Date(date).toLocaleString(),
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_: unknown, record: ContentType) => (
        <Space>
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => {
              Modal.info({
                title: '内容详情',
                content: (
                  <div>
                    <div style={{ marginBottom: 16 }}>
                      <Text strong>图片：</Text>
                      <Image.PreviewGroup>
                        <Space wrap>
                          {record.images.map((image, index) => (
                            <Image
                              key={index}
                              src={image}
                              width={100}
                              height={100}
                              style={{ objectFit: 'cover', borderRadius: 4 }}
                            />
                          ))}
                        </Space>
                      </Image.PreviewGroup>
                    </div>
                    <div>
                      <Text strong>文案：</Text>
                      <div style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>
                        {record.caption}
                      </div>
                    </div>
                  </div>
                ),
                width: 600,
              })
            }}
          />
          <Popconfirm
            title="确定要删除这个内容吗？"
            onConfirm={() => deleteMutation.mutate(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header className="admin-header">
        <div className="header-content">
          <Title level={3} style={{ color: 'white', margin: 0 }}>
            小红书内容分发平台 - 管理后台
          </Title>
          <Space>
            <Button
              type="text"
              icon={<HomeOutlined />}
              style={{ color: 'white' }}
              onClick={() => navigate('/')}
            >
              前台
            </Button>
            <Button
              type="text"
              icon={<LogoutOutlined />}
              style={{ color: 'white' }}
              onClick={handleLogout}
            >
              退出
            </Button>
          </Space>
        </div>
      </Header>

      <Layout>
        <Sider width={300} className="admin-sider">
          <Card title="📊 统计信息" className="stats-card">
            {statsLoading ? (
              <div>加载中...</div>
            ) : (
              <div>
                <Statistic
                  title="总内容数"
                  value={stats?.total || 0}
                  valueStyle={{ color: '#1890ff' }}
                />
                <Divider />
                <Statistic
                  title="已领取"
                  value={stats?.claimed || 0}
                  valueStyle={{ color: '#52c41a' }}
                />
                <Divider />
                <Statistic
                  title="未领取"
                  value={stats?.unclaimed || 0}
                  valueStyle={{ color: '#faad14' }}
                />
              </div>
            )}
          </Card>

          <Card title="📝 快速操作" className="action-card">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                block
                onClick={() => setIsUploadModalVisible(true)}
              >
                上传新内容
              </Button>
              <Button
                icon={<BarChartOutlined />}
                block
                onClick={() => queryClient.invalidateQueries({ queryKey: ['adminStats'] })}
              >
                刷新统计
              </Button>
            </Space>
          </Card>
        </Sider>

        <Content className="admin-content">
          <Card title="📋 内容列表" className="content-list-card">
            <Table
              columns={columns}
              dataSource={contents}
              loading={contentsLoading}
              rowKey="id"
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total) => `共 ${total} 条记录`,
              }}
            />
          </Card>
        </Content>
      </Layout>

      {/* 上传内容模态框 */}
      <Modal
        title="上传新内容"
        open={isUploadModalVisible}
        onCancel={() => {
          setIsUploadModalVisible(false)
          uploadForm.resetFields()
          setSelectedImages([])
        }}
        footer={null}
        width={800}
      >
        <Form form={uploadForm} onFinish={handleSubmit} layout="vertical">
          <Form.Item label="图片上传">
            <Upload
              listType="picture-card"
              beforeUpload={(file) => {
                if (file.size > 5 * 1024 * 1024) {
                  message.error('图片大小不能超过5MB')
                  return false
                }
                if (selectedImages.length >= 9) {
                  message.error('最多只能上传9张图片')
                  return false
                }
                handleImageUpload(file)
                return false
              }}
              fileList={[]}
              disabled={uploading}
            >
              {selectedImages.length >= 9 ? null : (
                <div>
                  <UploadOutlined />
                  <div style={{ marginTop: 8 }}>上传图片</div>
                </div>
              )}
            </Upload>
            <div style={{ marginTop: 8, color: '#666' }}>
              最多上传9张图片，单张图片不超过5MB
            </div>
          </Form.Item>

          {selectedImages.length > 0 && (
            <Form.Item label="已上传图片">
              <div className="image-preview">
                {selectedImages.map((image, index) => (
                  <div key={index} className="image-preview-item">
                    <Image
                      src={image}
                      alt={`预览 ${index + 1}`}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      className="remove-btn"
                      onClick={() => handleRemoveImage(index)}
                    />
                  </div>
                ))}
              </div>
            </Form.Item>
          )}

          <Form.Item
            name="caption"
            label="文案内容"
            rules={[{ required: true, message: '请输入文案内容' }]}
          >
            <TextArea
              rows={6}
              placeholder="请输入文案内容..."
              maxLength={2000}
              showCount
            />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                loading={createMutation.isPending}
              >
                创建内容
              </Button>
              <Button
                onClick={() => {
                  setIsUploadModalVisible(false)
                  uploadForm.resetFields()
                  setSelectedImages([])
                }}
              >
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  )
}

export default AdminDashboard
