import React, { useState, useRef } from 'react'
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
  BugOutlined,
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
  const [isConfigTestModalVisible, setIsConfigTestModalVisible] = useState(false)
  const [configTestResult, setConfigTestResult] = useState<any>(null)
  const [configTestLoading, setConfigTestLoading] = useState(false)
  const [uploadForm] = Form.useForm()
  const [selectedImages, setSelectedImages] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const processedFilesRef = useRef<Set<string>>(new Set())
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

  // 批量删除内容
  const batchDeleteMutation = useMutation({
    mutationFn: (ids: string[]) => contentAPI.batchDeleteContent(ids),
    onSuccess: () => {
      message.success(`成功删除 ${selectedRowKeys.length} 条内容`)
      setSelectedRowKeys([])
      queryClient.invalidateQueries({ queryKey: ['adminContents'] })
      queryClient.invalidateQueries({ queryKey: ['adminStats'] })
    },
    onError: () => {
      message.error('批量删除失败')
    },
  })

  // 创建内容
  const createMutation = useMutation({
    mutationFn: (data: { images: string[]; title?: string; caption: string }) =>
      contentAPI.createContent(data),
    onSuccess: () => {
      message.success('内容创建成功')
      setIsUploadModalVisible(false)
      uploadForm.resetFields()
      setSelectedImages([])
      processedFilesRef.current.clear()
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

  // 批量上传图片
  const handleBatchImageUpload = async (fileList: File[]) => {
    try {
      setUploading(true)
      
      // 检查总数限制
      const remainingSlots = 9 - selectedImages.length
      if (fileList.length > remainingSlots) {
        message.warning(`最多只能上传9张图片，已选择 ${selectedImages.length} 张，还可以上传 ${remainingSlots} 张`)
        return
      }

      // 检查每张图片大小
      const invalidFiles = fileList.filter(file => file.size > 5 * 1024 * 1024)
      if (invalidFiles.length > 0) {
        message.error(`有 ${invalidFiles.length} 张图片超过5MB限制`)
        return
      }

      // 批量处理上传
      const uploadPromises = fileList.map(async (file) => {
        const response = await uploadAPI.getPresignedUrl(file.name, file.type)
        
        if (!response.data) {
          throw new Error('服务器未返回有效的上传地址')
        }
        
        const {
          presignedUrl,
          url,
          useBase64,
          expectedContentType,
        } = response.data
        
        // 如果后端返回 useBase64，使用 Base64 编码（临时方案）
        if (useBase64 || !presignedUrl) {
          return new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = (e) => {
              const base64String = e.target?.result as string
              resolve(base64String)
            }
            reader.onerror = () => reject(new Error('图片读取失败'))
            reader.readAsDataURL(file)
          })
        }
        
        if (!presignedUrl || !url) {
          throw new Error('上传地址格式不正确')
        }
        
        // 上传到 OSS（兼容 S3 旧逻辑）
        // 重要：预签名URL的签名是基于特定的请求头和参数生成的
        // 必须确保上传时的请求头与生成签名时一致
        
        // 解析预签名URL，提取关键信息
        const urlObj = new URL(presignedUrl);
        const urlParams = Object.fromEntries(urlObj.searchParams.entries());

        const sanitizedExpectedContentType =
          expectedContentType && expectedContentType !== 'undefined'
            ? expectedContentType
            : undefined;
        const signedContentType =
          sanitizedExpectedContentType || urlParams['Content-Type'] || undefined;

        console.log('📤 开始上传文件:', {
          filename: file.name,
          contentType: file.type,
          size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
          bucket: urlObj.hostname.split('.')[0],
          key: urlObj.pathname.substring(1),
          presignedUrlParams: {
            'X-Amz-Algorithm': urlParams['X-Amz-Algorithm'],
            'X-Amz-Credential': urlParams['X-Amz-Credential']?.substring(0, 20) + '...',
            'X-Amz-Date': urlParams['X-Amz-Date'],
            'X-Amz-Expires': urlParams['X-Amz-Expires'],
            'X-Amz-SignedHeaders': urlParams['X-Amz-SignedHeaders'],
            'Content-Type': signedContentType || '未指定',
          },
          timestamp: new Date().toISOString(),
        });

        const uploadStartTime = Date.now();
        
        // 检查 3: Content-Type 一致性验证
        if (signedContentType && file.type !== signedContentType) {
          console.error('❌ Content-Type 不匹配:', {
            前端上传时: file.type,
            预签名URL中: signedContentType,
            是否匹配: false,
          });
          throw new Error(
            `Content-Type 不匹配: 前端使用 "${file.type}"，但预签名 URL 期望 "${signedContentType}"。` +
            `请确保上传时的 Content-Type 与生成预签名 URL 时完全一致。`
          );
        } else if (!signedContentType) {
          console.log('ℹ️ 预签名 URL 未显式要求 Content-Type，将直接使用文件的类型', {
            fileType: file.type,
          });
        }
        
        // 检查 4: 准备请求头（只设置 Content-Type，不添加任何其他头）
        const effectiveContentType =
          file.type || signedContentType || 'application/octet-stream';
        const requestHeaders: HeadersInit = {
          'Content-Type': effectiveContentType,
        };
        
        // 验证请求头（确保没有额外的头）
        const headerKeys = Object.keys(requestHeaders);
        if (headerKeys.length !== 1 || headerKeys[0] !== 'Content-Type') {
          console.error('❌ 检测到额外的请求头:', headerKeys);
          throw new Error('上传时只能设置 Content-Type 请求头，不能添加其他请求头');
        }
        
        console.log('📋 请求详情:', {
          method: 'PUT',
          url: presignedUrl.substring(0, 150) + '...',
          headers: requestHeaders,
          bodySize: file.size,
          contentTypeMatch: signedContentType
            ? file.type === signedContentType
            : '未强制',
        });
        
        // 使用 fetch 直接上传（不使用 axios，避免自动添加请求头）
        const uploadResponse = await fetch(presignedUrl, {
          method: 'PUT',
          body: file,
          headers: requestHeaders,
          // 不发送credentials，避免添加额外的请求头（如 Cookie）
          credentials: 'omit',
          // 不设置 mode，使用默认值
        })

        const uploadDuration = Date.now() - uploadStartTime;
        
        // 记录响应头
        const responseHeaders: Record<string, string> = {};
        uploadResponse.headers.forEach((value, key) => {
          responseHeaders[key] = value;
        });

        if (!uploadResponse.ok) {
          const errorText = await uploadResponse.text().catch(() => '无法读取错误信息');
          console.error('❌ 上传失败 - 详细诊断:', {
            status: uploadResponse.status,
            statusText: uploadResponse.statusText,
            error: errorText,
            filename: file.name,
            contentType: file.type,
            expectedContentType: signedContentType,
            contentTypeMatch: signedContentType ? file.type === signedContentType : '未强制',
            size: file.size,
            duration: `${uploadDuration}ms`,
            requestHeaders,
            responseHeaders,
            presignedUrlParams: {
              'X-Amz-SignedHeaders': urlParams['X-Amz-SignedHeaders'],
              'Content-Type': signedContentType,
            },
            urlPreview: presignedUrl.substring(0, 150) + '...',
            timestamp: new Date().toISOString(),
          });
          
          // 如果是403错误，提供更详细的诊断建议
          if (uploadResponse.status === 403) {
            const contentTypeMatch = signedContentType
              ? file.type === signedContentType
              : '未强制';
            const expires = parseInt(urlParams['X-Amz-Expires'] || '0', 10);
            const isExpired = expires <= 0;
            
            // 分析最可能的原因
            const diagnosis = {
              '可能原因1: Content-Type 不匹配': {
                status: contentTypeMatch ? '✅ 已排除' : '❌ 可能',
                details: {
                  '当前ContentType': file.type,
                  '预签名URL中的ContentType': signedContentType || '未强制',
                  '是否匹配': contentTypeMatch,
                },
              },
              '可能原因2: IAM权限不足': {
                status: '✅ 已排除（用户已检查）',
                details: {
                  '需要权限': 'oss:PutObject',
                  '建议': '如果已确认 RAM 权限正确，请检查 Bucket 策略',
                },
              },
              '可能原因3: 存储桶策略限制': {
                status: '⚠️ 最可能的原因',
                details: {
                  '问题': 'Bucket 策略可能只允许 oss:GetObject（读取），不允许 oss:PutObject（上传）',
                  '检查方法': '1. 登录阿里云控制台\n2. 打开 OSS 服务\n3. 选择对应 Bucket\n4. 在「权限管理/策略管理」中确认已授予 oss:PutObject\n5. 确保 RAM 用户具备写入权限',
                  '修复建议': '在 OSS Bucket 策略或 RAM 权限中添加 oss:PutObject，或为临时角色授予写入权限',
                  '详细文档': '查看 docs/OSS_DETAILED_CONFIG_GUIDE.md',
                },
              },
              '可能原因4: 预签名URL已过期': {
                status: isExpired ? '❌ 可能' : '✅ 已排除（用户已检查）',
                details: {
                  'X-Amz-Expires': urlParams['X-Amz-Expires'],
                  '是否过期': isExpired,
                },
              },
            };
            
            console.error('🔍 403 Forbidden 详细诊断:', diagnosis);
            console.error('💡 重点检查: Bucket 策略是否包含 oss:PutObject 权限');
            console.error('📖 修复指南: 查看项目中的 docs/BUCKET_POLICY_FIX.md 文件');
            
            // 在控制台显示醒目的提示
            console.error(
              '%c⚠️ 存储桶策略问题诊断',
              'color: red; font-size: 16px; font-weight: bold;'
            );
            console.error(
              '%c如果已排除 IAM 权限和 URL 过期问题，最可能的原因是存储桶策略限制。',
              'color: orange; font-size: 14px;'
            );
            console.error(
              '%c请检查阿里云 OSS 控制台中的权限配置，确保包含 oss:PutObject（或相应写入权限）。',
              'color: orange; font-size: 14px;'
            );
          }
          
          throw new Error(`上传失败: ${uploadResponse.status} ${uploadResponse.statusText}`)
        }

        console.log('✅ 上传成功:', {
          url,
          filename: file.name,
          size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
          duration: `${uploadDuration}ms`,
          timestamp: new Date().toISOString(),
        });

        return url
      })

      const uploadedUrls = await Promise.all(uploadPromises)
      setSelectedImages(prev => [...prev, ...uploadedUrls])
      message.success(`成功上传 ${uploadedUrls.length} 张图片`)
    } catch (error: any) {
      console.error('批量图片上传错误:', error)
      const errorMessage = error.response?.data?.message || error.message || '图片上传失败'
      message.error(errorMessage)
    } finally {
      setUploading(false)
    }
  }

  // 单个图片上传（保持向后兼容，暂时未使用）
  // const handleImageUpload = async (file: File) => {
  //   await handleBatchImageUpload([file])
  // }

  const handleRemoveImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = (values: { title?: string; caption: string }) => {
    if (selectedImages.length === 0) {
      message.warning('请至少上传一张图片')
      return
    }
    createMutation.mutate({
      images: selectedImages,
      title: values.title?.trim() || undefined,
      caption: values.caption,
    })
  }

  // 处理批量删除
  const handleBatchDelete = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请至少选择一条要删除的内容')
      return
    }

    Modal.confirm({
      title: '确认批量删除',
      content: `确定要删除选中的 ${selectedRowKeys.length} 条内容吗？此操作不可恢复！`,
      okText: '确定删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => {
        batchDeleteMutation.mutate(selectedRowKeys as string[])
      },
    })
  }

  // 测试 OSS 配置
  const handleTestConfig = async () => {
    setConfigTestLoading(true)
    setConfigTestResult(null)
    setIsConfigTestModalVisible(true)
    
    try {
      console.log('🔍 开始诊断 OSS 配置...')
      const response = await uploadAPI.testConfig()
      setConfigTestResult(response.data)
      console.log('✅ OSS 配置诊断结果:', response.data)
      message.success('配置测试完成，请查看控制台获取详细信息')
    } catch (error: any) {
      console.error('❌ OSS 配置诊断失败:', error)
      setConfigTestResult({
        error: true,
        message: error.response?.data?.message || error.message || '测试失败',
      })
      message.error('配置测试失败')
    } finally {
      setConfigTestLoading(false)
    }
  }

  // 快速诊断（无需打开弹窗）
  const handleQuickDiagnose = async () => {
    try {
      console.log('🔍 开始快速诊断...')
      const response = await uploadAPI.diagnose()
      console.log('✅ 诊断结果:', response.data)
      message.success('诊断完成，请查看控制台')
    } catch (error: any) {
      console.error('❌ 诊断失败:', error)
      message.error('诊断失败，请查看控制台')
    }
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
                loading="lazy"
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
                    {record.title && (
                      <div style={{ marginBottom: 16 }}>
                        <Text strong>标题：</Text>
                        <div style={{ marginTop: 8, fontSize: '16px', fontWeight: 'bold' }}>
                          {record.title}
                        </div>
                      </div>
                    )}
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
              <Button
                icon={<BugOutlined />}
                block
                onClick={handleTestConfig}
              >
                测试 OSS 配置
              </Button>
              <Button
                type="dashed"
                block
                onClick={handleQuickDiagnose}
                style={{ marginTop: 8 }}
              >
                快速诊断（控制台）
              </Button>
            </Space>
          </Card>
        </Sider>

        <Content className="admin-content">
          <Card 
            title="📋 内容列表" 
            className="content-list-card"
          >
            {/* 批量操作栏 */}
            {selectedRowKeys.length > 0 && (
              <div style={{ 
                marginBottom: 16, 
                padding: 12, 
                background: '#fff7e6', 
                border: '1px solid #ffd591',
                borderRadius: 4,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{ color: '#d46b08', fontWeight: 500 }}>
                  已选择 <strong>{selectedRowKeys.length}</strong> 条内容
                </span>
                <Popconfirm
                  title={`确定要删除选中的 ${selectedRowKeys.length} 条内容吗？`}
                  description="此操作不可恢复，请谨慎操作！"
                  onConfirm={handleBatchDelete}
                  okText="确定删除"
                  cancelText="取消"
                  okType="danger"
                >
                  <Button
                    type="primary"
                    danger
                    icon={<DeleteOutlined />}
                    loading={batchDeleteMutation.isPending}
                  >
                    批量删除 ({selectedRowKeys.length})
                  </Button>
                </Popconfirm>
              </div>
            )}
            
            <Table
              columns={columns}
              dataSource={contents}
              loading={contentsLoading}
              rowKey="id"
              rowSelection={{
                selectedRowKeys,
                onChange: setSelectedRowKeys,
                onSelectAll: (selected, selectedRows) => {
                  if (selected) {
                    const allKeys = selectedRows.map(row => row.id)
                    setSelectedRowKeys(allKeys)
                  } else {
                    setSelectedRowKeys([])
                  }
                },
              }}
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
          processedFilesRef.current.clear()
        }}
        footer={null}
        width={800}
      >
        <Form form={uploadForm} onFinish={handleSubmit} layout="vertical">
          <Form.Item label="图片上传（支持批量选择）">
            <Upload
              listType="picture-card"
              multiple
              accept="image/*"
              beforeUpload={(file) => {
                // 检查单个文件大小
                if (file.size > 5 * 1024 * 1024) {
                  message.error('图片大小不能超过5MB')
                  return false
                }
                
                // 检查总数限制
                if (selectedImages.length >= 9) {
                  message.error('最多只能上传9张图片')
                  return false
                }
                
                // 阻止自动上传，由 onChange 统一处理
                return false
              }}
              fileList={[]}
              disabled={uploading || selectedImages.length >= 9}
              onChange={(info) => {
                // 只处理文件选择完成后的批量上传
                if (info.file.status === 'removed' || uploading) {
                  return
                }
                
                // 获取所有新选择的文件（过滤已处理的）
                const newFiles: File[] = []
                for (const item of info.fileList) {
                  if (!item.originFileObj) continue
                  const file = item.originFileObj as File
                  const fileKey = `${file.name}-${file.size}-${file.lastModified}`
                  if (processedFilesRef.current.has(fileKey)) {
                    continue
                  }
                  processedFilesRef.current.add(fileKey)
                  newFiles.push(file)
                }
                
                if (newFiles.length > 0) {
                  const remainingSlots = 9 - selectedImages.length
                  const filesToUpload = newFiles.slice(0, remainingSlots)
                  
                  if (filesToUpload.length > 0) {
                    handleBatchImageUpload(filesToUpload)
                  }
                }
              }}
            >
              {selectedImages.length >= 9 ? null : (
                <div>
                  <UploadOutlined />
                  <div style={{ marginTop: 8 }}>批量上传</div>
                </div>
              )}
            </Upload>
            <div style={{ marginTop: 8, color: '#666' }}>
              支持一次选择多张图片，最多上传9张，单张图片不超过5MB
              {selectedImages.length > 0 && (
                <span style={{ color: '#1890ff', marginLeft: 8 }}>
                  已选择 {selectedImages.length}/9 张
                </span>
              )}
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
            name="title"
            label="标题内容"
            rules={[{ max: 100, message: '标题长度不能超过100个字符' }]}
          >
            <Input
              placeholder="请输入标题内容（可选）..."
              maxLength={100}
              showCount
            />
          </Form.Item>

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

      {/* OSS 配置测试模态框 */}
      <Modal
        title="🔍 OSS 配置诊断"
        open={isConfigTestModalVisible}
        onCancel={() => setIsConfigTestModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setIsConfigTestModalVisible(false)}>
            关闭
          </Button>,
          <Button key="retry" type="primary" onClick={handleTestConfig} loading={configTestLoading}>
            重新测试
          </Button>,
        ]}
        width={800}
      >
        {configTestLoading ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Space direction="vertical" size="large">
              <div>正在测试 OSS 配置...</div>
            </Space>
          </div>
        ) : configTestResult ? (
          <div>
            {configTestResult.error ? (
              <div style={{ color: '#ff4d4f', marginBottom: 16 }}>
                <Text strong>❌ 测试失败：</Text>
                <div style={{ marginTop: 8 }}>{configTestResult.message}</div>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: 16 }}>
                  <Text strong>{configTestResult.message}</Text>
                </div>
                
                <Card title="配置信息" size="small" style={{ marginBottom: 16 }}>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <div>
                      <Text strong>访问密钥 ID：</Text>{' '}
                      {configTestResult.config?.hasAccessKeyId ? (
                        <Tag color="green">✅ 已配置</Tag>
                      ) : (
                        <Tag color="red">❌ 未配置</Tag>
                      )}
                      {configTestResult.config?.accessKeyIdPreview && (
                        <Text code style={{ marginLeft: 8 }}>
                          {configTestResult.config.accessKeyIdPreview}
                        </Text>
                      )}
                    </div>
                    <div>
                      <Text strong>密钥：</Text>{' '}
                      {configTestResult.config?.hasAccessKeySecret ? (
                        <Tag color="green">✅ 已配置</Tag>
                      ) : (
                        <Tag color="red">❌ 未配置</Tag>
                      )}
                    </div>
                    <div>
                      <Text strong>区域：</Text>{' '}
                      <Text code>{configTestResult.config?.region || '未配置'}</Text>
                    </div>
                    <div>
                      <Text strong>存储桶：</Text>{' '}
                      <Text code>{configTestResult.config?.bucket || '未配置'}</Text>
                    </div>
                    <div>
                      <Text strong>OSS 客户端：</Text>{' '}
                      {configTestResult.config?.ossInitialized ? (
                        <Tag color="green">✅ 已初始化</Tag>
                      ) : (
                        <Tag color="red">❌ 未初始化</Tag>
                      )}
                    </div>
                    {configTestResult.config?.bucketAccess && (
                      <div>
                        <Text strong>存储桶访问：</Text>{' '}
                        <div style={{ marginTop: 4 }}>
                          {configTestResult.config.bucketAccess.includes('✅') ? (
                            <Tag color="green">{configTestResult.config.bucketAccess}</Tag>
                          ) : configTestResult.config.bucketAccess.includes('⚠️') ? (
                            <Tag color="orange">{configTestResult.config.bucketAccess}</Tag>
                          ) : (
                            <Tag color="red">{configTestResult.config.bucketAccess}</Tag>
                          )}
                        </div>
                        {configTestResult.config?.note && (
                          <div style={{ marginTop: 8, padding: 8, background: '#fff7e6', borderRadius: 4 }}>
                            <Text type="secondary">{configTestResult.config.note}</Text>
                          </div>
                        )}
                      </div>
                    )}
                    {configTestResult.config?.presignedUrlTest && (
                      <div>
                        <Text strong>预签名 URL 测试：</Text>{' '}
                        <div style={{ marginTop: 4 }}>
                          {configTestResult.config.presignedUrlTest.includes('✅') ? (
                            <Tag color="green">{configTestResult.config.presignedUrlTest}</Tag>
                          ) : (
                            <Tag color="red">{configTestResult.config.presignedUrlTest}</Tag>
                          )}
                        </div>
                      </div>
                    )}
                  </Space>
                </Card>

                {configTestResult.recommendations && configTestResult.recommendations.length > 0 && (
                  <Card title="修复建议" size="small">
                    <Space direction="vertical" style={{ width: '100%' }}>
                      {configTestResult.recommendations.map((rec: string, index: number) => (
                        <div key={index} style={{ 
                          padding: '4px 0',
                          color: rec.includes('❌') ? '#ff4d4f' : rec.includes('⚠️') ? '#faad14' : '#52c41a'
                        }}>
                          {rec}
                        </div>
                      ))}
                    </Space>
                  </Card>
                )}
              </>
            )}
          </div>
        ) : null}
      </Modal>
    </Layout>
  )
}

export default AdminDashboard
