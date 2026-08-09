import { resolve } from 'path';

export function getUploadRoot() {
  return resolve(process.env.UPLOAD_DIR || 'uploads');
}
