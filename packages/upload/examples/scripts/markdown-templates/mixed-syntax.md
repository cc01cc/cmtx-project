# 混合图片语法示例

这个文件演示了多种图片语法混合使用的情况。

## 内联 Markdown 图片

![Inline](../assets/tiny-placeholder.png "内联图片")

## HTML img 标签

<img src="../assets/small-swatch.jpg" alt="HTML Image">

## 引用式 Markdown 图片

![Reference][ref-image]

## 带标题的内联图片

![With Title](../assets/medium-figure.webp "This is a title")

## 多行 HTML 图片

<img
  src="../assets/large-cover.png"
  alt="Multi-line HTML"
  title="多行 HTML 标签"
/>

## 单引号 HTML 属性

<img src='../assets/xl-hero.jpg' alt='Single Quotes'>

## 没有 alt 的图片

![](../assets/xxl-banner.webp)

<img src="../assets/tiny-placeholder.png">

## 图片定义

[ref-image]: ../assets/medium-figure.webp "参考式图片"
