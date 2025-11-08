'use client';

import {
  Calendar,
  Users,
  FileText,
  Award,
  Tag,
  BookOpen,
  Mail,
  Building,
  User,
} from 'lucide-react';
import type { PaperMetadata } from '@/types/paper';
import { MetadataContextMenu } from '@/components/paper/PaperContextMenus';
import { usePaperEditPermissionsContext } from '@/contexts/PaperEditPermissionsContext';
import AbstractAndKeywords from './AbstractAndKeywords';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { cn } from '@/lib/utils'; // 假设你的 shadcn/ui 工具函数在这里

interface PaperMetadataProps {
  metadata: PaperMetadata;
  abstract?: {
    en?: string;
    zh?: string;
  };
  keywords?: string[];
  lang?: 'en' | 'both';
  onEditRequest?: () => void;
  onAbstractKeywordsEditRequest?: () => void;
  'data-metadata'?: string;
}

// 优化后的作者信息渲染，使用 Avatar 和 HoverCard
const renderAuthors = (authors: PaperMetadata['authors']) => (
  <div className="flex flex-wrap items-center gap-4">
    {authors.map((author, idx) => (
      <HoverCard key={`${author.name}-${idx}`} openDelay={200}>
        <HoverCardTrigger asChild>
          <div className="flex cursor-pointer items-center gap-2 transition-opacity hover:opacity-80">
            <Avatar className="h-8 w-8 text-sm">
              {/* 如果有作者头像 URL，可以在这里使用 AvatarImage */}
              {/* <AvatarImage src={author.avatarUrl} /> */}
              <AvatarFallback className="bg-slate-200 dark:bg-slate-700">
                {author.name?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
              {author.name}
            </span>
          </div>
        </HoverCardTrigger>
        <HoverCardContent className="w-80" side="top">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarFallback>{author.name?.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <h4 className="text-sm font-semibold">{author.name}</h4>
              </div>
            </div>
            {author.affiliation && (
              <div className="flex items-center pt-2">
                <Building className="mr-2 h-4 w-4 opacity-70" />
                <span className="text-xs text-muted-foreground">{author.affiliation}</span>
              </div>
            )}
            {author.email && (
              <div className="flex items-center">
                <Mail className="mr-2 h-4 w-4 opacity-70" />
                <span className="text-xs text-muted-foreground">{author.email}</span>
              </div>
            )}
          </div>
        </HoverCardContent>
      </HoverCard>
    ))}
  </div>
);

// 优化后的信息展示组件
function MetadataDisplay({ metadata }: { metadata: PaperMetadata }) {
  // 定义不同指标的徽章样式
  const badgeVariants = {
    sci: 'border-blue-500/50 bg-blue-500/10 text-blue-700 dark:text-blue-400 hover:bg-blue-500/20',
    cas: 'border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-400 hover:bg-green-500/20',
    ccf: 'border-purple-500/50 bg-purple-500/10 text-purple-700 dark:text-purple-400 hover:bg-purple-500/20',
    if: 'border-orange-500/50 bg-orange-500/10 text-orange-700 dark:text-orange-400 hover:bg-orange-500/20',
  };

  return (
    <Card
      data-metadata-region="true"
      className={cn(
        // 毛玻璃和辉光效果
        'border-white/20 bg-white/50 shadow-lg backdrop-blur-lg',
        'dark:border-white/10 dark:bg-black/20 dark:shadow-2xl',
        // 发光效果 (可选，通过伪元素实现)
        'relative overflow-hidden',
        "before:absolute before:left-1/2 before:top-0 before:-z-10 before:h-2/3 before:w-2/3 before:-translate-x-1/2 before:rounded-full before:bg-purple-500/10 before:blur-3xl before:content-['']",
        // 确保右键菜单可以正常工作
        'pointer-events-auto'
      )}
      style={{ pointerEvents: 'auto' }}
    >
      <CardHeader>
        <CardTitle className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          {metadata.title}
        </CardTitle>
        {metadata.titleZh && (
          <CardDescription className="pt-1 text-lg text-slate-600 dark:text-slate-400">
            {metadata.titleZh}
          </CardDescription>
        )}
      </CardHeader>

      <CardContent className="space-y-6">
        {/* 作者信息 */}
        <div className="flex items-start gap-3">
          <Users className="mt-1 h-5 w-5 shrink-0 text-slate-500 dark:text-slate-400" />
          {metadata.authors?.length ? (
            renderAuthors(metadata.authors)
          ) : (
            <span className="text-sm text-slate-500 dark:text-slate-400">暂无作者信息</span>
          )}
        </div>

        {/* 出版物和日期等元数据 */}
        <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
          {metadata.publication && (
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 shrink-0 text-slate-500 dark:text-slate-400" />
              <span className="text-sm text-slate-700 dark:text-slate-300">{metadata.publication}</span>
            </div>
          )}
          {(metadata.date || metadata.year) && (
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 shrink-0 text-slate-500 dark:text-slate-400" />
              <span className="text-sm text-slate-700 dark:text-slate-300">{metadata.date || metadata.year}</span>
            </div>
          )}
          {metadata.articleType && (
            <div className="flex items-center gap-3">
              <BookOpen className="h-5 w-5 shrink-0 text-slate-500 dark:text-slate-400" />
              <span className="text-sm capitalize text-slate-700 dark:text-slate-300">{metadata.articleType}</span>
            </div>
          )}
          {metadata.doi && (
             <div className="flex items-center gap-3">
                <span className="font-mono text-sm font-medium text-slate-500 dark:text-slate-400">DOI</span>
                <a
                  href={`https://doi.org/${metadata.doi}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline dark:text-blue-400"
                >
                  {metadata.doi}
                </a>
            </div>
          )}
        </div>

        {/* 期刊分区和影响因子 */}
        {(metadata.sciQuartile || metadata.casQuartile || metadata.ccfRank || metadata.impactFactor) && (
          <div className="flex items-start gap-3">
            <Award className="mt-1 h-5 w-5 shrink-0 text-slate-500 dark:text-slate-400" />
            <div className="flex flex-wrap gap-2">
              {metadata.sciQuartile && metadata.sciQuartile !== '无' && (
                <Badge variant="outline" className={badgeVariants.sci}>SCI {metadata.sciQuartile}</Badge>
              )}
              {metadata.casQuartile && metadata.casQuartile !== '无' && (
                <Badge variant="outline" className={badgeVariants.cas}>CAS {metadata.casQuartile}</Badge>
              )}
              {metadata.ccfRank && metadata.ccfRank !== '无' && (
                <Badge variant="outline" className={badgeVariants.ccf}>CCF {metadata.ccfRank}</Badge>
              )}
              {typeof metadata.impactFactor === 'number' && (
                <Badge variant="outline" className={badgeVariants.if}>IF: {metadata.impactFactor}</Badge>
              )}
            </div>
          </div>
        )}

        {/* 标签 */}
        <div className="flex items-start gap-3">
          <Tag className="mt-1 h-5 w-5 shrink-0 text-slate-500 dark:text-slate-400" />
          <div className="flex flex-wrap gap-2">
            {metadata.tags?.length ? (
              metadata.tags.map(tag => <Badge key={tag} variant="secondary">{tag}</Badge>)
            ) : (
              <span className="text-sm text-slate-500 dark:text-slate-400">暂无标签</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// 主组件保持不变，仅替换内部渲染的组件
export default function PaperMetadata({
  metadata,
  abstract,
  keywords,
  lang = 'en',
  onEditRequest,
  onAbstractKeywordsEditRequest,
  'data-metadata': dataMetadata,
}: PaperMetadataProps) {
  const { canEditContent } = usePaperEditPermissionsContext();
  const allowEdit = canEditContent && Boolean(onEditRequest);
  const allowAbstractKeywordsEdit = canEditContent && Boolean(onAbstractKeywordsEditRequest);

  return (
    <div className="space-y-8" data-metadata={dataMetadata}>
      <MetadataContextMenu onEdit={allowEdit ? onEditRequest : undefined}>
        <div data-metadata-region="true">
          <MetadataDisplay metadata={metadata} />
        </div>
      </MetadataContextMenu>
      
      {/* 摘要和关键词部分保持不变，也可以进一步美化 */}
      <AbstractAndKeywords
        abstract={abstract}
        keywords={keywords}
        lang={lang}
        onEditRequest={allowAbstractKeywordsEdit ? onAbstractKeywordsEditRequest : undefined}
      />
    </div>
  );
}
