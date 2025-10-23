import { NextRequest, NextResponse } from 'next/server';

// 公开路径，不需要认证即可访问
const publicPaths = ['/login', '/api/v1/users/login'];

// 静态资源路径，不需要检查认证
const staticPaths = [
  '/_next',
  '/favicon.ico',
  '/api/health',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  console.log('[Middleware] ===== 开始处理请求 =====');
  console.log('[Middleware] 路径:', pathname);
  console.log('[Middleware] 所有 Cookies:', request.cookies.getAll());

  // 检查是否是静态资源路径
  if (staticPaths.some(path => pathname.startsWith(path))) {
    console.log('[Middleware] 静态资源路径，放行');
    return NextResponse.next();
  }

  // 检查是否是公开路径
  if (publicPaths.includes(pathname)) {
    if (pathname === '/login') {
      const token = request.cookies.get('auth_token');
      console.log('[Middleware] 登录页面，Token:', token?.value ? '存在' : '不存在');
      
      if (token?.value) {
        console.log('[Middleware] 用户已登录，重定向到首页');
        const url = request.nextUrl.clone();
        url.pathname = '/';
        return NextResponse.redirect(url);
      }
    }
    console.log('[Middleware] 公开路径，放行');
    return NextResponse.next();
  }

  // 对于受保护的路径，检查认证状态
  const token = request.cookies.get('auth_token');
  console.log('[Middleware] 受保护路径，Token:', token?.value ? `存在 (${token.value.substring(0, 20)}...)` : '不存在');
  
  if (!token?.value) {
    console.log('[Middleware] ❌ 无 Token，重定向到登录页');
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  console.log('[Middleware] ✅ Token 有效，允许访问');
  console.log('[Middleware] ===== 请求处理结束 =====\n');
  return NextResponse.next();
}

// 配置匹配的路径
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
