#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
一站式测试脚本（无命令行参数）：
- 用户路由：
  1) POST /users/login 登录并自动解析 token（兼容多种返回结构）
  2) GET  /users/current 获取当前用户
  3) PUT  /users/password 修改密码（可选，支持改回）
  4) POST /users/ 创建用户（仅管理员，可选）
  5) DELETE /users/<user_id> 删除用户（仅管理员，可选）

- 论文路由：
  6) GET  /api/papers 列表
  7) GET  /api/papers/<paper_id> 详情（可选）
  8) GET  /api/papers/search 搜索（可选）

说明：
- 所有可配项都在顶部常量区；无需命令行参数。
- 若你的用户路由前缀是 /api/users，把 USERS_PREFIX 改成 "/api/users" 即可。
"""

import json
import time
import requests
from typing import Dict, Any, Optional


# ===================== 可配置区域（直接修改下方常量） =====================

BASE_URL: str = "http://localhost:5000"   # 服务地址（末尾不带 /）

USERS_PREFIX: str = "/api/v1/users"

PAPERS_PREFIX: str = "/api/v1/papers"

VERIFY_SSL: bool = True        # 自签名测试环境可改为 False
TIMEOUT: int = 15              # 请求超时秒数

# —— 普通用户（用于登录、current、改密、访问论文等）——
LOGIN_USERNAME: str = "test"
LOGIN_PASSWORD: str = "test123"
# 改密测试的新密码（RUN_CHANGE_PASSWORD=True 时会先改为该值，再改回）
NEW_PASSWORD_FOR_TEST: str = "test1234"

# —— 管理员账号（仅当需要跑创建/删除用户时才使用）——
ADMIN_USERNAME: str = "admin"
ADMIN_PASSWORD: str = "admin123"

# —— 论文接口测试参数 ——
IS_PUBLIC: Optional[bool] = None  # True / False / None(不传)
PAGE: int = 1
PAGE_SIZE: int = 20
SORT_BY: str = "createdAt"
SORT_ORDER: str = "desc"

RUN_PAPER_DETAIL: bool = True      # 是否用列表第一条去调详情
RUN_PAPER_SEARCH: bool = False     # 是否跑搜索接口
SEARCH_KEYWORD: Optional[str] = "transformer"

# —— 用户接口测试开关 ——
RUN_CHANGE_PASSWORD: bool = False  # 改密 + 改回
RUN_ADMIN_CREATE_AND_DELETE: bool = False  # 管理员创建后再删除一个测试用户

# 要创建的测试用户（仅管理员流）
CREATE_USERNAME: str = "apitest_user"
CREATE_PASSWORD: str = "apitest_pass"
CREATE_NICKNAME: str = "API Tester"

# ===================== 可配置区域结束 =====================


def _url_join(prefix: str, path: str = "") -> str:
    base = BASE_URL.rstrip("/")
    pfx = prefix.rstrip("/")
    if not path:
        return f"{base}{pfx}"
    if not path.startswith("/"):
        path = "/" + path
    return f"{base}{pfx}{path}"


def _auth_headers(token: Optional[str] = None) -> Dict[str, str]:
    h = {
        "Accept": "application/json",
        "Content-Type": "application/json",
    }
    if token:
        # 兼容已带 Bearer 的情况
        if token.lower().startswith("bearer "):
            h["Authorization"] = token
        else:
            h["Authorization"] = f"Bearer {token}"
    return h


def _pretty(title: str, resp: requests.Response) -> None:
    print(f"\n=== {title} ===")
    print(f"HTTP {resp.status_code} {resp.reason}")
    try:
        data = resp.json()
        print("-" * 60)
        print(json.dumps(data, ensure_ascii=False, indent=2))
    except ValueError:
        print("-" * 60)
        print(resp.text)


def _extract_token_from_login(resp_json: Dict[str, Any]) -> Optional[str]:
    """
    因为 /users/login 设计为：HTTP 200 + data 内含业务状态，
    这里尽可能兼容不同返回结构，自动抽取 token：
    - 顶层 data.token
    - 顶层 data.data.token
    - 顶层 data.access_token / jwt / Authorization
    """
    if not isinstance(resp_json, dict):
        return None

    # 常见结构：{"code": 0, "message": "...", "data": { "code": X, "message": "...", "data": { "token": "..." } }}
    possible = []
    data = resp_json.get("data")

    # 1) data 可能就是 token 容器
    if isinstance(data, dict):
        # 1.1 直接 token
        for k in ("token", "access_token", "jwt", "Authorization", "authorization"):
            if isinstance(data.get(k), str):
                possible.append(data.get(k))
        # 1.2 data.data.token
        inner = data.get("data")
        if isinstance(inner, dict):
            for k in ("token", "access_token", "jwt", "Authorization", "authorization"):
                if isinstance(inner.get(k), str):
                    possible.append(inner.get(k))

    # 2) 顶层就带
    for k in ("token", "access_token", "jwt", "Authorization", "authorization"):
        if isinstance(resp_json.get(k), str):
            possible.append(resp_json.get(k))

    # 统一返回第一个命中的
    tok = next((t for t in possible if isinstance(t, str) and t.strip()), None)
    if tok:
        return tok.strip()
    return None


# ===================== 用户路由调用 =====================

def api_login(username: str, password: str) -> requests.Response:
    url = _url_join(USERS_PREFIX, "login")
    payload = {"username": username, "password": password}
    return requests.post(url, headers=_auth_headers(), data=json.dumps(payload),
                         timeout=TIMEOUT, verify=VERIFY_SSL)


def api_current(token: str) -> requests.Response:
    url = _url_join(USERS_PREFIX, "current")
    return requests.get(url, headers=_auth_headers(token), timeout=TIMEOUT, verify=VERIFY_SSL)


def api_change_password(token: str, old_pwd: str, new_pwd: str) -> requests.Response:
    url = _url_join(USERS_PREFIX, "password")
    payload = {"oldPassword": old_pwd, "newPassword": new_pwd}
    return requests.put(url, headers=_auth_headers(token), data=json.dumps(payload),
                        timeout=TIMEOUT, verify=VERIFY_SSL)


def api_admin_create_user(admin_token: str, username: str, password: str, nickname: str) -> requests.Response:
    # 注意：你的路由是 @bp.route("/", methods=["POST"])
    url = _url_join(USERS_PREFIX, "/")
    payload = {"username": username, "password": password, "nickname": nickname}
    return requests.post(url, headers=_auth_headers(admin_token), data=json.dumps(payload),
                         timeout=TIMEOUT, verify=VERIFY_SSL)


def api_admin_delete_user(admin_token: str, user_id: str) -> requests.Response:
    url = _url_join(USERS_PREFIX, user_id)
    return requests.delete(url, headers=_auth_headers(admin_token), timeout=TIMEOUT, verify=VERIFY_SSL)


# ===================== 论文路由调用 =====================

def api_papers_list(token: str) -> requests.Response:
    url = _url_join(PAPERS_PREFIX)
    params: Dict[str, Any] = {
        "page": PAGE,
        "pageSize": PAGE_SIZE,
        "sortBy": SORT_BY,
        "sortOrder": SORT_ORDER,
    }
    if IS_PUBLIC is not None:
        params["isPublic"] = "true" if IS_PUBLIC else "false"
    return requests.get(url, headers=_auth_headers(token), params=params,
                        timeout=TIMEOUT, verify=VERIFY_SSL)


def api_paper_detail(token: str, paper_id: str) -> requests.Response:
    url = _url_join(PAPERS_PREFIX, paper_id)
    return requests.get(url, headers=_auth_headers(token),
                        timeout=TIMEOUT, verify=VERIFY_SSL)


def api_paper_search(token: str, keyword: str) -> requests.Response:
    url = _url_join(PAPERS_PREFIX, "search")
    params: Dict[str, Any] = {
        "keyword": keyword,
        "page": PAGE,
        "pageSize": PAGE_SIZE,
    }
    if IS_PUBLIC is not None:
        params["isPublic"] = "true" if IS_PUBLIC else "false"
    return requests.get(url, headers=_auth_headers(token), params=params,
                        timeout=TIMEOUT, verify=VERIFY_SSL)


# ===================== 主流程 =====================

def main() -> None:
    # 1) 普通用户登录
    try:
        resp_login = api_login(LOGIN_USERNAME, LOGIN_PASSWORD)
        _pretty("POST /login 普通用户登录", resp_login)
        login_json = resp_login.json()
        user_token = _extract_token_from_login(login_json)
        if not user_token:
            print("[警告] 未能从登录响应中解析出 token，后续需要登录态的步骤将失败。")
            return
    except requests.RequestException as e:
        print(f"[网络错误] 登录失败: {e}")
        return
    except Exception as e:
        print(f"[异常] 登录解析失败: {e}")
        return

    # 2) 获取当前用户
    try:
        resp_current = api_current(user_token)
        _pretty("GET /current 当前用户信息", resp_current)
    except requests.RequestException as e:
        print(f"[网络错误] 获取当前用户失败: {e}")

    # 3)（可选）修改密码（然后改回）
    if RUN_CHANGE_PASSWORD:
        try:
            # 3.1 改为新密码
            resp_chg1 = api_change_password(user_token, LOGIN_PASSWORD, NEW_PASSWORD_FOR_TEST)
            _pretty("PUT /password 修改为新密码", resp_chg1)

            # 3.2 用新密码重新登录，获取新 token
            resp_login_new = api_login(LOGIN_USERNAME, NEW_PASSWORD_FOR_TEST)
            _pretty("POST /login 使用新密码重登", resp_login_new)
            new_token = _extract_token_from_login(resp_login_new.json())

            if new_token:
                # 3.3 改回原密码
                resp_chg2 = api_change_password(new_token, NEW_PASSWORD_FOR_TEST, LOGIN_PASSWORD)
                _pretty("PUT /password 改回原密码", resp_chg2)
            else:
                print("[提示] 使用新密码登录未获取到 token，跳过改回操作。")
        except requests.RequestException as e:
            print(f"[网络错误] 改密流程失败: {e}")

    # 4)（可选）管理员创建 + 删除测试用户
    if RUN_ADMIN_CREATE_AND_DELETE:
        try:
            # 管理员先登录拿 token（如果普通用户本身就是 admin，也可以直接复用 user_token）
            resp_admin_login = api_login(ADMIN_USERNAME, ADMIN_PASSWORD)
            _pretty("POST /login 管理员登录", resp_admin_login)
            admin_token = _extract_token_from_login(resp_admin_login.json())
            if not admin_token:
                print("[提示] 管理员登录未获取到 token，跳过创建/删除用户。")
            else:
                # 给测试用户名加时间戳避免冲突
                suffix = time.strftime("%Y%m%d%H%M%S")
                username = f"{CREATE_USERNAME}_{suffix}"
                resp_create = api_admin_create_user(admin_token, username, CREATE_PASSWORD, CREATE_NICKNAME)
                _pretty("POST /users/ 管理员创建用户", resp_create)

                # 从创建返回里尽量读出 user_id
                try:
                    created_json = resp_create.json()
                    created_data = created_json.get("data", {})
                    # 兼容 user 字段结构：可能是 data 或直接对象
                    user_obj = created_data.get("data") if isinstance(created_data.get("data"), dict) else created_data
                    user_id = None
                    if isinstance(user_obj, dict):
                        user_id = user_obj.get("id") or user_obj.get("_id") or user_obj.get("user_id")
                    if user_id:
                        resp_del = api_admin_delete_user(admin_token, str(user_id))
                        _pretty(f"DELETE /users/{user_id} 管理员删除用户", resp_del)
                    else:
                        print("[提示] 无法从创建响应中解析 user_id，跳过删除。")
                except Exception as e:
                    print(f"[异常] 解析创建用户响应失败: {e}")

        except requests.RequestException as e:
            print(f"[网络错误] 管理员流程失败: {e}")

    # 5) 论文列表
    try:
        resp_list = api_papers_list(user_token)
        _pretty("GET /api/papers 列表", resp_list)
    except requests.RequestException as e:
        print(f"[网络错误] 获取论文列表失败: {e}")
        return

    # 6) 论文详情（用第一条）
    if RUN_PAPER_DETAIL:
        try:
            data = resp_list.json()
            payload = data.get("data", {})
            items = None
            if isinstance(payload, dict):
                items = payload.get("items") or payload.get("records") or payload.get("list")
            if isinstance(items, list) and items:
                first = items[0]
                paper_id = first.get("id") or first.get("_id") or first.get("paperId")
                if paper_id:
                    resp_detail = api_paper_detail(user_token, str(paper_id))
                    _pretty(f"GET /api/papers/{paper_id} 详情", resp_detail)
                else:
                    print("[提示] 列表第一项未找到可识别的 paper_id（id/_id/paperId）。")
            else:
                print("[提示] 论文列表为空，跳过详情请求。")
        except Exception as e:
            print(f"[异常] 处理论文详情时出错: {e}")

    # 7) 论文搜索
    if RUN_PAPER_SEARCH and SEARCH_KEYWORD:
        try:
            resp_search = api_paper_search(user_token, SEARCH_KEYWORD)
            _pretty(f"GET /api/papers/search?keyword={SEARCH_KEYWORD}", resp_search)
        except requests.RequestException as e:
            print(f"[网络错误] 论文搜索失败: {e}")


if __name__ == "__main__":
    main()
