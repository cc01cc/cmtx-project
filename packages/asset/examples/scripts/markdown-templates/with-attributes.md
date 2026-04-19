# 带属性的图片示例

## Markdown 图片 - 带 alt 和 title

![Logo](../assets/tiny-placeholder.png "Logo Image")

![Banner](../assets/small-swatch.jpg "Banner with Title")

## HTML 图片 - 各种属性组合

### 只有 src 和 alt

<img src="../assets/medium-figure.webp" alt="Basic Image">

### 带 title 属性

<img src="../assets/large-cover.png" alt="Cover" title="Cover Image Title">

### 带 style 属性

<img src="../assets/xl-hero.jpg" alt="Styled" style="max-width: 100%;">

### 带 width 和 height

<img src="../assets/tiny-placeholder.png" alt="Sized" width="100" height="100">

### 完整示例

<img
  src="../assets/xxl-banner.webp"
  alt="Complete"
  title="Complete Example with Multiple Attributes"
  width="800"
  style="border: 1px solid #ccc;"
/>

## 引用式图片 - 带 title

![Reference 1][ref1]
![Reference 2][ref2]
![Reference 3][ref3]

[ref1]: ../assets/medium-figure.webp "Reference with title"
[ref2]: ../assets/large-cover.png "Another reference"
[ref3]: ../assets/tiny-placeholder.png
