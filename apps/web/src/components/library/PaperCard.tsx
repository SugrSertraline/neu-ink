import React from 'react';
import {
  FileText,
  Trash2,
  Plus,
  Calendar,
  BookOpen,
  Award,
  NotebookPen,
  Bookmark,
  Clock,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { type PaperListItem, type Author } from '@/types/paper';
import { motion, useMotionValue, useSpring, useTransform, AnimatePresence, Variants } from 'framer-motion';

interface PersonalMeta {
  readingStatus?: 'unread' | 'reading' | 'finished';
  priority?: 'high' | 'medium' | 'low';
  customTags?: string[];
  noteCount?: number;
  totalReadingTime?: number; // 总阅读时间（秒）
  lastReadTime?: string | null; // 最后阅读时间
}

interface PaperCardProps {
  paper: PaperListItem;
  onClick: () => void;
  onDelete?: () => void;
  onAddToLibrary?: () => void;
  onRemoveFromLibrary?: () => void;
  onEdit?: () => void;
  showLoginRequired?: boolean;
  personalMeta?: PersonalMeta;
  isAdmin?: boolean;
  isLoading?: boolean;
  isInLibrary?: boolean;
}

function getStatusColor(status: string): string {
  // 柔和的玻璃风色板（整体去白、轻微降饱和）
  switch (status) {
    case 'completed':
      return 'bg-emerald-100/60 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border border-white/30 backdrop-blur-md';
    case 'parsing':
      return 'bg-blue-100/60 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-white/30 backdrop-blur-md';
    case 'pending':
      return 'bg-amber-100/60 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border border-white/30 backdrop-blur-md';
    case 'failed':
      return 'bg-rose-100/60 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300 border border-white/30 backdrop-blur-md';
    default:
      return 'bg-white/30 text-slate-700 dark:bg-white/10 dark:text-slate-200 border border-white/20 backdrop-blur-md';
  }
}

function getStatusText(status: string): string {
  switch (status) {
    case 'completed':
      return '已完成';
    case 'parsing':
      return '解析中';
    case 'pending':
      return '等待中';
    case 'failed':
      return '失败';
    default:
      return '未知';
  }
}

const READ_STATUS_LABEL: Record<'unread' | 'reading' | 'finished', string> = {
  unread: '未开始',
  reading: '阅读中',
  finished: '已完成',
};

const PRIORITY_LABEL: Record<'high' | 'medium' | 'low', string> = {
  high: '高优先级',
  medium: '中优先级',
  low: '低优先级',
};

const PRIORITY_COLOR: Record<'high' | 'medium' | 'low', string> = {
  high: 'bg-red-100/60 text-red-700 dark:bg-red-900/40 dark:text-red-300 border border-white/30 backdrop-blur-md',
  medium: 'bg-amber-100/60 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border border-white/30 backdrop-blur-md',
  low: 'bg-slate-100/60 text-slate-700 dark:bg-slate-800/60 dark:text-slate-200 border border-white/20 backdrop-blur-md',
};
// 获取安全的标题显示文本
function getSafeTitle(title: any): string {
  if (typeof title === 'string') {
    return title || '未命名论文';
  }
  return '未命名论文';
}

// 格式化阅读时间显示
function formatReadingTime(seconds: number): string {
  if (seconds < 60) return `${seconds}秒`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}分钟`;
  const hours = Math.floor(seconds / 3600);
  const remainingMinutes = Math.floor((seconds % 3600) / 60);
  return remainingMinutes > 0 ? `${hours}小时${remainingMinutes}分钟` : `${hours}小时`;
}

// 格式化最后阅读时间显示
function formatLastReadTime(lastReadTime: string | null): string {
  if (!lastReadTime) return '从未阅读';
  const readDate = new Date(lastReadTime);
  const now = new Date();
  const diffMs = now.getTime() - readDate.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) {
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours === 0) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return diffMinutes <= 1 ? '刚刚' : `${diffMinutes}分钟前`;
    }
    return `${diffHours}小时前`;
  } else if (diffDays === 1) {
    return '昨天';
  } else if (diffDays < 7) {
    return `${diffDays}天前`;
  } else {
    return readDate.toLocaleDateString('zh-CN');
  }
}

// 定义动画变体
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      when: "beforeChildren",
      staggerChildren: 0.08
    }
  },
  exit: {
    opacity: 0,
    transition: {
      when: "afterChildren",
      staggerChildren: 0.03
    }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 350,
      damping: 25
    }
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: {
      duration: 0.15
    }
  }
};

export default function PaperCard({
  paper,
  onClick,
  onDelete,
  onAddToLibrary,
  onRemoveFromLibrary,
  onEdit,
  showLoginRequired = false,
  personalMeta,
  isAdmin = false,
  isLoading = false,
  isInLibrary = false,
}: PaperCardProps) {
  const authors = paper.authors
    .slice(0, 3)
    .map((author: Author) => author.name)
    .join(', ');
  const hasMoreAuthors = paper.authors.length > 3;
  const authorsDisplay = hasMoreAuthors ? `${authors} 等` : authors;

  // ---- 3D 悬浮：使用 Framer Motion 让旋转/浮动更顺滑 ----
  const mx = useMotionValue(0.5); // [0,1]
  const my = useMotionValue(0.5); // [0,1]
  const spring = { stiffness: 200, damping: 18, mass: 0.4 };
  const rx = useSpring(useTransform(my, [0, 1], [8, -8]), spring); // rotateX
  const ry = useSpring(useTransform(mx, [0, 1], [-10, 10]), spring); // rotateY
  const tx = useSpring(useTransform(mx, [0, 1], [-6, 6]), spring); // translateX
  const ty = useSpring(useTransform(my, [0, 1], [-6, 6]), spring); // translateY

  const handleMouseMove: React.MouseEventHandler<HTMLDivElement> = (e) => {
    const el = e.currentTarget as HTMLDivElement;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const px = x / rect.width; // 0..1
    const py = y / rect.height;
    mx.set(px);
    my.set(py);
    el.style.setProperty('--cursor-x', `${x}px`);
    el.style.setProperty('--cursor-y', `${y}px`);
  };

  const handleMouseLeave: React.MouseEventHandler<HTMLDivElement> = (e) => {
    const el = e.currentTarget as HTMLDivElement;
    mx.set(0.5);
    my.set(0.5);
    el.style.setProperty('--cursor-x', `50%`);
    el.style.setProperty('--cursor-y', `50%`);
  };

  return (
    <HoverCard delayOpen={200} delayClose={100} openDelay={300}>
      <HoverCardTrigger asChild>
        <motion.div
          onClick={isLoading ? undefined : onClick}
          onMouseMove={isLoading ? undefined : handleMouseMove}
          onMouseLeave={isLoading ? undefined : handleMouseLeave}
          data-glow="true"
          style={{
            rotateX: isLoading ? 0 : rx,
            rotateY: isLoading ? 0 : ry,
            x: isLoading ? 0 : tx,
            y: isLoading ? 0 : ty,
            transformPerspective: 900,
          }}
          whileHover={isLoading ? {} : { scale: 1.012 }}
          transition={{ type: 'spring', stiffness: 200, damping: 18 }}
          className={cn(
            'glass-card group relative rounded-2xl border border-transparent px-4 py-4 transition-all will-change-transform',
            isLoading ? 'cursor-not-allowed opacity-70' : 'cursor-pointer',
            // 背景降白 + 渐变玻璃：更协调的边框与内容层
            'shadow-[0_18px_44px_rgba(15,23,42,0.12)] hover:shadow-[0_28px_68px_rgba(40,65,138,0.22)]',
            'backdrop-blur-2xl bg-white/30 dark:bg-white/5'
          )}
        >
          {/* 3D 深度阴影层（跟随鼠标） */}
          <div aria-hidden className="depth-shadow pointer-events-none absolute inset-2 rounded-2xl" />

          {/* 左侧活跃装饰条 */}
          <div className={cn(
            "pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 h-8 w-[3px] rounded-r-full bg-white/70 shadow-[0_0_9px_rgba(255,255,255,0.45)] transition-opacity",
            isLoading ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          )} />

          {paper.parseStatus && (
            <div className="absolute right-3 top-3 z-10">
              <Badge
                variant="secondary"
                className={`text-[11px] font-medium rounded-full px-2 py-0.5 ${getStatusColor(
                  paper.parseStatus.status
                )}`}
              >
                {getStatusText(paper.parseStatus.status)}
              </Badge>
            </div>
          )}

          <div className="relative z-10 mb-2 pr-20">
            <h3 className="line-clamp-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
              {getSafeTitle(paper.title)}
            </h3>
            {paper.titleZh && (
              <h4 className="line-clamp-1 text-sm font-medium text-slate-700/80 dark:text-slate-300/90">
                {paper.titleZh}
              </h4>
            )}
          </div>

          <p className="relative z-10 mb-3 line-clamp-1 text-xs text-slate-700/80 dark:text-slate-300/90">
            {authorsDisplay || '未知作者'}
            {paper.year && <span> • {paper.year}</span>}
          </p>

          <div className="relative z-10 flex flex-wrap gap-1.5">
            {isAdmin && (
              <Badge
                variant="outline"
                className={cn(
                  'text-[11px] font-medium rounded-full border-white/30 backdrop-blur-sm',
                  paper.isPublic
                    ? 'bg-white/30 text-[#28418A] dark:bg-white/10 dark:text-white'
                    : 'bg-white/20 text-slate-700 dark:bg-white/10 dark:text-slate-200'
                )}
              >
                {paper.isPublic ? '对外展示' : '暂不展示'}
              </Badge>
            )}
            {paper.sciQuartile && paper.sciQuartile !== '无' && (
              <Badge
                variant="outline"
                className="text-[11px] font-medium rounded-full border-white/30 bg-white/30 text-rose-600 dark:bg-white/10 dark:text-rose-300"
              >
                SCI {paper.sciQuartile}
              </Badge>
            )}
            {paper.casQuartile && paper.casQuartile !== '无' && (
              <Badge
                variant="outline"
                className="text-[11px] font-medium rounded-full border-white/30 bg-white/30 text-orange-600 dark:bg-white/10 dark:text-orange-300"
              >
                CAS {paper.casQuartile}
              </Badge>
            )}
            {paper.ccfRank && paper.ccfRank !== '无' && (
              <Badge
                variant="outline"
                className="text-[11px] font-medium rounded-full border-white/30 bg-white/30 text-purple-600 dark:bg-white/10 dark:text-purple-300"
              >
                CCF {paper.ccfRank}
              </Badge>
            )}
            {paper.impactFactor && (
              <Badge
                variant="outline"
                className="text-[11px] font-medium rounded-full border-white/30 bg-white/30 text-blue-600 dark:bg-white/10 dark:text-blue-300"
              >
                IF {paper.impactFactor.toFixed(2)}
              </Badge>
            )}
          </div>

          {personalMeta && (
            <div className="relative z-10 mt-3 flex flex-wrap items-center gap-2">
              {personalMeta.readingStatus && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#E8EEF9]/60 px-2 py-0.5 text-[11px] font-medium text-[#28418A] border border-white/30 backdrop-blur-sm">
                  <Bookmark className="h-3 w-3" />
                  {READ_STATUS_LABEL[personalMeta.readingStatus]}
                </span>
              )}
              {personalMeta.priority && (
                <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium', PRIORITY_COLOR[personalMeta.priority])}>
                  {PRIORITY_LABEL[personalMeta.priority]}
                </span>
              )}
              {typeof personalMeta.noteCount === 'number' && personalMeta.noteCount >= 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-violet-100/60 px-2 py-0.5 text-[11px] font-medium text-violet-700 dark:bg-violet-900/40 dark:text-violet-300 border border-white/30 backdrop-blur-sm">
                  <NotebookPen className="h-3 w-3" />
                  笔记 {personalMeta.noteCount}
                </span>
              )}
              {typeof personalMeta.totalReadingTime === 'number' && (
                <span
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium border border-white/30 backdrop-blur-sm',
                    personalMeta.totalReadingTime > 0
                      ? 'bg-emerald-100/60 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                      : 'bg-white/30 text-slate-500 dark:bg-white/10 dark:text-slate-400'
                  )}
                >
                  <Clock className="h-3 w-3" />
                  {personalMeta.totalReadingTime > 0
                    ? formatReadingTime(personalMeta.totalReadingTime)
                    : '未阅读'}
                </span>
              )}
              {personalMeta.customTags && personalMeta.customTags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {personalMeta.customTags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="rounded px-2 py-0.5 text-[11px] text-slate-700 dark:text-slate-200 bg-white/30 dark:bg-white/10 border border-white/30 backdrop-blur-sm"
                    >
                      #{tag}
                    </span>
                  ))}
                  {personalMeta.customTags.length > 3 && (
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      +{personalMeta.customTags.length - 3}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {(onDelete || onAddToLibrary || onRemoveFromLibrary || onEdit || showLoginRequired) && (
            <div className="relative z-10 mt-3 flex flex-wrap gap-2 border-t border-white/20 pt-3 dark:border-white/10">
              {showLoginRequired && (
                <span className="text-xs text-[#28418A]">登录后查看详情</span>
              )}
              {isInLibrary ? (
                <span className="text-xs text-[#28418A] bg-[#28418A]/10 px-2 py-1 rounded-md border border-[#28418A]/30 backdrop-blur-sm">
                  已在个人论文库中
                </span>
              ) : onAddToLibrary && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(event) => {
                    event.stopPropagation();
                    onAddToLibrary();
                  }}
                  className="h-7 text-xs bg-[#28418A]/10 hover:bg-[#28418A]/20 border border-[#28418A]/30 backdrop-blur-sm text-[#28418A] dark:bg-white/30 dark:hover:bg-white/40 dark:border-white/30"
                >
                  <Plus className="mr-1 h-3 w-3" />
                  添加到我的论文库
                </Button>
              )}
              {onDelete && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(event) => {
                    event.stopPropagation();
                    onDelete();
                  }}
                  className="h-7 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50/50 dark:hover:bg-rose-900/20 bg-rose-50/30 border border-rose-200/50 backdrop-blur-sm dark:bg-white/30 dark:border-white/30"
                >
                  <Trash2 className="mr-1 h-3 w-3" />
                  删除
                </Button>
              )}
              {onRemoveFromLibrary && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(event) => {
                    event.stopPropagation();
                    onRemoveFromLibrary();
                  }}
                  className="h-7 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50/50 dark:text-rose-300 dark:hover:bg-rose-900/20 bg-rose-50/30 border border-rose-200/50 backdrop-blur-sm dark:bg-white/30 dark:border-white/30"
                >
                  <Trash2 className="mr-1 h-3 w-3" />
                  从个人库删除
                </Button>
              )}
              {onEdit && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(event) => {
                    event.stopPropagation();
                    onEdit();
                  }}
                  className="h-7 text-xs bg-slate-100/70 hover:bg-slate-200/70 border border-slate-300/50 backdrop-blur-sm text-slate-700 dark:bg-white/30 dark:hover:bg-white/40 dark:border-white/30 dark:text-slate-200"
                >
                  编辑
                </Button>
              )}
            </div>
          )}

          {/* 加载状态覆盖层 */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/40 backdrop-blur-sm rounded-2xl z-20">
              <div className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-[#28418A]" />
                <span className="text-sm text-[#28418A]">打开中...</span>
              </div>
            </div>
          )}
        
          {/* 装饰层：柔和玻璃边框 & 纹理降白 */}
          <div aria-hidden className="pointer-events-none absolute inset-0 rounded-2xl" style={{ zIndex: 0 }} />
        
        </motion.div>
      </HoverCardTrigger>

      <AnimatePresence mode="wait">
        <HoverCardContent
          asChild
          side="top"
          align="start"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{
              opacity: 1,
              scale: 1,
              y: 0,
              transition: {
                type: "spring",
                stiffness: 300,
                damping: 25,
                mass: 0.8
              }
            }}
            exit={{
              opacity: 0,
              scale: 0.9,
              y: -10,
              transition: {
                duration: 0.2,
                ease: "easeInOut"
              }
            }}
            whileHover={{
              scale: 1.02,
              transition: { duration: 0.2 }
            }}
            className={cn(
              'w-96 rounded-2xl border border-white/20 bg-white/40 backdrop-blur-2xl shadow-[0_14px_30px_rgba(40,65,138,0.16)] dark:bg-white/5 dark:border-white/10'
            )}
          >
            <motion.div 
              className="space-y-3"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <motion.div variants={itemVariants}>
                <h4 className="mb-1 font-semibold text-slate-900 dark:text-slate-100">
                  {getSafeTitle(paper.title)}
                </h4>
                {paper.titleZh && (
                  <p className="text-sm text-slate-700/80 dark:text-slate-300/90">{paper.titleZh}</p>
                )}
              </motion.div>

              {paper.authors.length > 0 && (
                <motion.div className="flex items-start gap-2" variants={itemVariants}>
                  <FileText className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                  <div>
                    <p className="text-xs font-medium text-slate-700 dark:text-slate-300">作者</p>
                    <p className="text-xs text-slate-700/80 dark:text-slate-300/90">
                      {paper.authors.map((author: Author) => author.name).join(', ')}
                    </p>
                  </div>
                </motion.div>
              )}

              {(paper.publication || paper.date) && (
                <motion.div className="flex items-start gap-2" variants={itemVariants}>
                  <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                  <div>
                    <p className="text-xs font-medium text-slate-700 dark:text-slate-300">发表信息</p>
                    {paper.publication && (
                      <p className="text-xs text-slate-700/80 dark:text-slate-300/90">{paper.publication}</p>
                    )}
                    {paper.date && (
                      <p className="text-xs text-slate-500 dark:text-slate-400">{paper.date}</p>
                    )}
                  </div>
                </motion.div>
              )}

              {(paper.sciQuartile || paper.casQuartile || paper.ccfRank || paper.impactFactor) && (
                <motion.div className="flex items-start gap-2" variants={itemVariants}>
                  <Award className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                  <div className="flex-1">
                    <p className="mb-1 text-xs font-medium text-slate-700 dark:text-slate-300">评级信息</p>
                    <div className="flex flex-wrap gap-1.5">
                      {paper.sciQuartile && paper.sciQuartile !== '无' && (
                        <Badge variant="secondary" className="text-xs bg-white/30 border border-white/30 backdrop-blur-sm">
                          SCI {paper.sciQuartile}
                        </Badge>
                      )}
                      {paper.casQuartile && paper.casQuartile !== '无' && (
                        <Badge variant="secondary" className="text-xs bg-white/30 border border-white/30 backdrop-blur-sm">
                          CAS {paper.casQuartile}
                        </Badge>
                      )}
                      {paper.ccfRank && paper.ccfRank !== '无' && (
                        <Badge variant="secondary" className="text-xs bg-white/30 border border-white/30 backdrop-blur-sm">
                          CCF {paper.ccfRank}
                        </Badge>
                      )}
                      {paper.impactFactor && (
                        <Badge variant="secondary" className="text-xs bg-white/30 border border-white/30 backdrop-blur-sm">
                          影响因子: {paper.impactFactor.toFixed(3)}
                        </Badge>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {personalMeta && (
                <motion.div className="flex items-start gap-2" variants={itemVariants}>
                  <Clock className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                  <div>
                    <p className="text-xs font-medium text-slate-700 dark:text-slate-300">阅读信息</p>
                    {typeof personalMeta.totalReadingTime === 'number' && (
                      <p className="text-xs text-slate-700/80 dark:text-slate-300/90">
                        总阅读时长: {personalMeta.totalReadingTime > 0
                          ? formatReadingTime(personalMeta.totalReadingTime)
                          : '未阅读'
                        }
                      </p>
                    )}
                    <p className="text-xs text-slate-700/80 dark:text-slate-300/90">
                      最后阅读: {formatLastReadTime(personalMeta.lastReadTime || null)}
                    </p>
                  </div>
                </motion.div>
              )}

              {isAdmin && (
                <motion.div className="flex items-start gap-2" variants={itemVariants}>
                  <Bookmark className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                  <div>
                    <p className="text-xs font-medium text-slate-700 dark:text-slate-300">展示状态</p>
                    <p className="text-xs text-slate-700/80 dark:text-slate-300/90">
                      {paper.isPublic ? '当前对所有访客可见' : '仅管理员可见，尚未公开'}
                    </p>
                  </div>
                </motion.div>
              )}

              {paper.articleType && (
                <motion.div className="flex items-start gap-2" variants={itemVariants}>
                  <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                  <div>
                    <p className="text-xs font-medium text-slate-700 dark:text-slate-300">文章类型</p>
                    <p className="text-xs text-slate-700/80 dark:text-slate-300/90">{paper.articleType}</p>
                  </div>
                </motion.div>
              )}

              {paper.doi && (
                <motion.div 
                  className="rounded-md bg-white/30 p-2 border border-white/30 backdrop-blur-sm dark:bg-white/10 dark:border-white/10" 
                  variants={itemVariants}
                >
                  <p className="text-xs font-medium text-slate-700 dark:text-slate-300">DOI</p>
                  <p className="break-all text-xs text-slate-700/80 dark:text-slate-300/90">{paper.doi}</p>
                </motion.div>
              )}

              {paper.tags && paper.tags.length > 0 && (
                <motion.div variants={itemVariants}>
                  <p className="mb-1 text-xs font-medium text-slate-700 dark:text-slate-300">标签</p>
                  <div className="flex flex-wrap gap-1">
                    {paper.tags.map((tag, index) => (
                      <Badge key={index} variant="outline" className="text-xs border-white/30 bg-white/30 backdrop-blur-sm">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        </HoverCardContent>
      </AnimatePresence>

      {/* 样式：降低内容白度、协调边框 + 3D 悬浮与光晕 */}
      <style jsx>{`
        .glass-card {
          position: relative;
          /* 双层背景：内层内容降低白度，外层用于实现渐变边框 */
          background:
            linear-gradient(180deg, rgba(255,255,255,0.65), rgba(255,255,255,0.18)) padding-box,
            linear-gradient(160deg, rgba(255,255,255,0.55), rgba(40,65,138,0.28)) border-box;
          border: 1px solid transparent; /* 由 border-box 渐变呈现边框，整体更协调 */
          transform-style: preserve-3d;
        }
        /* 鼠标跟随的光晕（蓝调） */
        .glass-card::after {
          content: '';
          position: absolute;
          inset: -1px;
          border-radius: 1rem; /* 与 rounded-2xl 呼应 */
          pointer-events: none;
          background:
            radial-gradient(
              260px circle at var(--cursor-x, 50%) var(--cursor-y, 50%),
              rgba(40,65,138,0.16),
              rgba(40,65,138,0.07) 40%,
              transparent 60%
            );
          opacity: 0;
          transition: opacity 200ms ease;
          filter: drop-shadow(0 10px 26px rgba(40,65,138,0.14));
          z-index: 0;
        }
        .glass-card:hover::after {
          opacity: 1;
        }
        /* 内侧微高光，提升玻璃质感而不过白 */
        .glass-card::before {
          content: '';
          position: absolute;
          inset: 1px;
          border-radius: 0.95rem;
          pointer-events: none;
          background: linear-gradient(180deg, rgba(255,255,255,0.34), rgba(255,255,255,0.08));
          mix-blend-mode: overlay;
          opacity: 0.55;
          z-index: 0;
        }
        /* 深度阴影，营造卡片漂浮在界面上的 3D 效果 */
        .depth-shadow {
          background:
            radial-gradient(120px 80px at var(--cursor-x, 50%) calc(100% + 20px), rgba(2,8,23,0.25), transparent 70%);
          filter: blur(18px);
          opacity: 0;
          transform: translateZ(-40px);
          transition: opacity 200ms ease;
        }
        .glass-card:hover .depth-shadow {
          opacity: 1;
        }
      `}</style>
    </HoverCard>
  );
}
