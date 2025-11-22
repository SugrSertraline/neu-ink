declare module '*.css' {
    const content: { [className: string]: string };
    export default content;
  }
  
  declare module '*.scss' {
    const content: { [className: string]: string };
    export default content;
  }
  
  declare module '*.sass' {
    const content: { [className: string]: string };
    export default content;
  }

  // PDF.js 模块声明
  declare module 'pdfjs-dist' {
    interface PDFDocumentProxy {
      numPages: number;
      getPage(pageNumber: number): Promise<any>;
      destroy(): void;
    }
    
    interface PDFPageProxy {
      getViewport(params: { scale: number }): any;
      render(params: { canvasContext: CanvasRenderingContext2D; viewport: any }): Promise<{ promise: Promise<void> }>;
    }
    
    interface PDFLoadingTask {
      promise: Promise<PDFDocumentProxy>;
    }
    
    interface GlobalWorkerOptions {
      workerSrc: string | null;
    }
    
    const GlobalWorkerOptions: GlobalWorkerOptions;
    
    function getDocument(url: string): PDFLoadingTask;
    
    export { GlobalWorkerOptions, getDocument };
  }
  
  declare module 'pdfjs-dist/build/pdf.worker.min.mjs' {
    const worker: any;
    export default worker;
  }
  
  declare module 'pdfjs-dist/webpack.mjs';
