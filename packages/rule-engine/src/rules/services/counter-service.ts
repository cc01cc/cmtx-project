import type {
    CounterService,
    CounterServiceConfig,
    CounterConfigMap,
} from "../service-registry.js";

interface CounterState {
    currentValue: number;
    step: number;
}

export class CounterServiceImpl implements CounterService {
    readonly id = "counter" as const;

    private counters: Map<string, CounterState> = new Map();
    private defaultConfig: Required<CounterServiceConfig>;

    constructor(config?: CounterServiceConfig | CounterConfigMap) {
        this.defaultConfig = { initialValue: 0, step: 1 };

        if (config && !("initialValue" in config) && !("step" in config)) {
            const map = config as CounterConfigMap;
            for (const [id, cfg] of Object.entries(map)) {
                this.counters.set(id, {
                    currentValue: cfg?.initialValue ?? 0,
                    step: cfg?.step ?? 1,
                });
            }
        } else {
            const single = config as CounterServiceConfig | undefined;
            this.counters.set("default", {
                currentValue: single?.initialValue ?? 0,
                step: single?.step ?? 1,
            });
        }
    }

    private ensureCounter(counterId: string): CounterState {
        let state = this.counters.get(counterId);
        if (!state) {
            state = {
                currentValue: this.defaultConfig.initialValue,
                step: this.defaultConfig.step,
            };
            this.counters.set(counterId, state);
        }
        return state;
    }

    initialize(config?: CounterServiceConfig | CounterConfigMap): void {
        this.counters.clear();
        if (config && !("initialValue" in config) && !("step" in config)) {
            const map = config as CounterConfigMap;
            for (const [id, cfg] of Object.entries(map)) {
                this.counters.set(id, {
                    currentValue: cfg?.initialValue ?? 0,
                    step: cfg?.step ?? 1,
                });
            }
        } else {
            const single = config as CounterServiceConfig | undefined;
            this.counters.set("default", {
                currentValue: single?.initialValue ?? 0,
                step: single?.step ?? 1,
            });
        }
    }

    next(counterId: string = "default"): number {
        const state = this.ensureCounter(counterId);
        const value = state.currentValue;
        state.currentValue += state.step;
        return value;
    }

    current(counterId: string = "default"): number {
        const state = this.ensureCounter(counterId);
        return state.currentValue;
    }

    reset(counterId: string = "default", value?: number): void {
        const state = this.ensureCounter(counterId);
        state.currentValue = value ?? 0;
    }
}

export function createCounterService(
    config?: CounterServiceConfig | CounterConfigMap,
): CounterService {
    return new CounterServiceImpl(config);
}
