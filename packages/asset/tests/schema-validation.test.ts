/**
 * JSON Schema 验证测试
 *
 * 验证生成的 schema 文件能正确校验 DEFAULT_CONFIG 对象
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import Ajv from "ajv";
import { DEFAULT_CONFIG } from "../src/config/types.js";

describe("JSON Schema Validation", () => {
    it("should validate DEFAULT_CONFIG against generated schema", () => {
        const schemaPath = join(__dirname, "..", "dist", "config", "cmtx.schema.json");
        const schema = JSON.parse(readFileSync(schemaPath, "utf-8"));

        const ajv = new Ajv({ allErrors: true });
        const validate = ajv.compile(schema);

        const valid = validate(DEFAULT_CONFIG);
        if (!valid) {
            console.log("Validation errors:", JSON.stringify(validate.errors, null, 2));
        }

        expect(valid).toBe(true);
    });

    it("should fail for invalid config", () => {
        const schemaPath = join(__dirname, "..", "dist", "config", "cmtx.schema.json");
        const schema = JSON.parse(readFileSync(schemaPath, "utf-8"));

        const ajv = new Ajv({ allErrors: true });
        const validate = ajv.compile(schema);

        const invalidConfig = {
            // missing required 'version' field
            upload: {
                batchLimit: "not-a-number", // invalid type
            },
        };

        const valid = validate(invalidConfig);
        expect(valid).toBe(false);
    });
});
