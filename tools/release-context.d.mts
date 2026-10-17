export const root: string;
export const site: URL;
export const preview: URL;
export const output: string;
export function hash(bytes: string | Buffer): string;
export function verifyBuild(): Promise<{buildId:string;preview:string;site:string;node:string;verifiedAt:string;pages:{route:string;sha256:string}[];asset:{url:string;sha256:string};lockSha256:string}>;
