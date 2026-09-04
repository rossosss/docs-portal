export interface Project{id:string;name:string;sections:string[];available:boolean;error?:string}
export interface DocumentDraft{projectId:string;section:string;title:string;slug:string;content:string}
export interface ExistingDocument{projectId:string;path:string;title:string;content:string;sha:string;commit:string}
export interface Result{success:boolean;pullRequestUrl:string;pullRequestNumber:number;path:string;branch:string;repository:string}
export function docsApi(base:string){
 async function request<T>(path:string,init?:RequestInit):Promise<T>{
  let response:Response;
  try{response=await fetch(base.replace(/\/$/,'')+path,{...init,headers:{'Content-Type':'application/json',...init?.headers},signal:AbortSignal.timeout(60000)});}
  catch{throw new Error('API портала недоступен. Проверьте подключение и адрес backend.');}
  const data=await response.json();
  if(!response.ok)throw new Error(data.error||'Не удалось выполнить запрос');
  return data as T;
 }
 return {
  projects:()=>request<{projects:Project[]}>('/api/projects'),
  create:(draft:DocumentDraft)=>request<Result>('/api/documents',{method:'POST',body:JSON.stringify(draft)}),
  read:(projectId:string,path:string)=>request<ExistingDocument>('/api/documents?'+new URLSearchParams({projectId,path})),
  edit:(doc:ExistingDocument,title:string,content:string)=>request<Result>('/api/documents',{method:'PUT',body:JSON.stringify({projectId:doc.projectId,path:doc.path,expectedSha:doc.sha,title,content})}),
 };
}

