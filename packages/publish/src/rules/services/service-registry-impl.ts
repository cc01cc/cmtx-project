/**
 * Service Registry 实现
 *
 * @module service-registry-impl
 * @description
 * ServiceRegistry 的具体实现，提供轻量级的服务注册和获取功能。
 */

import type { Service, ServiceRegistry } from "../service-registry.js";

/**
 * Service Registry 实现类
 */
export class ServiceRegistryImpl implements ServiceRegistry {
    private services = new Map<string, Service>();

    /**
     * 注册服务
     * @param service - 服务实例
     */
    register<T>(service: Service<T>): void {
        if (this.services.has(service.id)) {
            throw new Error(`Service with id '${service.id}' is already registered`);
        }
        this.services.set(service.id, service);
    }

    /**
     * 获取服务
     * @param id - 服务标识
     * @returns 服务实例或 undefined
     */
    get<T extends Service>(id: string): T | undefined {
        return this.services.get(id) as T | undefined;
    }

    /**
     * 检查服务是否存在
     * @param id - 服务标识
     */
    has(id: string): boolean {
        return this.services.has(id);
    }

    /**
     * 获取所有已注册的服务 ID
     */
    getAllIds(): string[] {
        return Array.from(this.services.keys());
    }

    /**
     * 初始化所有服务
     * 按注册顺序调用每个服务的 initialize 方法
     */
    async initializeAll(): Promise<void> {
        for (const service of this.services.values()) {
            if (service.initialize) {
                await service.initialize(undefined);
            }
        }
    }

    /**
     * 销毁所有服务
     * 按注册顺序调用每个服务的 dispose 方法
     */
    async disposeAll(): Promise<void> {
        for (const service of this.services.values()) {
            if (service.dispose) {
                await service.dispose();
            }
        }
    }

    /**
     * 清空所有服务
     */
    clear(): void {
        this.services.clear();
    }
}

/**
 * 创建 ServiceRegistry 实例
 * @returns ServiceRegistry 实例
 */
export function createServiceRegistry(): ServiceRegistry {
    return new ServiceRegistryImpl();
}
