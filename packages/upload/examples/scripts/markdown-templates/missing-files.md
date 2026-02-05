# 包含缺失文件的图片示例

这个文件包含指向不存在的本地文件的图片引用，用于测试错误处理。

## 引用存在的文件（应该成功上传）

![Exists](../assets/tiny-placeholder.png)
![Also Exists](../assets/small-swatch.jpg)

## 引用不存在的本地文件（应该处理失败或警告）

这些图片文件在 assets 目录中不存在，用于测试错误处理：

![Missing 1](../assets/nonexistent-1.png)
![Missing 2](../assets/missing-image.jpg)
![Missing 3](./does-not-exist.webp)

## HTML 中的缺失文件

<img src="../assets/not-found.png" alt="Not Found">

## 混合存在和不存在

现有文件：
![Real](../assets/medium-figure.webp)

不存在的：
![Fake](../assets/fake.png)

现有文件：
![Real Again](../assets/large-cover.png)

## 注意

这个模板用于测试上传过程如何处理缺失的本地图片。
取决于配置，这些失败的图片可能会：
- 被记录为错误
- 被跳过处理
- 导致上传失败
