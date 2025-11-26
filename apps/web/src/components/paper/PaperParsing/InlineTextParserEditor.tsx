import React from 'react';
import InlineTextParserEditor from '../editor/InlineTextParserEditor';

type StreamProgressData = {
  message: string;
  progress: number;
  sessionId?: string;
};

interface InlineTextParserEditorProps {
  sectionId: string;
  sectionTitle: string;
  context: 'section' | 'block';
  blockId?: string;
  onParseText: (text: string, afterBlockId?: string, isStreaming?: boolean) => Promise<{ success: boolean; error?: string }>;
  onCancel: () => void;
  paperId: string;
  userPaperId?: string | null;
  onParseComplete: (blocks: any[], paperData?: any) => void;
  onProgressUpdate: (progressData: StreamProgressData) => void;
}

export function InlineTextParserEditorWrapper({
  sectionId,
  sectionTitle,
  context,
  blockId,
  onParseText,
  onCancel,
  paperId,
  userPaperId,
  onParseComplete,
  onProgressUpdate,
}: InlineTextParserEditorProps) {
  return (
    <InlineTextParserEditor
      sectionId={sectionId}
      sectionTitle={sectionTitle}
      context={context}
      blockId={blockId}
      onParseText={onParseText}
      onCancel={onCancel}
      paperId={paperId}
      userPaperId={userPaperId}
      onParseComplete={onParseComplete}
      onProgressUpdate={onProgressUpdate}
    />
  );
}