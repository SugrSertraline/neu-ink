// 论文服务层 - 对接后端真实 API

import {
  AddBlockFromTextToSectionRequest,
  AddBlockFromTextToSectionResult,
<<<<<<< HEAD
=======
  CheckBlockParsingStatusResult,
>>>>>>> origin/main
  AddBlockToSectionRequest,
  AddBlockToSectionResult,
  AddToLibraryRequest,
  CreateNoteRequest,
  CreatePaperFromTextRequest,
  CreatePaperFromMetadataRequest,
  DeleteResult,
  UpdateSectionRequest,
  UpdateSectionResult,
  DeleteSectionResult,
  UpdateBlockRequest,
  UpdateBlockResult,
  DeleteBlockResult,
  Note,
  NoteFilters,
  NoteListData,
  Paper,
  PaperContent,
  PaperListData,
  PublicPaperFilters,
  UpdateNoteRequest,
  UpdatePaperVisibilityRequest,
  UpdatePaperVisibilityResult,
  UpdateReadingProgressRequest,
  UpdateUserPaperRequest,
  UserPaper,
  UserPaperFilters,
  UserPaperListData,
  UserStatistics,
  ParseReferencesRequest,
  ParseReferencesResult,
  AddReferencesToPaperRequest,
<<<<<<< HEAD
  AddReferencesToPaperResult
=======
  AddReferencesToPaperResult,
  ParseResult,
  ConfirmParseResultRequest,
  ConfirmParseResultResult,
  DiscardParseResultResult,
  SaveAllParseResultResult
>>>>>>> origin/main
} from '@/types/paper/index';
import { apiClient, callAndNormalize } from '../http';
import type { UnifiedResult } from '@/types/api';

<<<<<<< HEAD
// —— 流式传输工具函数 —— //
function createAuthenticatedEventSource(url: string, params: URLSearchParams): EventSource {
  // 获取token并添加到URL参数中
  const token = apiClient.getToken();
  if (token) {
    // 确保token正确编码
    params.append('token', encodeURIComponent(token));
  }
  
  // 使用apiClient的getFullURL方法构建完整URL
  const baseUrl = apiClient.getFullURL(url);
  const paramString = params.toString();
  
  // 额外确保参数字符串正确编码
  const fullUrl = `${baseUrl}?${paramString}`;
  
  console.log('createAuthenticatedEventSource URL:', fullUrl);
  console.log('URL length:', fullUrl.length);
  
  // 检查URL长度，如果过长则切换到POST方法
  if (fullUrl.length > 2048) {
    console.warn('URL too long for GET request, consider using POST method');
    throw new Error('URL too long for EventSource GET request, please use POST method instead');
  }
  
  // 创建EventSource连接，并设置withCredentials以支持cookie认证
  const eventSource = new EventSource(fullUrl, {
    withCredentials: true // 支持cookie认证
  });
  
  return eventSource;
}

