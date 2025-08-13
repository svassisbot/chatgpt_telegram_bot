export const now = () => Date.now();
export const tsIso = (ms:number) => new Date(ms).toISOString();
export const today = () => new Date().toISOString().slice(0,10);