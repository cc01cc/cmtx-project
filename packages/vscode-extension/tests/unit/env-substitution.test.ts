import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { substituteEnvVars, substituteEnvVarsInObject } from '../../src/infra/env-substitution';

describe('Environment Variable Substitution', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        process.env = { ...originalEnv };
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    describe('substituteEnvVars', () => {
        it('should substitute simple env var', () => {
            process.env.TEST_VAR = 'test_value';
            const result = substituteEnvVars('${TEST_VAR}');
            expect(result).toBe('test_value');
        });

        it('should substitute env var with default value', () => {
            process.env.UNSET_VAR = undefined;
            const result = substituteEnvVars('${UNSET_VAR:-default}');
            expect(result).toBe('default');
        });

        it('should prefer env var over default', () => {
            process.env.SET_VAR = 'actual_value';
            const result = substituteEnvVars('${SET_VAR:-default}');
            expect(result).toBe('actual_value');
        });

        it('should handle multiple substitutions', () => {
            process.env.VAR1 = 'hello';
            process.env.VAR2 = 'world';
            const result = substituteEnvVars('${VAR1} ${VAR2}');
            expect(result).toBe('hello world');
        });

        it('should return empty string for unset var without default', () => {
            process.env.UNSET_VAR = undefined;
            const result = substituteEnvVars('${UNSET_VAR}');
            expect(result).toBe('');
        });

        it('should handle empty default value', () => {
            process.env.UNSET_VAR = undefined;
            const result = substituteEnvVars('${UNSET_VAR:-}');
            expect(result).toBe('');
        });

        it('should handle special characters in env var values', () => {
            process.env.SPECIAL_VAR = 'value-with-special-chars-123!@#';
            const result = substituteEnvVars('${SPECIAL_VAR}');
            expect(result).toBe('value-with-special-chars-123!@#');
        });

        it('should handle default value with colons', () => {
            process.env.UNSET_VAR = undefined;
            const result = substituteEnvVars('${UNSET_VAR:-default:with:colons}');
            expect(result).toBe('default:with:colons');
        });

        it('should handle string with no substitutions', () => {
            const result = substituteEnvVars('plain text without vars');
            expect(result).toBe('plain text without vars');
        });

        it('should handle text before and after substitution', () => {
            process.env.MIDDLE = 'middle';
            const result = substituteEnvVars('prefix-${MIDDLE}-suffix');
            expect(result).toBe('prefix-middle-suffix');
        });
    });

    describe('substituteEnvVarsInObject', () => {
        it('should substitute in nested objects', () => {
            process.env.API_KEY = 'secret123';
            const obj = {
                storage: {
                    config: {
                        accessKeyId: '${API_KEY}',
                    },
                },
            };
            const result = substituteEnvVarsInObject(obj);
            expect(result.storage.config.accessKeyId).toBe('secret123');
        });

        it('should substitute in arrays', () => {
            process.env.DOMAIN = 'example.com';
            const obj = {
                domains: ['${DOMAIN}'],
            };
            const result = substituteEnvVarsInObject(obj);
            expect(result.domains[0]).toBe('example.com');
        });

        it('should preserve non-string values', () => {
            const obj = {
                count: 5,
                enabled: true,
                nested: {
                    value: 10,
                },
            };
            const result = substituteEnvVarsInObject(obj);
            expect(result.count).toBe(5);
            expect(result.enabled).toBe(true);
            expect(result.nested.value).toBe(10);
        });

        it('should handle null values', () => {
            const obj = {
                nullValue: null,
                nested: {
                    value: null,
                },
            };
            const result = substituteEnvVarsInObject(obj);
            expect(result.nullValue).toBeNull();
            expect(result.nested.value).toBeNull();
        });

        it('should handle undefined values', () => {
            const obj = {
                undefinedValue: undefined,
                nested: {
                    value: undefined,
                },
            };
            const result = substituteEnvVarsInObject(obj);
            expect(result.undefinedValue).toBeUndefined();
            expect(result.nested.value).toBeUndefined();
        });

        it('should handle deeply nested objects', () => {
            process.env.DEEP_VAR = 'deep_value';
            const obj = {
                level1: {
                    level2: {
                        level3: {
                            value: '${DEEP_VAR}',
                        },
                    },
                },
            };
            const result = substituteEnvVarsInObject(obj);
            expect(result.level1.level2.level3.value).toBe('deep_value');
        });

        it('should handle arrays of objects', () => {
            process.env.VAR1 = 'value1';
            process.env.VAR2 = 'value2';
            const obj = {
                items: [{ key: '${VAR1}' }, { key: '${VAR2}' }],
            };
            const result = substituteEnvVarsInObject(obj);
            expect(result.items[0].key).toBe('value1');
            expect(result.items[1].key).toBe('value2');
        });

        it('should handle mixed types in arrays', () => {
            process.env.STR_VAR = 'string';
            const obj = {
                mixed: ['${STR_VAR}', 123, true, null],
            };
            const result = substituteEnvVarsInObject(obj);
            expect(result.mixed[0]).toBe('string');
            expect(result.mixed[1]).toBe(123);
            expect(result.mixed[2]).toBe(true);
            expect(result.mixed[3]).toBeNull();
        });

        it('should not modify original object', () => {
            process.env.TEST_VAR = 'test';
            const obj = {
                value: '${TEST_VAR}',
            };
            const result = substituteEnvVarsInObject(obj);
            expect(result.value).toBe('test');
            expect(obj.value).toBe('${TEST_VAR}');
        });

        it('should handle empty object', () => {
            const obj = {};
            const result = substituteEnvVarsInObject(obj);
            expect(result).toEqual({});
        });

        it('should handle empty array', () => {
            const obj: string[] = [];
            const result = substituteEnvVarsInObject(obj);
            expect(result).toEqual([]);
        });
    });
});
