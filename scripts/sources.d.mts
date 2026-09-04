export interface Source {id:string;name:string;owner:string;repository:string;branch:'main';docsPath:string;targetPath:string}
export const root:string;
export function loadSources():Promise<Source[]>;
export function localPath(p:Source):string|null;
export function safeRelative(value:unknown):boolean;

