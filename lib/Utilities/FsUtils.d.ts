export declare function fileExists(path: any): boolean;
export declare function directoryExists(path: any): boolean;
export declare function deleteFile(filePath: any): Promise<void>;
export declare function deleteDirectory(directoryPath: any): Promise<{}>;
export declare function execCommand(commandLine: any, workingPath: any): any;
export declare function readJsonFile(path: any): any;
export declare function readTextFile(path: any): string;
export declare function copy(oldPath: string, newPath: string): Promise<void>;
export declare function move(oldPath: string, newPath: string): Promise<void>;
