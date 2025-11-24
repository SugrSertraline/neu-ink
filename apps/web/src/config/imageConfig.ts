/**
 * 图片配置
 * 用于管理图片相关的配置信息
 */

// 图片域名配置
export const IMAGE_DOMAIN = 'https://image.neuwiki.top';

// 图片路径前缀
export const IMAGE_PATH_PREFIX = 'neuink';

/**
 * 构建完整的图片URL
 * @param paperId 论文ID
 * @param imagePath 图片相对路径（如：images/filename.jpg）
 * @returns 完整的图片URL
 */
export function buildImageUrl(paperId: string, imagePath: string): string {
  if (!paperId || !imagePath) {
    return '';
  }

  // 如果已经是完整URL，直接返回
  if (imagePath.startsWith('http')) {
    return imagePath;
  }

  // 如果路径已经包含images/前缀，直接使用
  const relativePath = imagePath.startsWith('images/') ? imagePath : `images/${imagePath}`;
  
  return `${IMAGE_DOMAIN}/${IMAGE_PATH_PREFIX}/${paperId}/${relativePath}`;
}