# 综合示例 - 各种图片格式完全覆盖

这个文件包含了支持的所有图片语法和属性的综合示例。

## 第一部分：Markdown 内联图片

### 基础内联图片

![Basic](../assets/tiny-placeholder.png)

### 带 title 的内联图片

![With Title](../assets/small-swatch.jpg "Small JPG")

### 没有 alt 文本的内联图片

![](../assets/medium-figure.webp)

## 第二部分：Markdown 引用式图片

### 单一引用

![Logo][logo]

### 多个引用

![Product][product]
![Feature][feature]
![Screenshot][screenshot]

## 第三部分：HTML img 标签

### 基础 HTML img

<img src="../assets/large-cover.png" alt="HTML Basic">

### 多行 HTML img

<img
  src="../assets/xl-hero.jpg"
  alt="HTML Multi-line"
  title="This is a multi-line HTML image tag"
/>

### 自闭合 HTML img

<img src="../assets/xxl-banner.webp" alt="Self-closing" />

### 单引号属性

<img src='../assets/tiny-placeholder.png' alt='Single Quotes' title='Using Single Quotes'>

### HTML 带 style 和 width

<img src="../assets/small-swatch.jpg" alt="Styled" width="200" style="border: 1px solid gray;">

## 第四部分：混合格式

在同一段落中混合使用：

这是一个 Markdown 图片 ![Inline][inline]，然后是 HTML 图片 <img src="../assets/medium-figure.webp" alt="HTML">.

还可以有 ![Another][another] 和 <img src="../assets/large-cover.png" alt="Another HTML">.

## 第五部分：各种大小的文件

小文件：![Tiny](../assets/tiny-placeholder.png)
中等文件：![Medium](../assets/medium-figure.webp)
较大文件：![Large](../assets/large-cover.png)

## 第六部分：错误处理示例

有效的文件：![Valid](../assets/small-swatch.jpg)

可能缺失的文件：![Maybe Missing](../assets/potentially-missing.png)

<img src="../assets/also-valid.jpg" alt="Valid HTML">

## 图片引用定义

所有引用式图片都在这里定义：

[logo]: ../assets/tiny-placeholder.png "Logo Image"
[product]: ../assets/small-swatch.jpg "Product Photo"
[feature]: ../assets/medium-figure.webp "Feature Screenshot"
[screenshot]: ../assets/large-cover.png "Full Screenshot"
[inline]: ../assets/xl-hero.jpg "Inline Reference"
[another]: ../assets/xxl-banner.webp "Another Reference"
