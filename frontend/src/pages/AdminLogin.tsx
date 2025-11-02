import React, { useState } from 'react'
import { Form, Input, Button, Card, message, Typography, Space } from 'antd'
import { UserOutlined, LockOutlined, LoginOutlined } from '@ant-design/icons'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { authAPI } from '../services/api'
import './AdminLogin.css'

const { Title, Text } = Typography

const AdminLogin: React.FC = () => {
  const [form] = Form.useForm()
  const navigate = useNavigate()
  const [isRegister, setIsRegister] = useState(false)

  const loginMutation = useMutation({
    mutationFn: async (data: { username: string; password: string }) => {
      try {
        const response = await authAPI.login(data.username, data.password)
        return response.data
      } catch (error: any) {
        // 捕获所有可能的错误，包括网络错误
        if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
          throw new Error('请求超时，请检查网络连接')
        } else if (!error.response) {
          throw new Error('无法连接到服务器，请检查后端服务是否正常运行')
        }
        throw error
      }
    },
    onSuccess: (data) => {
      if (data?.access_token) {
        localStorage.setItem('admin_token', data.access_token)
        message.success('登录成功！')
        navigate('/admin/dashboard')
      } else {
        message.error('登录失败：服务器返回的数据格式不正确')
      }
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || error.message || '登录失败，请检查用户名和密码'
      message.error(errorMessage)
      console.error('登录错误:', error)
    },
  })

  const registerMutation = useMutation({
    mutationFn: async (data: { username: string; password: string }) => {
      try {
        const response = await authAPI.register(data.username, data.password)
        return response.data
      } catch (error: any) {
        // 捕获所有可能的错误，包括网络错误
        if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
          throw new Error('请求超时，请检查网络连接')
        } else if (!error.response) {
          throw new Error('无法连接到服务器，请检查后端服务是否正常运行')
        }
        throw error
      }
    },
    onSuccess: () => {
      message.success('注册成功！请登录')
      setIsRegister(false)
      form.resetFields()
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || error.message || '注册失败'
      message.error(errorMessage)
      console.error('注册错误:', error)
    },
  })

  const handleSubmit = (values: { username: string; password: string }) => {
    if (isRegister) {
      registerMutation.mutate(values)
    } else {
      loginMutation.mutate(values)
    }
  }

  return (
    <div className="login-container">
      <Card className="login-card">
        <div className="login-header">
          <Title level={2} style={{ textAlign: 'center', marginBottom: '8px' }}>
            {isRegister ? '管理员注册' : '管理员登录'}
          </Title>
          <Text type="secondary" style={{ textAlign: 'center', display: 'block' }}>
            小红书内容分发平台管理系统
          </Text>
        </div>

        <Form
          form={form}
          name="login"
          onFinish={handleSubmit}
          layout="vertical"
          size="large"
        >
          <Form.Item
            name="username"
            label="用户名"
            rules={[
              { required: true, message: '请输入用户名' },
              { min: 3, message: '用户名至少3个字符' },
            ]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="请输入用户名"
            />
          </Form.Item>

          <Form.Item
            name="password"
            label="密码"
            rules={[
              { required: true, message: '请输入密码' },
              { min: 6, message: '密码至少6个字符' },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="请输入密码"
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              block
              loading={loginMutation.isPending || registerMutation.isPending}
              icon={<LoginOutlined />}
            >
              {isRegister ? '注册' : '登录'}
            </Button>
          </Form.Item>
        </Form>

        <div className="login-footer">
          <Space>
            <Text type="secondary">
              {isRegister ? '已有账号？' : '没有账号？'}
            </Text>
            <Button
              type="link"
              onClick={() => {
                setIsRegister(!isRegister)
                form.resetFields()
              }}
            >
              {isRegister ? '立即登录' : '立即注册'}
            </Button>
          </Space>
        </div>

        <div className="login-tips">
          <Text type="secondary" style={{ fontSize: '12px' }}>
            💡 提示：首次使用请先注册管理员账号
          </Text>
        </div>
      </Card>
    </div>
  )
}

export default AdminLogin
