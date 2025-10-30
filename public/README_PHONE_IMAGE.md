# 手机图片说明

为了使PhoneShowcase组件正常工作，请将手机图片添加到此文件夹中，并命名为`phone-image.png`。

## 图片要求

- 文件名：`phone-image.png`（也可以是jpg或其他格式，但需要在Root.tsx中修改对应的phoneImage属性）
- 建议尺寸：至少1000px高，透明背景效果最佳
- 图片内容：手机正面或侧面视图，最好是高质量产品图

## 示例

可以使用OPPO Find X8 Ultra的官方产品图，或其他您想要展示的手机产品图。

## 如何使用其他图片

如果您想使用其他图片或文件名，请修改`Root.tsx`文件中的PhoneShowcase组件配置：

```tsx
<Composition
  id="PhoneShowcase"
  component={PhoneShowcase}
  // ...其他配置...
  defaultProps={{
    // ...其他属性...
    phoneImage: "/您的图片文件名.png", // 修改为您的图片文件名
    // ...其他属性...
  }}
/>
```

确保图片放在public文件夹中，并且路径正确。 