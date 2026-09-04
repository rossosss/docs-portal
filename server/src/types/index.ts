export interface Project {id:string;name:string;owner:string;repository:string;branch:'main';docsPath:string;targetPath:string}
export interface FileVersion {sha:string;content:string}
export interface GitHubPort {
 getBranchSha(p:Project):Promise<string>;
 listFiles(p:Project,ref:string):Promise<string[]>;
 getFile(p:Project,path:string,ref:string):Promise<FileVersion|null>;
 createBranch(p:Project,branch:string,sha:string):Promise<void>;
 createFile(p:Project,path:string,branch:string,content:string,sha?:string):Promise<void>;
 createPullRequest(p:Project,branch:string,title:string,path:string):Promise<{number:number;html_url:string}>;
}
export class ApiError extends Error{
 constructor(public statusCode:number,message:string,public code='REQUEST_FAILED'){super(message);}
}

