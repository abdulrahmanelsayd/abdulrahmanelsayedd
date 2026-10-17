export interface GuardOptions { root: string; cwd: string; args: string[] }
export interface Validated { project: string; output: string; args: string[] }
export interface OutputConfig { distDir: string; typescript?: { tsconfigPath?: string }; output?: string }
export type ConfigLoader = (project: string) => Promise<OutputConfig>;
export function validateNext(options: GuardOptions, loadConfig?: ConfigLoader): Promise<Validated>;
export function guardedNext(options: GuardOptions, run?: (validated: Validated) => Promise<number>, loadConfig?: ConfigLoader): Promise<number>;