// —— 改进的流式传输函数，支持POST请求体 —— //
function createAuthenticatedEventSourceWithPost(url: string, params: Record<string, any>): EventSource {
  // 获取token
  const token = apiClient.getToken();
  
  // 使用apiClient的getFullURL方法构建完整URL
  const baseUrl = apiClient.getFullURL(url);
  
  // 对于长文本，我们需要使用fetch来模拟EventSource
  // 因为EventSource只支持GET请求，而GET请求的URL长度有限制
  const controller = new AbortController();
  const signal = controller.signal;
  
  // 构建请求体
  const requestBody = {
    ...params,
    token // 将token放在请求体中而不是URL中
  };
  
  console.log('createAuthenticatedEventSourceWithPost URL:', baseUrl);
  console.log('Request body length:', JSON.stringify(requestBody).length);
  if (params.text) {
    console.log('Text preview for POST request (first 100 chars):', params.text.substring(0, 100));
    console.log('Text contains special characters:', /[&?=%+]/.test(params.text));
  }
  
  // 创建一个自定义的EventSource-like对象
  // 使用一个空对象作为基础，然后添加EventSource的属性和方法
  const customEventSource = {
    // EventSource的状态常量
    CONNECTING: 0,
    OPEN: 1,
    CLOSED: 2,
    
    // 初始状态为连接中
    readyState: 0,
    
    // URL属性
    url: baseUrl,
    
    // 事件处理器
    onopen: null,
    onmessage: null,
    onerror: null,
    
    // 添加标志位防止重复关闭
    isClosed: false,
    
    // 关闭方法
    close: () => {
      // 防止重复关闭
      if (customEventSource.isClosed) {
        return;
      }
      customEventSource.isClosed = true;
      customEventSource.readyState = 2; // 设置为CLOSED状态
      
      // 只有在流还在进行时才需要中止
      try {
        controller.abort();
      } catch (error: any) {
        // 忽略中止错误，因为流可能已经自然结束
        console.log('Stream already ended or aborted:', error?.message || 'Unknown error');
      }
    },
    
    // 添加事件监听器的方法
    addEventListener: (type: string, listener: EventListener) => {
      // 简化实现，实际应用中可能需要更完整的事件系统
    },
    
    // 移除事件监听器的方法
    removeEventListener: (type: string, listener: EventListener) => {
      // 简化实现
    },
    
    // 触发事件的方法
    dispatchEvent: (event: Event) => {
      // 简化实现
    }
  } as any;
  
  // 使用fetch进行流式请求
  fetch(baseUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Authorization': token ? `Bearer ${token}` : ''
    },
    body: JSON.stringify(requestBody),
    signal: signal
  })
  .then(response => {
    console.log('POST response status:', response.status);
    console.log('POST response headers:', Object.fromEntries(response.headers.entries()));
    
    // 更新状态为已连接
    customEventSource.readyState = 1;
    
    // 触发open事件
    if (customEventSource.onopen) {
      customEventSource.onopen(new Event('open'));
    }
    
    if (!response.ok) {
      // 尝试读取错误信息
      response.text().then(errorText => {
        console.error('POST error response body:', errorText);
      }).catch(err => {
        console.error('Failed to read error response:', err);
      });
      
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Response body is not readable');
    }
    
    const decoder = new TextDecoder();
    let buffer = '';
    
    function readStream(): Promise<void> {
      return reader!.read().then(({ done, value }) => {
        if (done) {
          // 处理缓冲区中剩余的数据
          if (buffer.trim()) {
            processSSEData(buffer);
          }
          // 流结束，关闭连接
          customEventSource.readyState = 2;
          return;
        }
        
        buffer += decoder.decode(value, { stream: true });
        
        // 处理完整的SSE消息
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // 保留最后一行（可能不完整）
        
        let eventData = '';
        let eventType = '';
        
        for (const line of lines) {
          if (line.startsWith('event:')) {
            eventType = line.substring(6).trim();
          } else if (line.startsWith('data:')) {
            eventData += line.substring(6).trim() + '\n';
          } else if (line === '') {
            // 空行表示消息结束
            if (eventData) {
              processSSEMessage(eventType, eventData.trim());
              eventData = '';
              eventType = '';
            }
          }
        }
        
        return readStream();
      });
    }
    
    function processSSEMessage(eventType: string, data: string) {
      try {
        const messageEvent = new MessageEvent('message', {
          data: data,
          origin: baseUrl,
          lastEventId: ''
        });
        
        // 触发相应的事件处理器
        if (eventType && customEventSource[`on${eventType}`]) {
          customEventSource[`on${eventType}`](messageEvent);
        } else if (customEventSource.onmessage) {
          customEventSource.onmessage(messageEvent);
        }
        
        // 也触发事件监听器
        if (customEventSource.dispatchEvent) {
          customEventSource.dispatchEvent(messageEvent);
        }
      } catch (error) {
        console.error('Error processing SSE message:', error);
      }
    }
    
    function processSSEData(data: string) {
      // 简单的SSE数据处理
      const lines = data.split('\n');
      for (const line of lines) {
        if (line.startsWith('data:')) {
          const eventData = line.substring(6);
          if (eventData.trim()) {
            try {
              const messageEvent = new MessageEvent('message', {
                data: eventData,
                origin: baseUrl,
                lastEventId: ''
              });
              
              if (customEventSource.onmessage) {
                customEventSource.onmessage(messageEvent);
              }
              
              if (customEventSource.dispatchEvent) {
                customEventSource.dispatchEvent(messageEvent);
              }
            } catch (error) {
              console.error('Error processing SSE data:', error);
            }
          }
        }
      }
    }
    
    return readStream();
  })
  .catch(error => {
    // 如果是已关闭的流，不触发错误事件
    if (customEventSource.isClosed) {
      console.log('Stream was closed, ignoring error:', error?.message || 'Stream closed');
      return;
    }
    
    console.error('EventSource connection error:', error);
    
    // 更新状态为已关闭
    customEventSource.readyState = 2;
    customEventSource.isClosed = true;
    
    // 触发错误事件
    const errorEvent = new Event('error');
    if (customEventSource.onerror) {
      customEventSource.onerror(errorEvent);
    }
    if (customEventSource.dispatchEvent) {
      customEventSource.dispatchEvent(errorEvent);
    }
  });
  
  return customEventSource;
}

=======
>>>>>>> origin/main

// —— 参数拼接工具 —— //
function buildSearchParams(params: Record<string, any>): string {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      if (Array.isArray(value)) {
        value.forEach(v => searchParams.append(key, String(v)));
      } else {
        searchParams.append(key, String(value));
      }
    }
  });
  const qs = searchParams.toString();
  return qs ? `?${qs}` : '';
}

