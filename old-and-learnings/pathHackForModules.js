import path from 'path';
import { fileURLToPath } from 'url';

export const __filename = fileURLToPath(import.meta.url);
export const __dirname = path.dirname(__filename);
//this does not work because it sets the directory to the folder this is in (namely utils) and not the root of the project. I'll just have to put it back into whatever file is using it rather than import this.
