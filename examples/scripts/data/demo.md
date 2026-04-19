# YOLO (You Only Look Once) v1

## 概述

**YOLO v1** 是由 Joseph Redmon 等人在 2016 年提出的一种开创性的实时目标检测方法。其核心创新在于将目标检测视为一个统一的回归问题，使用单个卷积神经网络直接从完整图像中同时预测边界框坐标和类别概率，相比于当时的两阶段检测器大幅提升了检测速度。

## 参考资源

- **原始论文 (arXiv, 2016)**：<https://doi.org/10.48550/arXiv.1506.02640>
- **CVPR 2016 演讲视频**：<https://youtu.be/NM6lrxy0bxs?si=mwIs9dEvl15V-s3Z>
- **PR12 论文解读**：<https://www.slideshare.net/slideshow/pr12-you-only-look-once-yolo-unified-realtime-object-detection/76999106>
- **中文讲解视频**：<https://www.bilibili.com/video/BV15w411Z7LG/?p=3&share_source=copy_web&vd_source=537b4cbde2c10210c0436627da44aad7>



## 网络架构

![YOLO v1 网络结构](image.png)

- 输入：448x448x3
- 输出：7x7x30

### 网格划分与预测输出

YOLO v1 将输入图像均匀划分为 **7 × 7 = 49** 个网格单元。每个网格单元输出 30 个参数，具体构成如下：

$$\text{单元格输出} = \underbrace{2 \times 5}_{\text{2个边界框}} + \underbrace{20}_{\text{类别概率}} = 30$$

#### 边界框预测（Bounding Box Prediction）

每个网格单元格预测 **2 个边界框**，每个边界框包含 5 个参数：

- **$(x, y)$**：边界框中心点相对于所在网格单元的坐标（归一化到 [0, 1]）
- **$(w, h)$**：边界框的宽度和高度（相对于整个图像的比例）
- **$c$**：置信度分数（Confidence Score），表示边界框内存在物体的概率，范围 [0, 1]

![Bounding boxes + confidence](image-5.png)

**预测的边界框总数**：$7 \times 7 \times 2 = 98$ 个

#### 类别概率预测（Class Probability）

每个网格单元格预测 **20 个类别的概率分布**（基于 Pascal VOC 数据集）。

![Class probability map](image-4.png)

### 预测的限制

- 由于每个网格单元只能预测一个物体，网络的最大检测数量被限制为 **49 个**
- 这种设计对于物体密集的场景存在显著限制

### 后处理（Post-processing）

在得到原始预测后，需要进行以下后处理步骤：

1. **置信度过滤**：移除置信度低于阈值的边界框
2. **非极大值抑制 (NMS)**：使用 IoU（交并比）阈值移除重叠的边界框，保留最优的预测结果



## 训练阶段

### 损失函数

YOLO v1 的损失函数包含三个主要部分：

$$\text{Loss} = \lambda_{\text{coord}} \cdot \text{L}_{\text{loc}} + \lambda_{\text{noobj}} \cdot \text{L}_{\text{noconf}} + \text{L}_{\text{class}} + \text{L}_{\text{conf}}$$

其中：
- **$\text{L}_{\text{loc}}$**：边界框坐标损失（SSE）
- **$\text{L}_{\text{conf}}$**：置信度损失
- **$\text{L}_{\text{noconf}}$**：不含物体的网格置信度损失
- **$\text{L}_{\text{class}}$**：分类损失
- **$\lambda_{\text{coord}}$, $\lambda_{\text{noobj}}$**：权重系数，用于平衡不同损失项

### 训练细节

**待补充**：学习率、优化器、数据增强等配置信息。


## 参考文献

[1] 杨建华, 李瑞峰. *YOLO 目标检测*. 人民邮电出版社, 2023.

[2] Redmon, J., Divvala, S., Girshick, R., & Farhadi, A. (2016). You Only Look Once: Unified, Real-Time Object Detection. *arXiv preprint arXiv:1506.02640*. <http://arxiv.org/abs/1506.02640>