// —— 公共论文库服务 —— //
export const publicPaperService = {
  /**
   * 获取公共论文列表
   */
  getPublicPapers(
    filters: PublicPaperFilters = {}
  ): Promise<UnifiedResult<PaperListData>> {
    return callAndNormalize<PaperListData>(
      apiClient.get(`/public/papers${buildSearchParams(filters)}`)
    );
  },

  /**
   * 获取公共论文详情
   */
  getPublicPaperDetail(paperId: string): Promise<UnifiedResult<Paper>> {
    return callAndNormalize<Paper>(
      apiClient.get(`/public/papers/${paperId}`)
    );
  },

  /**
   * 获取公共论文阅读内容
   */
  getPublicPaperContent(paperId: string): Promise<UnifiedResult<PaperContent>> {
    return callAndNormalize<PaperContent>(
      apiClient.get(`/public/papers/${paperId}/content`)
    );
  },
};

// —— 个人论文库服务 —— //
export const userPaperService = {
  /**
   * 获取个人论文库列表
   */
  getUserPapers(
    filters: UserPaperFilters = {}
  ): Promise<UnifiedResult<UserPaperListData>> {
    return callAndNormalize<UserPaperListData>(
      apiClient.get(`/user/papers${buildSearchParams(filters)}`)
    );
  },

  /**
   * 添加公共论文到个人库
   */
  addToLibrary(request: AddToLibraryRequest): Promise<UnifiedResult<UserPaper>> {
    return callAndNormalize<UserPaper>(
      apiClient.post('/user/papers', request)
    );
  },

  /**
   * 获取个人论文详情
   */
  getUserPaperDetail(userPaperId: string): Promise<UnifiedResult<UserPaper>> {
    return callAndNormalize<UserPaper>(
      apiClient.get(`/user/papers/${userPaperId}`)
    );
  },

  /**
   * 更新个人论文
   */
  updateUserPaper(
    userPaperId: string,
    data: UpdateUserPaperRequest
  ): Promise<UnifiedResult<UserPaper>> {
    return callAndNormalize<UserPaper>(
      apiClient.put(`/user/papers/${userPaperId}`, data)
    );
  },

  /**
   * 更新阅读进度（快速接口）
   */
  updateReadingProgress(
    userPaperId: string,
    progress: UpdateReadingProgressRequest
  ): Promise<UnifiedResult<UserPaper>> {
    return callAndNormalize<UserPaper>(
      apiClient.patch(`/user/papers/${userPaperId}/progress`, progress)
    );
  },

  /**
   * 从个人库删除论文
   */
  deleteUserPaper(userPaperId: string): Promise<UnifiedResult<DeleteResult>> {
    return callAndNormalize<DeleteResult>(
      apiClient.delete(`/user/papers/${userPaperId}`)
    );
  },

  /**
   * 获取用户统计信息
   */
  getUserStatistics(): Promise<UnifiedResult<UserStatistics>> {
    return callAndNormalize<UserStatistics>(
      apiClient.get('/user/papers/statistics')
    );
  },

  /**
   * 从文本创建个人论文
   */
  createPaperFromText(request: CreatePaperFromTextRequest): Promise<UnifiedResult<UserPaper>> {
    return callAndNormalize<UserPaper>(
      apiClient.post('/user/papers/create-from-text', request)
    );
  },

  /**
   * 从元数据创建个人论文
   */
  createPaperFromMetadata(request: CreatePaperFromMetadataRequest): Promise<UnifiedResult<UserPaper>> {
    return callAndNormalize<UserPaper>(
      apiClient.post('/user/papers/create-from-metadata', request)
    );
  },

  /**
   * 向个人论文的指定section直接添加block（不通过LLM解析）
   */
  addBlockToSection(
    userPaperId: string,
    sectionId: string,
    request: AddBlockToSectionRequest
  ): Promise<UnifiedResult<AddBlockToSectionResult>> {
    return callAndNormalize<AddBlockToSectionResult>(
      apiClient.post(`/user/papers/${userPaperId}/sections/${sectionId}/add-block`, request)
    );
  },

  /**
   * 向个人论文的指定section从文本解析添加block
   */
  addBlockFromTextToSection(
    userPaperId: string,
    sectionId: string,
    request: AddBlockFromTextToSectionRequest
  ): Promise<UnifiedResult<AddBlockFromTextToSectionResult>> {
    return callAndNormalize<AddBlockFromTextToSectionResult>(
      apiClient.post(`/user/papers/${userPaperId}/sections/${sectionId}/add-block-from-text`, request)
    );
  },

  /**
<<<<<<< HEAD
   * 向个人论文的指定section从文本解析添加block（流式传输）
   */
  addBlockFromTextToSectionStream(
    userPaperId: string,
    sectionId: string,
    request: AddBlockFromTextToSectionRequest
  ): EventSource {
    const url = `/user/papers/${userPaperId}/sections/${sectionId}/add-block-from-text-stream`;
    
    // 对于长文本，使用POST方法
    if (request.text && request.text.length > 1000) {
      console.log('userPaperService.addBlockFromTextToSectionStream using POST method (long text)');
      return createAuthenticatedEventSourceWithPost(url, request);
    } else {
      // 对于短文本，仍然使用GET方法
      const params = new URLSearchParams();
      if (request.text) {
        // 确保文本正确编码，特别是特殊符号
        const encodedText = encodeURIComponent(request.text);
        params.append('text', encodedText);
        console.log('Text length for GET request:', request.text.length);
        console.log('Text preview (first 100 chars):', request.text.substring(0, 100));
        console.log('Encoded text preview (first 100 chars):', encodedText.substring(0, 100));
      }
      if (request.afterBlockId) params.append('afterBlockId', request.afterBlockId);
      if (request.sessionId) params.append('sessionId', request.sessionId);
      
      console.log('userPaperService.addBlockFromTextToSectionStream using GET method (short text)');
      console.log('Final URL params:', params.toString());
      return createAuthenticatedEventSource(url, params);
    }
  },

  /**
=======
>>>>>>> origin/main
   * 向个人论文添加新章节（已移除subsection支持）
   */
  addSection(
    userPaperId: string,
    sectionData: {
<<<<<<< HEAD
=======
      id?: string; // 添加可选的ID字段，用于前端生成的临时ID
>>>>>>> origin/main
      title: { en: string; zh: string };
      content?: any[];
    },
    options?: {
      position?: number;
    }
  ): Promise<UnifiedResult<import('@/types/paper/requests').AddSectionResult>> {
    return callAndNormalize<import('@/types/paper/requests').AddSectionResult>(
      apiClient.post(`/user/papers/${userPaperId}/add-section`, {
        sectionData,
        position: options?.position ?? -1
      })
    );
  },

  /**
   * 更新个人论文的指定section
   */
  updateSection(
    userPaperId: string,
    sectionId: string,
    updateData: UpdateSectionRequest
  ): Promise<UnifiedResult<UpdateSectionResult>> {
    return callAndNormalize<UpdateSectionResult>(
      apiClient.put(`/user/papers/${userPaperId}/sections/${sectionId}`, updateData)
    );
  },

  /**
   * 删除个人论文的指定section
   */
  deleteSection(
    userPaperId: string,
    sectionId: string
  ): Promise<UnifiedResult<DeleteSectionResult>> {
    return callAndNormalize<DeleteSectionResult>(
      apiClient.delete(`/user/papers/${userPaperId}/sections/${sectionId}`)
    );
  },

  /**
   * 更新个人论文的指定section中的指定block
   */
  updateBlock(
    userPaperId: string,
    sectionId: string,
    blockId: string,
    updateData: UpdateBlockRequest
  ): Promise<UnifiedResult<UpdateBlockResult>> {
    return callAndNormalize<UpdateBlockResult>(
      apiClient.put(`/user/papers/${userPaperId}/sections/${sectionId}/blocks/${blockId}`, updateData)
    );
  },

  /**
   * 删除个人论文的指定section中的指定block
   */
  deleteBlock(
    userPaperId: string,
    sectionId: string,
    blockId: string
  ): Promise<UnifiedResult<DeleteBlockResult>> {
    return callAndNormalize<DeleteBlockResult>(
      apiClient.delete(`/user/papers/${userPaperId}/sections/${sectionId}/blocks/${blockId}`)
    );
  },

  /**
   * 解析参考文献并添加到用户论文（一步完成）
   */
  parseReferencesForUserPaper(
    userPaperId: string,
    request: ParseReferencesRequest
  ): Promise<UnifiedResult<AddReferencesToPaperResult>> {
    return callAndNormalize<AddReferencesToPaperResult>(
      apiClient.post(`/user/papers/${userPaperId}/parse-references`, request)
    );
  },

  /**
   * 检查指定加载块的解析状态
   */
  checkBlockParsingStatus(
    userPaperId: string,
    sectionId: string,
    blockId: string
<<<<<<< HEAD
  ): Promise<UnifiedResult<{
    status: 'pending' | 'processing' | 'completed' | 'failed';
    progress: number;
    message: string;
    paper?: Paper;
    error?: string;
    addedBlocks?: import('@/types/paper/content').BlockContent[];
  }>> {
    return callAndNormalize<{
      status: 'pending' | 'processing' | 'completed' | 'failed';
      progress: number;
      message: string;
      paper?: Paper;
      error?: string;
      addedBlocks?: import('@/types/paper/content').BlockContent[];
    }>(
=======
  ): Promise<UnifiedResult<CheckBlockParsingStatusResult>> {
    return callAndNormalize<CheckBlockParsingStatusResult>(
>>>>>>> origin/main
      apiClient.get(`/user/papers/${userPaperId}/sections/${sectionId}/blocks/${blockId}/parsing-status`)
    );
  },

  /**
<<<<<<< HEAD
   * 获取指定section的所有解析会话
   */
  getParsingSessions(
    userPaperId: string,
    sectionId: string
  ): Promise<UnifiedResult<{
    sessions: Array<{
      sessionId: string;
      status: 'pending' | 'processing' | 'completed' | 'failed';
      progress: number;
      message: string;
      createdAt: string;
      updatedAt: string;
    }>;
  }>> {
    return callAndNormalize<{
      sessions: Array<{
        sessionId: string;
        status: 'pending' | 'processing' | 'completed' | 'failed';
        progress: number;
        message: string;
        createdAt: string;
        updatedAt: string;
      }>;
    }>(
      apiClient.get(`/user/papers/${userPaperId}/sections/${sectionId}/parsing-sessions`)
=======
   * 检查论文是否已在个人论文库中
   */
  checkPaperInLibrary(
    paperId: string
  ): Promise<UnifiedResult<{ inLibrary: boolean; userPaperId: string | null }>> {
    return callAndNormalize<{ inLibrary: boolean; userPaperId: string | null }>(
      apiClient.get(`/user/papers/check-in-library?paperId=${paperId}`)
>>>>>>> origin/main
    );
  },

  /**
<<<<<<< HEAD
   * 获取指定的解析会话详情
   */
  getParsingSession(
    userPaperId: string,
    sectionId: string,
    sessionId: string
  ): Promise<UnifiedResult<{
    sessionId: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    progress: number;
    message: string;
    createdAt: string;
    updatedAt: string;
    completedBlocks?: any[];
    paperData?: any;
  }>> {
    return callAndNormalize<{
      sessionId: string;
      status: 'pending' | 'processing' | 'completed' | 'failed';
      progress: number;
      message: string;
      createdAt: string;
      updatedAt: string;
      completedBlocks?: any[];
      paperData?: any;
    }>(
      apiClient.get(`/user/papers/${userPaperId}/sections/${sectionId}/parsing-sessions/${sessionId}`)
=======
   * 获取解析结果
   */
  getParseResult(
    paperId: string,
    parseId: string
  ): Promise<UnifiedResult<ParseResult>> {
    return callAndNormalize<ParseResult>(
      apiClient.get(`/user/papers/${paperId}/parse-results/${parseId}`)
>>>>>>> origin/main
    );
  },

  /**
<<<<<<< HEAD
   * 删除指定的解析会话
   */
  deleteParsingSession(
    userPaperId: string,
    sectionId: string,
    sessionId: string
  ): Promise<UnifiedResult<null>> {
    return callAndNormalize<null>(
      apiClient.delete(`/user/papers/${userPaperId}/sections/${sectionId}/parsing-sessions/${sessionId}`)
=======
   * 确认解析结果
   */
  confirmParseResult(
    paperId: string,
    parseId: string,
    request: ConfirmParseResultRequest
  ): Promise<UnifiedResult<ConfirmParseResultResult>> {
    return callAndNormalize<ConfirmParseResultResult>(
      apiClient.post(`/user/papers/${paperId}/parse-results/${parseId}/confirm`, request)
    );
  },

  /**
   * 丢弃解析结果
   */
  discardParseResult(
    paperId: string,
    parseId: string
  ): Promise<UnifiedResult<DiscardParseResultResult>> {
    return callAndNormalize<DiscardParseResultResult>(
      apiClient.post(`/user/papers/${paperId}/parse-results/${parseId}/discard`, {})
    );
  },

  /**
   * 保存所有解析结果
   */
  saveAllParseResult(
    paperId: string,
    parseId: string
  ): Promise<UnifiedResult<SaveAllParseResultResult>> {
    return callAndNormalize<SaveAllParseResultResult>(
      apiClient.post(`/user/papers/${paperId}/parse-results/${parseId}/save-all`, {})
>>>>>>> origin/main
    );
  },

};

// —— 笔记服务 —— //
export const noteService = {
  /**
   * 创建笔记
   */
  createNote(request: CreateNoteRequest): Promise<UnifiedResult<Note>> {
    return callAndNormalize<Note>(
      apiClient.post('/notes', request)
    );
  },

  /**
   * 获取论文的所有笔记
   */
  getNotesByPaper(
    userPaperId: string,
    filters: NoteFilters = {}
  ): Promise<UnifiedResult<NoteListData>> {
    return callAndNormalize<NoteListData>(
      apiClient.get(`/notes/paper/${userPaperId}${buildSearchParams(filters)}`)
    );
  },

  /**
   * 获取某个 Block 的笔记
   */
  getNotesByBlock(
    userPaperId: string,
    blockId: string
  ): Promise<UnifiedResult<{ notes: Note[] }>> {
    return callAndNormalize<{ notes: Note[] }>(
      apiClient.get(`/notes/paper/${userPaperId}/block/${blockId}`)
    );
  },

  /**
   * 获取用户所有笔记
   */
  getUserNotes(filters: NoteFilters = {}): Promise<UnifiedResult<NoteListData>> {
    return callAndNormalize<NoteListData>(
      apiClient.get(`/notes/user${buildSearchParams(filters)}`)
    );
  },

  /**
   * 搜索笔记
   */
  searchNotes(
    keyword: string,
    filters: Omit<NoteFilters, 'keyword'> = {}
  ): Promise<UnifiedResult<NoteListData>> {
    return callAndNormalize<NoteListData>(
      apiClient.get(`/notes/search${buildSearchParams({ keyword, ...filters })}`)
    );
  },

  /**
   * 更新笔记
   */
  updateNote(
    noteId: string,
    data: UpdateNoteRequest
  ): Promise<UnifiedResult<Note>> {
    return callAndNormalize<Note>(
      apiClient.put(`/notes/${noteId}`, data)
    );
  },

  /**
   * 删除笔记
   */
  deleteNote(noteId: string): Promise<UnifiedResult<null>> {
    return callAndNormalize<null>(
      apiClient.delete(`/notes/${noteId}`)
    );
  },

  /**
   * 批量删除论文的所有笔记
   */
  deleteNotesByPaper(userPaperId: string): Promise<UnifiedResult<DeleteResult>> {
    return callAndNormalize<DeleteResult>(
      apiClient.delete(`/notes/paper/${userPaperId}`)
    );
  },
};

// —— 管理员服务 —— //
export const adminPaperService = {
  /**
   * 获取管理员论文列表
   */
  getAdminPapers(
    filters: PublicPaperFilters & {
      isPublic?: boolean;
      createdBy?: string;
    } = {}
  ): Promise<UnifiedResult<PaperListData>> {
    return callAndNormalize<PaperListData>(
      apiClient.get(`/admin/papers${buildSearchParams(filters)}`)
    );
  },

  /**
   * 创建论文
   */
  createPaper(data: Partial<Paper>): Promise<UnifiedResult<Paper>> {
    return callAndNormalize<Paper>(
      apiClient.post('/admin/papers', data)
    );
  },

  /**
   * 更新论文
   */
  updatePaper(
    paperId: string, 
    data: Partial<Paper>
  ): Promise<UnifiedResult<Paper>> {
    return callAndNormalize<Paper>(
      apiClient.put(`/admin/papers/${paperId}`, data)
    );
  },

  /**
   * 删除论文
   */
  deletePaper(paperId: string): Promise<UnifiedResult<null>> {
    return callAndNormalize<null>(
      apiClient.delete(`/admin/papers/${paperId}`)
    );
  },

  /**
    * 获取统计信息
    */
  getStatistics(): Promise<UnifiedResult<{
    total: number;
    public: number;
    private: number;
  }>> {
    return callAndNormalize<{
      total: number;
      public: number;
      private: number;
    }>(
      apiClient.get('/admin/papers/statistics')
    );
  },

  /**
    * 从文本创建管理员论文
    */
  createPaperFromText(request: CreatePaperFromTextRequest): Promise<UnifiedResult<Paper>> {
    return callAndNormalize<Paper>(
      apiClient.post('/admin/papers/create-from-text', request)
    );
  },

  async getAdminPaperDetail(paperId: string): Promise<UnifiedResult<Paper>> {
    return callAndNormalize<Paper>(
      apiClient.get(`/admin/papers/${paperId}`)
    );
  },

  /**
   * 向管理员论文的指定section直接添加block（不通过LLM解析）
   */
  addBlockToSection(
    paperId: string,
    sectionId: string,
    request: AddBlockToSectionRequest
  ): Promise<UnifiedResult<AddBlockToSectionResult>> {
    return callAndNormalize<AddBlockToSectionResult>(
      apiClient.post(`/admin/papers/${paperId}/sections/${sectionId}/add-block`, request)
    );
  },

  /**
   * 向管理员论文的指定section从文本解析添加block
   */
  addBlockFromTextToSection(
    paperId: string,
    sectionId: string,
    request: AddBlockFromTextToSectionRequest
  ): Promise<UnifiedResult<AddBlockFromTextToSectionResult>> {
    return callAndNormalize<AddBlockFromTextToSectionResult>(
      apiClient.post(`/admin/papers/${paperId}/sections/${sectionId}/add-block-from-text`, request)
    );
  },

  /**
<<<<<<< HEAD
   * 向管理员论文的指定section从文本解析添加block（流式传输）
   */
  addBlockFromTextToSectionStream(
    paperId: string,
    sectionId: string,
    request: AddBlockFromTextToSectionRequest
  ): EventSource {
    const url = `/admin/papers/${paperId}/sections/${sectionId}/add-block-from-text-stream`;
    
    // 对于长文本，使用POST方法
    if (request.text && request.text.length > 1000) {
      console.log('adminPaperService.addBlockFromTextToSectionStream using POST method (long text)');
      return createAuthenticatedEventSourceWithPost(url, request);
    } else {
      // 对于短文本，仍然使用GET方法
      const params = new URLSearchParams();
      if (request.text) {
        // 确保文本正确编码，特别是特殊符号
        const encodedText = encodeURIComponent(request.text);
        params.append('text', encodedText);
        console.log('Text length for GET request:', request.text.length);
        console.log('Text preview (first 100 chars):', request.text.substring(0, 100));
        console.log('Encoded text preview (first 100 chars):', encodedText.substring(0, 100));
      }
      if (request.afterBlockId) params.append('afterBlockId', request.afterBlockId);
      if (request.sessionId) params.append('sessionId', request.sessionId);
      
      console.log('adminPaperService.addBlockFromTextToSectionStream using GET method (short text)');
      console.log('Final URL params:', params.toString());
      return createAuthenticatedEventSource(url, params);
    }
  },

  /**
=======
>>>>>>> origin/main
   * 向管理员论文添加新章节（已移除subsection支持）
   */
  addSection(
    paperId: string,
    sectionData: {
<<<<<<< HEAD
=======
      id?: string; // 添加可选的ID字段，用于前端生成的临时ID
>>>>>>> origin/main
      title: { en: string; zh: string };
      content?: any[];
    },
    options?: {
      position?: number;
    }
  ): Promise<UnifiedResult<import('@/types/paper/requests').AddSectionResult>> {
    return callAndNormalize<import('@/types/paper/requests').AddSectionResult>(
      apiClient.post(`/admin/papers/${paperId}/add-section`, {
        sectionData,
        position: options?.position ?? -1
      })
    );
  },

  /**
   * 更新管理员论文的指定section
   */
  updateSection(
    paperId: string,
    sectionId: string,
    updateData: UpdateSectionRequest
  ): Promise<UnifiedResult<UpdateSectionResult>> {
    return callAndNormalize<UpdateSectionResult>(
      apiClient.put(`/admin/papers/${paperId}/sections/${sectionId}`, updateData)
    );
  },

  /**
   * 删除管理员论文的指定section
   */
  deleteSection(
    paperId: string,
    sectionId: string
  ): Promise<UnifiedResult<DeleteSectionResult>> {
    return callAndNormalize<DeleteSectionResult>(
      apiClient.delete(`/admin/papers/${paperId}/sections/${sectionId}`)
    );
  },

  /**
   * 更新管理员论文的指定section中的指定block
   */
  updateBlock(
    paperId: string,
    sectionId: string,
    blockId: string,
    updateData: UpdateBlockRequest
  ): Promise<UnifiedResult<UpdateBlockResult>> {
    return callAndNormalize<UpdateBlockResult>(
      apiClient.put(`/admin/papers/${paperId}/sections/${sectionId}/blocks/${blockId}`, updateData)
    );
  },

  /**
   * 删除管理员论文的指定section中的指定block
   */
  deleteBlock(
    paperId: string,
    sectionId: string,
    blockId: string
  ): Promise<UnifiedResult<DeleteBlockResult>> {
    return callAndNormalize<DeleteBlockResult>(
      apiClient.delete(`/admin/papers/${paperId}/sections/${sectionId}/blocks/${blockId}`)
    );
  },

  /**
   * 修改论文可见状态
   */
  updatePaperVisibility(
    paperId: string,
    request: UpdatePaperVisibilityRequest
  ): Promise<UnifiedResult<UpdatePaperVisibilityResult>> {
    return callAndNormalize<UpdatePaperVisibilityResult>(
      apiClient.put(`/admin/papers/${paperId}/visibility`, request)
    );
  },

  /**
   * 解析参考文献
   */
  parseReferences(
    request: ParseReferencesRequest
  ): Promise<UnifiedResult<ParseReferencesResult>> {
    return callAndNormalize<ParseReferencesResult>(
      apiClient.post('/admin/papers/parse-references', request)
    );
  },

  /**
   * 解析参考文献并添加到论文（一步完成）
   */
  parseReferencesForPaper(
    paperId: string,
    request: ParseReferencesRequest
  ): Promise<UnifiedResult<AddReferencesToPaperResult>> {
    return callAndNormalize<AddReferencesToPaperResult>(
      apiClient.post(`/admin/papers/${paperId}/parse-references`, request)
    );
  },

  /**
   * 添加参考文献到论文
   */
  addReferencesToPaper(
    paperId: string,
    request: AddReferencesToPaperRequest
  ): Promise<UnifiedResult<AddReferencesToPaperResult>> {
    return callAndNormalize<AddReferencesToPaperResult>(
      apiClient.post(`/admin/papers/${paperId}/add-references`, request)
    );
  },

  /**
   * 检查指定加载块的解析状态
   */
  checkBlockParsingStatus(
    paperId: string,
    sectionId: string,
    blockId: string
<<<<<<< HEAD
  ): Promise<UnifiedResult<{
    status: 'pending' | 'processing' | 'completed' | 'failed';
    progress: number;
    message: string;
    paper?: Paper;
    error?: string;
    addedBlocks?: import('@/types/paper/content').BlockContent[];
  }>> {
    return callAndNormalize<{
      status: 'pending' | 'processing' | 'completed' | 'failed';
      progress: number;
      message: string;
      paper?: Paper;
      error?: string;
      addedBlocks?: import('@/types/paper/content').BlockContent[];
    }>(
=======
  ): Promise<UnifiedResult<CheckBlockParsingStatusResult>> {
    return callAndNormalize<CheckBlockParsingStatusResult>(
>>>>>>> origin/main
      apiClient.get(`/admin/papers/${paperId}/sections/${sectionId}/blocks/${blockId}/parsing-status`)
    );
  },

  /**
<<<<<<< HEAD
   * 获取指定section的所有解析会话
   */
  getParsingSessions(
    paperId: string,
    sectionId: string
  ): Promise<UnifiedResult<{
    sessions: Array<{
      sessionId: string;
      status: 'pending' | 'processing' | 'completed' | 'failed';
      progress: number;
      message: string;
      createdAt: string;
      updatedAt: string;
    }>;
  }>> {
    return callAndNormalize<{
      sessions: Array<{
        sessionId: string;
        status: 'pending' | 'processing' | 'completed' | 'failed';
        progress: number;
        message: string;
        createdAt: string;
        updatedAt: string;
      }>;
    }>(
      apiClient.get(`/admin/papers/${paperId}/sections/${sectionId}/parsing-sessions`)
=======
   * 获取管理员论文解析结果
   */
  getParseResult(
    paperId: string,
    parseId: string
  ): Promise<UnifiedResult<ParseResult>> {
    return callAndNormalize<ParseResult>(
      apiClient.get(`/admin/papers/${paperId}/parse-results/${parseId}`)
>>>>>>> origin/main
    );
  },

  /**
<<<<<<< HEAD
   * 获取指定的解析会话详情
   */
  getParsingSession(
    paperId: string,
    sectionId: string,
    sessionId: string
  ): Promise<UnifiedResult<{
    sessionId: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    progress: number;
    message: string;
    createdAt: string;
    updatedAt: string;
    completedBlocks?: any[];
    paperData?: any;
  }>> {
    return callAndNormalize<{
      sessionId: string;
      status: 'pending' | 'processing' | 'completed' | 'failed';
      progress: number;
      message: string;
      createdAt: string;
      updatedAt: string;
      completedBlocks?: any[];
      paperData?: any;
    }>(
      apiClient.get(`/admin/papers/${paperId}/sections/${sectionId}/parsing-sessions/${sessionId}`)
=======
   * 确认管理员论文解析结果
   */
  confirmParseResult(
    paperId: string,
    parseId: string,
    request: ConfirmParseResultRequest
  ): Promise<UnifiedResult<ConfirmParseResultResult>> {
    return callAndNormalize<ConfirmParseResultResult>(
      apiClient.post(`/admin/papers/${paperId}/parse-results/${parseId}/confirm`, request)
>>>>>>> origin/main
    );
  },

  /**
<<<<<<< HEAD
   * 删除指定的解析会话
   */
  deleteParsingSession(
    paperId: string,
    sectionId: string,
    sessionId: string
  ): Promise<UnifiedResult<null>> {
    return callAndNormalize<null>(
      apiClient.delete(`/admin/papers/${paperId}/sections/${sectionId}/parsing-sessions/${sessionId}`)
=======
   * 丢弃管理员论文解析结果
   */
  discardParseResult(
    paperId: string,
    parseId: string
  ): Promise<UnifiedResult<DiscardParseResultResult>> {
    return callAndNormalize<DiscardParseResultResult>(
      apiClient.post(`/admin/papers/${paperId}/parse-results/${parseId}/discard`, {})
    );
  },

  /**
   * 保存所有管理员论文解析结果
   */
  saveAllParseResult(
    paperId: string,
    parseId: string
  ): Promise<UnifiedResult<SaveAllParseResultResult>> {
    return callAndNormalize<SaveAllParseResultResult>(
      apiClient.post(`/admin/papers/${paperId}/parse-results/${parseId}/save-all`, {})
>>>>>>> origin/main
    );
  },

};

// —— 统一导出（兼容旧代码） —— //
export const paperService = {
  // 公共论文
  ...publicPaperService,
  
  // 个人论文
  ...userPaperService,
  
  // 笔记
  ...noteService,
  
  // 管理员
  ...adminPaperService,
};

// —— 内存缓存 —— //
export class PaperCache {
  private cache = new Map<string, { data: Paper | UserPaper; ts: number }>();
  private readonly TTL = 5 * 60 * 1000; // 5分钟

  set(id: string, data: Paper | UserPaper): void {
    this.cache.set(id, { data, ts: Date.now() });
  }

  get(id: string): Paper | UserPaper | null {
    const node = this.cache.get(id);
    if (!node) return null;
    if (Date.now() - node.ts > this.TTL) {
      this.cache.delete(id);
      return null;
    }
    return node.data;
  }

  invalidate(id: string): void {
    this.cache.delete(id);
  }

  clear(): void {
    this.cache.clear();
  }
}

export const paperCache = new PaperCache();

// —— Hook 风格导出 —— //
export function usePaperService() {
  return {
    publicPaperService,
    userPaperService,
    noteService,
    adminPaperService,
    paperCache,
  };
<<<<<<< HEAD
}
=======
}
>>>>>>> origin/main
