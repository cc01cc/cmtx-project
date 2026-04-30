/* eslint-disable no-console */
/**
 * 交互式提示系统
 *
 * 提供确认对话框和输入提示
 */

import { createInterface } from "node:readline";
import chalk from "chalk";

/**
 * 确认对话框
 */
export async function confirm(message: string, defaultAnswer = false): Promise<boolean> {
    const answer = await question(
        chalk.bold(message) + chalk.gray(` (${defaultAnswer ? "Y/n" : "y/N"}) `),
    );

    if (answer === "") {
        return defaultAnswer;
    }

    return answer.toLowerCase() === "y" || answer.toLowerCase() === "yes";
}

/**
 * 询问用户输入
 */
export async function question(prompt: string): Promise<string> {
    return new Promise((resolve) => {
        const rl = createInterface({
            input: process.stdin,
            output: process.stdout,
        });

        rl.question(prompt, (answer) => {
            rl.close();
            resolve(answer);
        });
    });
}

/**
 * 选择列表
 */
export async function select(message: string, choices: string[]): Promise<string> {
    console.log(chalk.bold(message));

    for (let i = 0; i < choices.length; i++) {
        console.log(chalk.dim(`  ${i + 1}. ${choices[i]}`));
    }

    let selected = "";
    while (!selected) {
        const answer = await question(chalk.bold(`选择 (1-${choices.length}): `));
        const index = Number.parseInt(answer, 10);

        if (index >= 1 && index <= choices.length) {
            selected = choices[index - 1];
        } else {
            console.log(chalk.red("无效的选择，请重试"));
        }
    }

    return selected;
}
