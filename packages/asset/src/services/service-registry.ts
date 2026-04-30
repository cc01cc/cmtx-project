/**
 * Asset Service 服务注册表类型定义
 *
 * @module service-registry
 * @description
 * 提供服务基础接口，用于 Service 模式。
 */

/**
 * 服务基础接口
 * 所有服务必须实现此接口
 */
export interface Service<TConfig = unknown> {
    /** 服务唯一标识 */
    readonly id: string;

    /** 初始化（可选） */
    initialize?(config: TConfig): void | Promise<void>;

    /** 销毁（可选） */
    dispose?(): void | Promise<void>;
}
